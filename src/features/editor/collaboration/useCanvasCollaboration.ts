import {
  classRegistry,
  FabricImage,
  type Canvas,
  type FabricObject,
} from "fabric";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";
import {
  assertCanvasDocumentsAvailable,
  createCanvasDocument,
  listCanvasDocuments,
  listOriginalImagesFromStorage,
  openCanvasDocument,
  saveCanvasDocument,
  type CanvasDocument,
  type CanvasDocumentSaveResult,
  type CanvasDocumentState,
  type CanvasLibraryItem,
} from "./canvasDocumentService";
import { getCanvasAssetUrl, uploadCanvasAsset } from "./canvasStorageService";
import {
  joinDocumentRoom,
  leaveDocumentRoom,
  sendCanvasOperation,
  type CanvasOperation,
} from "./canvasRealtimeService";
import { getGuestClientId, getSocketClient } from "./socketClient";
import { isSupabaseConfigured } from "./supabaseClient";

type SaveStatus = "local" | "saved" | "saving" | "unsaved" | "error";
type ConnectionStatus = "offline" | "connecting" | "connected" | "disconnected";
type ObjectClock = { timestamp: string; clientId: string };
const WORKSPACE_CACHE_KEY = "estudio-canvas-workspace-v1";

function readWorkspaceCache(): CanvasLibraryItem[] {
  try {
    const stored = localStorage.getItem(WORKSPACE_CACHE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is CanvasLibraryItem =>
        Boolean(item) &&
        typeof item.id === "string" &&
        typeof item.name === "string" &&
        typeof item.storage_path === "string" &&
        typeof item.storage_bucket === "string" &&
        typeof item.imageUrl === "string",
    );
  } catch {
    return [];
  }
}

type UseCanvasCollaborationOptions = {
  canvasRef: MutableRefObject<Canvas | null>;
  fabricCanvas: Canvas | null;
  imageObjectRef: MutableRefObject<FabricObject | null>;
  imageSourceRef: MutableRefObject<string>;
  suppressHistoryRef: MutableRefObject<boolean>;
  historyVersion: number;
  userEditedBeforeDraftLoadRef: MutableRefObject<boolean>;
  setDimensions: (dimensions: { width: number; height: number }) => void;
  setImageThumbnail: (thumbnail: string) => void;
  setHasDocument: (hasDocument: boolean) => void;
  setHasImage: (hasImage: boolean) => void;
  setProjectName: (name: string) => void;
  syncObjects: () => void;
  initializeHistory: (canvas: Canvas) => void;
  setNotice: (notice: string) => void;
};

function objectId(object: FabricObject) {
  return object.get("collabId") as string | undefined;
}

function compareClock(left: ObjectClock, right: ObjectClock) {
  const timeDifference =
    Date.parse(left.timestamp) - Date.parse(right.timestamp);
  if (timeDifference !== 0) return timeDifference;
  return left.clientId.localeCompare(right.clientId);
}

function readSceneObjects(scene: Record<string, unknown>) {
  return Array.isArray(scene.objects)
    ? scene.objects.filter(
        (object): object is Record<string, unknown> =>
          Boolean(object) && typeof object === "object",
      )
    : [];
}

function serializedObject(object: FabricObject) {
  return JSON.stringify(
    object.toObject(["collabId", "collabUpdatedAt", "collabUpdatedBy"]),
  );
}

function serializedCanvasProperties(canvas: Canvas) {
  const scene = canvas.toObject([
    "collabId",
    "collabUpdatedAt",
    "collabUpdatedBy",
  ]) as Record<string, unknown>;
  return JSON.stringify({ ...scene, objects: [] });
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function isVersionConflict(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const details = error as { code?: unknown; message?: unknown };
  return (
    details.code === "40001" ||
    (typeof details.message === "string" &&
      /canvas_document_version_conflict|version changed/i.test(details.message))
  );
}

function mergeDocumentStates(
  current: CanvasDocumentState,
  incoming: CanvasDocumentState,
): CanvasDocumentState {
  const objects = new Map<string, Record<string, unknown>>();
  const clocks = new Map<string, ObjectClock>();
  const tombstones = new Map<string, ObjectClock>();

  for (const tombstone of [...current.tombstones, ...incoming.tombstones]) {
    const previous = tombstones.get(tombstone.objectId);
    const candidate = {
      timestamp: tombstone.timestamp,
      clientId: tombstone.clientId,
    };
    if (!previous || compareClock(candidate, previous) > 0)
      tombstones.set(tombstone.objectId, candidate);
  }

  for (const state of [current, incoming]) {
    for (const object of readSceneObjects(state.scene)) {
      const id = object.collabId;
      if (typeof id !== "string") continue;
      const candidate = {
        timestamp:
          typeof object.collabUpdatedAt === "string"
            ? object.collabUpdatedAt
            : "1970-01-01T00:00:00.000Z",
        clientId:
          typeof object.collabUpdatedBy === "string"
            ? object.collabUpdatedBy
            : "",
      };
      const previous = clocks.get(id);
      if (!previous || compareClock(candidate, previous) > 0) {
        clocks.set(id, candidate);
        objects.set(id, object);
      }
    }
  }

  for (const [id, tombstone] of tombstones) {
    const objectClock = clocks.get(id);
    if (!objectClock || compareClock(tombstone, objectClock) >= 0)
      objects.delete(id);
  }

  const source = incoming.scene;
  return {
    width: incoming.width,
    height: incoming.height,
    originalImageObjectId:
      incoming.originalImageObjectId || current.originalImageObjectId,
    tombstones: [...tombstones].map(([id, clock]) => ({
      objectId: id,
      ...clock,
    })),
    scene: {
      ...source,
      objects: [...objects.values()],
    },
  };
}

export function useCanvasCollaboration({
  canvasRef,
  fabricCanvas,
  imageObjectRef,
  imageSourceRef,
  suppressHistoryRef,
  historyVersion,
  userEditedBeforeDraftLoadRef,
  setDimensions,
  setImageThumbnail,
  setHasDocument,
  setHasImage,
  setProjectName,
  syncObjects,
  initializeHistory,
  setNotice,
}: UseCanvasCollaborationOptions) {
  const [documentId, setDocumentId] = useState("");
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("offline");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("local");
  const [activeUsers, setActiveUsers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openingDocumentId, setOpeningDocumentId] = useState("");
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [storageOnlyActive, setStorageOnlyActive] = useState(false);
  const [libraryItems, setLibraryItems] =
    useState<CanvasLibraryItem[]>(readWorkspaceCache);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryError, setLibraryError] = useState("");
  const libraryRequestRef = useRef<Promise<void> | null>(null);
  const libraryLoadedAtRef = useRef(0);
  const storageFallbackRef = useRef(false);
  const autoOpenedDocumentIdRef = useRef("");
  const documentIdRef = useRef("");
  const storageOnlySessionRef = useRef(false);
  const documentRef = useRef<CanvasDocument | null>(null);
  const versionRef = useRef(0);
  const originalImageIdRef = useRef("");
  const originalImageUrlRef = useRef("");
  const remoteDepthRef = useRef(0);
  const operationIdsRef = useRef(new Set<string>());
  const objectClocksRef = useRef(new Map<string, ObjectClock>());
  const objectBaselineRef = useRef(
    new Map<string, { serialized: string; stackIndex: number }>(),
  );
  const canvasPropertiesBaselineRef = useRef("");
  const canvasDimensionsBaselineRef = useRef({ width: 0, height: 0 });
  const processedHistoryVersionRef = useRef(historyVersion);
  const tombstonesRef = useRef(new Map<string, ObjectClock>());
  const assetUrlPromisesRef = useRef(new Map<string, Promise<string>>());
  const assetSourcesRef = useRef(
    new Map<string, { source: string; url: Promise<string> }>(),
  );
  const pendingOperationsRef = useRef<CanvasOperation[]>([]);
  const dirtyRef = useRef(false);
  const dirtyRevisionRef = useRef(0);
  const saveTimerRef = useRef<number | null>(null);
  const saveRetryDelayRef = useRef(30_000);
  const saveInFlightRef = useRef(false);
  const saveAgainRef = useRef(false);
  const saveWaitersRef = useRef<Array<() => void>>([]);
  const persistDocumentRef = useRef<() => Promise<void>>(async () => {});
  const scheduleSaveRef = useRef<(delay?: number) => void>(() => {});
  const socket = getSocketClient();
  const [clientId] = useState(getGuestClientId);

  const refreshLibrary = useCallback(async (force = false) => {
    if (storageFallbackRef.current && !force) return;
    if (libraryRequestRef.current) return libraryRequestRef.current;
    if (!force && Date.now() - libraryLoadedAtRef.current < 30_000) return;
    if (!isSupabaseConfigured) {
      setLibraryItems([]);
      setLibraryError("Configure Supabase to browse saved images.");
      return;
    }
    setLibraryLoading(true);
    setLibraryError("");
    const request = (async () => {
      try {
        const items = await listCanvasDocuments();
        storageFallbackRef.current = false;
        setLibraryItems(items);
        setLibraryError("");
      } catch (databaseError) {
        try {
          const storageItems = await listOriginalImagesFromStorage();
          const cachedItems = readWorkspaceCache();
          const cachedById = new Map(
            cachedItems.map((item) => [item.id, item]),
          );
          const recoveredItems = storageItems.map(
            (item) => cachedById.get(item.id) ?? item,
          );
          storageFallbackRef.current = true;
          if (recoveredItems.length > 0) {
            setLibraryItems(recoveredItems);
            console.log("Recovered items from storage:", recoveredItems);
            setLibraryError(
              "Database is unavailable. Showing original images from Storage; saved edits cannot be loaded until the database recovers.",
            );
          } else if (cachedItems.length > 0) {
            setLibraryItems(cachedItems);
            console.log("Showing cached workspace list.");
            setLibraryError(
              "Database is unavailable. Showing the last cached Workspace list.",
            );
          } else {
            setLibraryError(
              errorMessage(databaseError, "Saved images could not be loaded."),
            );
          }
        } catch {
          const cachedItems = readWorkspaceCache();
          storageFallbackRef.current = true;
          if (cachedItems.length > 0) {
            setLibraryItems(cachedItems);
            setLibraryError(
              "Database is unavailable. Showing the last cached Workspace list.",
            );
          } else {
            setLibraryError(
              errorMessage(databaseError, "Saved images could not be loaded."),
            );
          }
        }
      } finally {
        libraryLoadedAtRef.current = Date.now();
        setLibraryLoading(false);
        libraryRequestRef.current = null;
      }
    })();
    libraryRequestRef.current = request;
    return request;
  }, []);

  const openWorkspace = useCallback(() => {
    setWorkspaceOpen(true);
    if (!storageFallbackRef.current) void refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    try {
      localStorage.setItem(WORKSPACE_CACHE_KEY, JSON.stringify(libraryItems));
    } catch {
      // Workspace remains available from Supabase if browser storage is full.
    }
  }, [libraryItems]);

  const rememberOperation = useCallback((operationId: string) => {
    const ids = operationIdsRef.current;
    if (ids.has(operationId)) return false;
    ids.add(operationId);
    if (ids.size > 10_000) ids.delete(ids.values().next().value as string);
    return true;
  }, []);

  const externalizeObject = useCallback(
    async (
      object: Record<string, unknown>,
      id: string,
      documentId = documentIdRef.current,
    ) => {
      if (
        typeof object.src !== "string" ||
        !object.src.startsWith("data:image/")
      )
        return object;
      if (id === originalImageIdRef.current) {
        if (object.src === imageSourceRef.current) {
          return originalImageUrlRef.current
            ? {
                ...object,
                src: originalImageUrlRef.current,
                crossOrigin: "anonymous",
              }
            : object;
        }
      }

      const sourceCacheKey = `${documentId}:${id}`;
      const cachedSource = assetSourcesRef.current.get(sourceCacheKey);
      if (cachedSource?.source === object.src) {
        const src = await cachedSource.url;
        return { ...object, src, crossOrigin: "anonymous" };
      }

      const blob = await fetch(object.src).then((response) => response.blob());
      const bytes = await blob.arrayBuffer();
      const digest = new Uint8Array(
        await crypto.subtle.digest("SHA-256", bytes),
      );
      const assetRevision = [...digest]
        .map((value) => value.toString(16).padStart(2, "0"))
        .join("");
      const assetKey = `${documentId}:${assetRevision}`;
      let upload = assetUrlPromisesRef.current.get(assetKey);
      if (!upload) {
        upload = uploadCanvasAsset(documentId, blob, assetRevision);
        assetUrlPromisesRef.current.set(assetKey, upload);
        void upload.catch(() => {
          assetUrlPromisesRef.current.delete(assetKey);
          if (assetSourcesRef.current.get(sourceCacheKey)?.url === upload) {
            assetSourcesRef.current.delete(sourceCacheKey);
          }
        });
      }
      assetSourcesRef.current.set(sourceCacheKey, {
        source: object.src,
        url: upload,
      });
      const src = await upload;
      return { ...object, src, crossOrigin: "anonymous" };
    },
    [imageSourceRef],
  );

  const serializeState = useCallback(async (): Promise<CanvasDocumentState> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("The canvas is not ready to save.");
    const scene = structuredClone(
      canvas.toObject(["collabId", "collabUpdatedAt", "collabUpdatedBy"]),
    ) as Record<string, unknown>;
    const objects = await Promise.all(
      readSceneObjects(scene).map(async (object) => {
        const id = object.collabId;
        return typeof id === "string" ? externalizeObject(object, id) : object;
      }),
    );
    scene.objects = objects;
    return {
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      scene,
      originalImageObjectId: originalImageIdRef.current,
      tombstones: [...tombstonesRef.current].map(([id, clock]) => ({
        objectId: id,
        ...clock,
      })),
    };
  }, [canvasRef, externalizeObject]);

  const applyScene = useCallback(
    async (state: CanvasDocumentState, imageUrl?: string) => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("The canvas is not ready.");
      const scene = structuredClone(state.scene);
      for (const object of readSceneObjects(scene)) {
        if (object.collabId === state.originalImageObjectId && imageUrl) {
          object.src = imageUrl;
          object.crossOrigin = "anonymous";
        }
      }
      remoteDepthRef.current += 1;
      suppressHistoryRef.current = true;
      try {
        canvas.setDimensions({ width: state.width, height: state.height });
        await canvas.loadFromJSON(scene);
        let originalImage = canvas
          .getObjects()
          .find(
            (object) =>
              object.get("collabId") === state.originalImageObjectId &&
              object instanceof FabricImage,
          );
        if (!originalImage && imageUrl && state.originalImageObjectId) {
          originalImage = await FabricImage.fromURL(imageUrl, {
            crossOrigin: "anonymous",
          });
          const imageWidth = originalImage.width || state.width;
          const imageHeight = originalImage.height || state.height;
          const imageScale = Math.min(
            state.width / imageWidth,
            state.height / imageHeight,
          );
          originalImage.set({
            left: (state.width - imageWidth * imageScale) / 2,
            top: (state.height - imageHeight * imageScale) / 2,
            originX: "left",
            originY: "top",
            scaleX: imageScale,
            scaleY: imageScale,
            name: "Original image",
            collabId: state.originalImageObjectId,
          });
          canvas.add(originalImage);
          canvas.sendObjectToBack(originalImage);
        }
        canvas.requestRenderAll();
        setDimensions({ width: state.width, height: state.height });
        imageObjectRef.current = originalImage ?? null;
        setHasDocument(canvas.getObjects().length > 0);
        setHasImage(Boolean(originalImage));
        try {
          setImageThumbnail(
            imageObjectRef.current
              ? canvas.toDataURL({ format: "png", multiplier: 0.12 })
              : "",
          );
        } catch {
          setImageThumbnail("");
        }
        originalImageIdRef.current = state.originalImageObjectId;
        if (imageUrl) originalImageUrlRef.current = imageUrl;
        objectClocksRef.current.clear();
        tombstonesRef.current.clear();
        for (const object of readSceneObjects(scene)) {
          if (typeof object.collabId === "string") {
            objectClocksRef.current.set(object.collabId, {
              timestamp:
                typeof object.collabUpdatedAt === "string"
                  ? object.collabUpdatedAt
                  : "1970-01-01T00:00:00.000Z",
              clientId:
                typeof object.collabUpdatedBy === "string"
                  ? object.collabUpdatedBy
                  : "",
            });
          }
        }
        for (const tombstone of state.tombstones) {
          tombstonesRef.current.set(tombstone.objectId, {
            timestamp: tombstone.timestamp,
            clientId: tombstone.clientId,
          });
        }
        objectBaselineRef.current.clear();
        canvas.getObjects().forEach((object, stackIndex) => {
          const id =
            objectId(object) ||
            (object === imageObjectRef.current
              ? originalImageIdRef.current
              : undefined);
          if (id)
            objectBaselineRef.current.set(id, {
              serialized: serializedObject(object),
              stackIndex,
            });
        });
        canvasPropertiesBaselineRef.current =
          serializedCanvasProperties(canvas);
        canvasDimensionsBaselineRef.current = {
          width: state.width,
          height: state.height,
        };
        processedHistoryVersionRef.current = historyVersion;
        syncObjects();
        initializeHistory(canvas);
        userEditedBeforeDraftLoadRef.current = true;
      } finally {
        suppressHistoryRef.current = false;
        remoteDepthRef.current -= 1;
      }
    },
    [
      canvasRef,
      historyVersion,
      imageObjectRef,
      initializeHistory,
      setDimensions,
      setImageThumbnail,
      setHasImage,
      setHasDocument,
      suppressHistoryRef,
      syncObjects,
      userEditedBeforeDraftLoadRef,
    ],
  );

  const documentStateFromRecord = useCallback(
    (document: CanvasDocument): CanvasDocumentState => {
      const value = document.document as CanvasDocumentState;
      return {
        width: Number(value.width) || 1200,
        height: Number(value.height) || 800,
        scene: value.scene,
        originalImageObjectId: value.originalImageObjectId,
        tombstones: Array.isArray(value.tombstones) ? value.tombstones : [],
      };
    },
    [],
  );

  const setActiveDocument = useCallback(
    (document: CanvasDocument, imageUrl: string) => {
      const previousId = documentIdRef.current;
      if (previousId && socket.connected)
        leaveDocumentRoom(socket, previousId, clientId);
      documentRef.current = document;
      documentIdRef.current = document.id;
      storageOnlySessionRef.current = false;
      setStorageOnlyActive(false);
      versionRef.current = document.version;
      setDocumentId(document.id);
      setProjectName(document.name);
      originalImageUrlRef.current = imageUrl;
      if (socket.connected) joinDocumentRoom(socket, document.id, clientId);
      else {
        setConnectionStatus("connecting");
        socket.connect();
      }
    },
    [clientId, setProjectName, socket],
  );

  const flushPendingSave = useCallback(async () => {
    if (!documentRef.current || !dirtyRef.current) return;
    await persistDocumentRef.current();
    if (dirtyRef.current)
      throw new Error(
        "Shared changes are still waiting to save. Retry before replacing this document.",
      );
  }, []);

  const prepareForImageUpload = useCallback(async () => {
    await flushPendingSave();
    const previousDocumentId = documentIdRef.current;
    if (!previousDocumentId) return;
    if (socket.connected)
      leaveDocumentRoom(socket, previousDocumentId, clientId);
    pendingOperationsRef.current = pendingOperationsRef.current.filter(
      (operation) => operation.documentId !== previousDocumentId,
    );
    documentRef.current = null;
    documentIdRef.current = "";
    storageOnlySessionRef.current = false;
    setStorageOnlyActive(false);
    versionRef.current = 0;
    originalImageIdRef.current = "";
    originalImageUrlRef.current = "";
    objectBaselineRef.current.clear();
    tombstonesRef.current.clear();
    objectClocksRef.current.clear();
    setDocumentId("");
    setActiveUsers(0);
    setSaveStatus("local");
  }, [
    clientId,
    flushPendingSave,
    setActiveUsers,
    setSaveStatus,
    setStorageOnlyActive,
    socket,
  ]);

  const openStorageOriginal = useCallback(
    async (item: CanvasLibraryItem) => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("The canvas is not ready.");
      await flushPendingSave();
      const image = await FabricImage.fromURL(item.imageUrl, {
        crossOrigin: "anonymous",
      });
      const width = image.width || 1200;
      const height = image.height || 800;
      if (width > 12000 || height > 12000) {
        throw new Error("This image has invalid or unsupported dimensions.");
      }

      const previousDocumentId = documentIdRef.current;
      if (previousDocumentId && socket.connected) {
        leaveDocumentRoom(socket, previousDocumentId, clientId);
      }
      remoteDepthRef.current += 1;
      suppressHistoryRef.current = true;
      try {
        canvas.clear();
        canvas.setDimensions({ width, height });
        canvas.backgroundColor = "rgba(0,0,0,0)";
        image.set({
          left: 0,
          top: 0,
          originX: "left",
          originY: "top",
          name: item.name,
          collabId: item.id,
        });
        canvas.add(image);
        canvas.sendObjectToBack(image);
        canvas.requestRenderAll();
        imageObjectRef.current = image;
        imageSourceRef.current = item.imageUrl;
        originalImageIdRef.current = item.id;
        originalImageUrlRef.current = item.imageUrl;
        documentRef.current = null;
        documentIdRef.current = item.id;
        versionRef.current = 0;
        storageOnlySessionRef.current = true;
        setStorageOnlyActive(true);
        objectClocksRef.current.clear();
        objectBaselineRef.current.set(item.id, {
          serialized: serializedObject(image),
          stackIndex: 0,
        });
        tombstonesRef.current.clear();
        setDocumentId("");
        setProjectName(item.name);
        setDimensions({ width, height });
        setHasDocument(true);
        setHasImage(true);
        setImageThumbnail(
          canvas.toDataURL({ format: "png", multiplier: 0.12 }),
        );
        setActiveUsers(0);
        setSaveStatus("local");
        dirtyRef.current = false;
        syncObjects();
        initializeHistory(canvas);
        userEditedBeforeDraftLoadRef.current = true;
      } finally {
        suppressHistoryRef.current = false;
        remoteDepthRef.current -= 1;
      }
      setNotice(
        "Database is unavailable. Live edits are shared with connected guests but will not be saved until the database recovers.",
      );
      if (socket.connected) joinDocumentRoom(socket, item.id, clientId);
      else {
        setConnectionStatus("connecting");
        socket.connect();
      }
    },
    [
      canvasRef,
      clientId,
      flushPendingSave,
      imageObjectRef,
      imageSourceRef,
      initializeHistory,
      setDimensions,
      setHasDocument,
      setHasImage,
      setImageThumbnail,
      setNotice,
      setProjectName,
      socket,
      suppressHistoryRef,
      syncObjects,
      userEditedBeforeDraftLoadRef,
      setStorageOnlyActive,
    ],
  );

  const openDocument = useCallback(
    async (id: string) => {
      if (!id.trim()) return;
      userEditedBeforeDraftLoadRef.current = true;
      setOpeningDocumentId(id.trim());
      setLoading(true);
      try {
        await flushPendingSave();
        const libraryItem = libraryItems.find((item) => item.id === id.trim());
        let result: Awaited<ReturnType<typeof openCanvasDocument>>;
        try {
          result = await openCanvasDocument(id.trim());
        } catch (databaseError) {
          if (!libraryItem) throw databaseError;
          await openStorageOriginal({ ...libraryItem, storageOnly: true });
          return;
        }
        const state = documentStateFromRecord(result.document);
        await applyScene(state, result.imageUrl);
        imageSourceRef.current = result.imageUrl;
        setActiveDocument(result.document, result.imageUrl);
        dirtyRef.current = false;
        setSaveStatus("saved");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "The shared document could not be opened.";
        setNotice(message);
        throw error;
      } finally {
        setLoading(false);
        setOpeningDocumentId("");
      }
    },
    [
      applyScene,
      documentStateFromRecord,
      flushPendingSave,
      imageSourceRef,
      libraryItems,
      openStorageOriginal,
      setActiveDocument,
      setNotice,
      userEditedBeforeDraftLoadRef,
    ],
  );

  const createDocument = useCallback(
    async (file: File) => {
      if (!isSupabaseConfigured) {
        setSaveStatus("local");
        return;
      }
      const canvas = canvasRef.current;
      const imageObject = imageObjectRef.current;
      if (!canvas || !imageObject)
        throw new Error("Load an image before creating a shared document.");

      await assertCanvasDocumentsAvailable();
      const id = crypto.randomUUID();
      originalImageUrlRef.current = "";
      assetUrlPromisesRef.current.clear();
      assetSourcesRef.current.clear();
      for (const object of canvas.getObjects()) {
        if (!objectId(object)) object.set("collabId", crypto.randomUUID());
      }
      const originalImageObjectId = objectId(imageObject) || id;
      imageObject.set("collabId", originalImageObjectId);
      originalImageIdRef.current = originalImageObjectId;
      const scene = structuredClone(
        canvas.toObject(["collabId", "collabUpdatedAt", "collabUpdatedBy"]),
      ) as Record<string, unknown>;
      const imageSource = imageObject.toObject() as { src?: string };
      const originalImageIsModified =
        typeof imageSource.src === "string" &&
        imageSource.src !== imageSourceRef.current;
      scene.objects = await Promise.all(
        readSceneObjects(scene).map(async (object) => {
          const objectCollabId = object.collabId;
          return typeof objectCollabId === "string"
            ? externalizeObject(object, objectCollabId, id)
            : object;
        }),
      );
      const created = await createCanvasDocument({
        id,
        file,
        name: file.name.replace(/\.[^.]+$/, "") || "Shared image",
        scene,
        width: canvas.getWidth(),
        height: canvas.getHeight(),
        originalImageObjectId,
        originalImageIsModified,
      });
      const realImageUrl = getCanvasAssetUrl(
        created.storage_path,
        created.storage_bucket,
      );
      originalImageUrlRef.current = realImageUrl;
      const previousDocumentId = documentIdRef.current;
      if (previousDocumentId && socket.connected)
        leaveDocumentRoom(socket, previousDocumentId, clientId);
      documentRef.current = created;
      documentIdRef.current = created.id;
      storageOnlySessionRef.current = false;
      setStorageOnlyActive(false);
      versionRef.current = created.version;
      setDocumentId(created.id);
      setProjectName(created.name);
      setSaveStatus("saved");
      objectBaselineRef.current.clear();
      canvas.getObjects().forEach((object, stackIndex) => {
        const objectIdValue = objectId(object);
        if (objectIdValue)
          objectBaselineRef.current.set(objectIdValue, {
            serialized: serializedObject(object),
            stackIndex,
          });
      });
      canvasPropertiesBaselineRef.current = serializedCanvasProperties(canvas);
      canvasDimensionsBaselineRef.current = {
        width: canvas.getWidth(),
        height: canvas.getHeight(),
      };
      processedHistoryVersionRef.current = historyVersion;
      dirtyRef.current = true;
      dirtyRevisionRef.current += 1;
      scheduleSaveRef.current(0);
      setLibraryItems((items) => [
        {
          id: created.id,
          name: created.name,
          storage_path: created.storage_path,
          storage_bucket: created.storage_bucket,
          updated_at: created.updated_at,
          imageUrl: realImageUrl,
        },
        ...items.filter((item) => item.id !== created.id),
      ]);
      if (socket.connected) joinDocumentRoom(socket, created.id, clientId);
      else {
        setConnectionStatus("connecting");
        socket.connect();
      }
    },
    [
      canvasRef,
      clientId,
      externalizeObject,
      historyVersion,
      imageObjectRef,
      imageSourceRef,
      setStorageOnlyActive,
      setProjectName,
      socket,
    ],
  );

  const createFromUpload = useCallback(
    async (file: File) => {
      if (!isSupabaseConfigured) return;
      try {
        await createDocument(file);
      } catch (error) {
        setSaveStatus("local");
        setNotice(
          error instanceof Error
            ? `Image is local, but shared upload failed: ${error.message}`
            : "Image is local, but shared upload failed.",
        );
      }
    },
    [createDocument, setNotice],
  );

  const createSharedCopy = useCallback(async () => {
    if (documentIdRef.current && !storageOnlySessionRef.current) return;
    const source = imageSourceRef.current;
    if (!source) {
      setNotice("The original image source is unavailable for sharing.");
      return;
    }
    try {
      const blob = await fetch(source).then((response) => response.blob());
      const file = new File([blob], "shared-image", {
        type: blob.type || "image/png",
      });
      await createDocument(file);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "The shared document could not be created.",
      );
    }
  }, [createDocument, imageSourceRef, setNotice]);

  const scheduleSave = useCallback((delay = 1500) => {
    if (saveTimerRef.current !== null)
      window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveTimerRef.current = null;
      void persistDocumentRef.current();
    }, delay);
  }, []);
  useEffect(() => {
    scheduleSaveRef.current = scheduleSave;
  }, [scheduleSave]);

  const persistDocument = useCallback(async () => {
    const document = documentRef.current;
    if (!document || !dirtyRef.current) return;
    if (saveInFlightRef.current) {
      saveAgainRef.current = true;
      await new Promise<void>((resolve) =>
        saveWaitersRef.current.push(resolve),
      );
      return;
    }
    saveInFlightRef.current = true;
    const savedRevision = dirtyRevisionRef.current;
    setSaveStatus("saving");
    try {
      let state = await serializeState();
      let saved: CanvasDocumentSaveResult;
      try {
        saved = await saveCanvasDocument(
          document.id,
          state,
          versionRef.current,
        );
      } catch (saveError) {
        if (!isVersionConflict(saveError)) throw saveError;
        const latest = await openCanvasDocument(document.id);
        state = mergeDocumentStates(
          latest.document.document as CanvasDocumentState,
          await serializeState(),
        );
        await applyScene(state, latest.imageUrl);
        saved = await saveCanvasDocument(
          document.id,
          state,
          latest.document.version,
        );
      }
      documentRef.current = { ...document, ...saved };
      versionRef.current = saved.version;
      saveRetryDelayRef.current = 30_000;
      setLibraryItems((items) =>
        items.map((item) =>
          item.id === saved.id
            ? { ...item, name: saved.name, updated_at: saved.updated_at }
            : item,
        ),
      );
      dirtyRef.current = dirtyRevisionRef.current !== savedRevision;
      setSaveStatus(dirtyRef.current ? "unsaved" : "saved");
      if (dirtyRef.current) saveAgainRef.current = true;
    } catch (error) {
      setSaveStatus("error");
      setNotice(
        error instanceof Error
          ? `Cloud save failed; local changes are retained. ${error.message}`
          : "Cloud save failed; local changes are retained.",
      );
      const retryDelay = saveRetryDelayRef.current;
      saveRetryDelayRef.current = Math.min(retryDelay * 2, 5 * 60_000);
      scheduleSave(retryDelay);
    } finally {
      saveInFlightRef.current = false;
      if (saveAgainRef.current) {
        saveAgainRef.current = false;
        await persistDocumentRef.current();
      }
      for (const resolve of saveWaitersRef.current.splice(0)) resolve();
    }
  }, [applyScene, scheduleSave, serializeState, setNotice]);

  useEffect(() => {
    persistDocumentRef.current = persistDocument;
  }, [persistDocument]);

  const publishLocalOperation = useCallback(
    (
      action: CanvasOperation["action"],
      target?: FabricObject,
      idOverride?: string,
      stackIndex?: number,
    ) => {
      const activeDocumentId = documentIdRef.current;
      if (!activeDocumentId) return;
      let id = target ? objectId(target) : idOverride;
      if (target && !id) {
        id = crypto.randomUUID();
        target.set("collabId", id);
      }
      if (!id) return;
      if (action === "update" && target) {
        const currentIndex =
          canvasRef.current?.getObjects().indexOf(target) ?? -1;
        const previous = objectBaselineRef.current.get(id);
        if (
          previous?.serialized === serializedObject(target) &&
          previous.stackIndex === (stackIndex ?? Math.max(0, currentIndex))
        )
          return;
      }

      const timestamp = new Date().toISOString();
      const operationBase: CanvasOperation = {
        operationId: crypto.randomUUID(),
        documentId: activeDocumentId,
        clientId,
        action,
        objectId: id,
        timestamp,
        ...(stackIndex === undefined ? {} : { stackIndex }),
      };
      objectClocksRef.current.set(id, { timestamp, clientId });
      if (action === "remove") {
        tombstonesRef.current.set(id, { timestamp, clientId });
        objectBaselineRef.current.delete(id);
      } else if (target) {
        target.set({ collabUpdatedAt: timestamp, collabUpdatedBy: clientId });
        tombstonesRef.current.delete(id);
        const currentIndex =
          canvasRef.current?.getObjects().indexOf(target) ?? -1;
        objectBaselineRef.current.set(id, {
          serialized: serializedObject(target),
          stackIndex: stackIndex ?? Math.max(0, currentIndex),
        });
      }

      if (!storageOnlySessionRef.current) {
        dirtyRef.current = true;
        dirtyRevisionRef.current += 1;
        setSaveStatus("unsaved");
        scheduleSave();
      }

      if (action === "remove") {
        if (socket.connected) sendCanvasOperation(socket, operationBase);
        else pendingOperationsRef.current.push(operationBase);
        return;
      }
      if (!target) return;

      void externalizeObject(
        target.toObject(["collabId", "collabUpdatedAt", "collabUpdatedBy"]),
        id,
      )
        .then((object) => {
          const operation = { ...operationBase, object };
          if (socket.connected) sendCanvasOperation(socket, operation);
          else pendingOperationsRef.current.push(operation);
        })
        .catch((error: unknown) => {
          setSaveStatus("error");
          setNotice(
            error instanceof Error
              ? `An image asset could not be shared. ${error.message}`
              : "An image asset could not be shared.",
          );
        });
    },
    [canvasRef, clientId, externalizeObject, scheduleSave, setNotice, socket],
  );

  const syncCanvasDiff = useCallback(() => {
    const canvas = canvasRef.current;
    if (
      !canvas ||
      !documentIdRef.current ||
      suppressHistoryRef.current ||
      remoteDepthRef.current > 0
    )
      return;
    const presentIds = new Set<string>();
    let changed = false;

    canvas.getObjects().forEach((object, stackIndex) => {
      let id = objectId(object);
      if (
        !id &&
        object === imageObjectRef.current &&
        originalImageIdRef.current
      ) {
        id = originalImageIdRef.current;
        object.set("collabId", id);
      }
      if (!id) {
        id = crypto.randomUUID();
        object.set("collabId", id);
      }
      presentIds.add(id);
      const serialized = serializedObject(object);
      const previous = objectBaselineRef.current.get(id);
      if (!previous) {
        publishLocalOperation("add", object, id, stackIndex);
        changed = true;
      } else if (
        previous.serialized !== serialized ||
        previous.stackIndex !== stackIndex
      ) {
        publishLocalOperation("update", object, id, stackIndex);
        changed = true;
      }
    });

    for (const id of objectBaselineRef.current.keys()) {
      if (!presentIds.has(id)) {
        publishLocalOperation("remove", undefined, id);
        changed = true;
      }
    }

    const properties = serializedCanvasProperties(canvas);
    const width = canvas.getWidth();
    const height = canvas.getHeight();
    if (
      properties !== canvasPropertiesBaselineRef.current ||
      width !== canvasDimensionsBaselineRef.current.width ||
      height !== canvasDimensionsBaselineRef.current.height
    )
      changed = true;
    canvasPropertiesBaselineRef.current = properties;
    canvasDimensionsBaselineRef.current = { width, height };

    if (changed && !storageOnlySessionRef.current) {
      dirtyRef.current = true;
      dirtyRevisionRef.current += 1;
      setSaveStatus("unsaved");
      scheduleSave();
    }
  }, [
    canvasRef,
    imageObjectRef,
    publishLocalOperation,
    scheduleSave,
    setSaveStatus,
    suppressHistoryRef,
  ]);

  const applyRemoteOperation = useCallback(
    async (operation: CanvasOperation) => {
      if (
        operation.clientId === clientId ||
        !rememberOperation(operation.operationId)
      )
        return;
      const canvas = canvasRef.current;
      if (!canvas || operation.documentId !== documentIdRef.current) return;
      const incomingClock = {
        timestamp: operation.timestamp,
        clientId: operation.clientId,
      };
      const currentClock = objectClocksRef.current.get(operation.objectId);
      const tombstone = tombstonesRef.current.get(operation.objectId);
      const latestClock =
        tombstone &&
        (!currentClock || compareClock(tombstone, currentClock) > 0)
          ? tombstone
          : currentClock;
      if (latestClock && compareClock(incomingClock, latestClock) <= 0) return;

      const existing = canvas
        .getObjects()
        .find((object) => objectId(object) === operation.objectId);
      if (operation.action === "remove") {
        remoteDepthRef.current += 1;
        const wasSuppressed = suppressHistoryRef.current;
        suppressHistoryRef.current = true;
        try {
          if (existing) canvas.remove(existing);
          tombstonesRef.current.set(operation.objectId, incomingClock);
          objectClocksRef.current.set(operation.objectId, incomingClock);
          objectBaselineRef.current.delete(operation.objectId);
          canvas.requestRenderAll();
          syncObjects();
        } finally {
          suppressHistoryRef.current = wasSuppressed;
          remoteDepthRef.current -= 1;
        }
        return;
      }
      if (!operation.object || typeof operation.object.type !== "string")
        return;

      try {
        const FabricClass = classRegistry.getClass(operation.object.type) as {
          fromObject: (
            serialized: Record<string, unknown>,
          ) => Promise<FabricObject>;
        };
        const incomingObject = await FabricClass.fromObject(operation.object);
        if (incomingObject.get("collabId") !== operation.objectId)
          incomingObject.set("collabId", operation.objectId);
        incomingObject.set({
          collabUpdatedAt: operation.timestamp,
          collabUpdatedBy: operation.clientId,
        });
        const newestClock = objectClocksRef.current.get(operation.objectId);
        if (newestClock && compareClock(incomingClock, newestClock) <= 0)
          return;

        remoteDepthRef.current += 1;
        const wasSuppressed = suppressHistoryRef.current;
        suppressHistoryRef.current = true;
        try {
          const currentIndex = existing
            ? canvas.getObjects().indexOf(existing)
            : canvas.getObjects().length;
          const index =
            operation.stackIndex === undefined
              ? currentIndex
              : Math.min(
                  operation.stackIndex,
                  canvas.getObjects().length - (existing ? 1 : 0),
                );
          if (existing) canvas.remove(existing);
          canvas.insertAt(Math.max(0, index), incomingObject);
          tombstonesRef.current.delete(operation.objectId);
          objectClocksRef.current.set(operation.objectId, incomingClock);
          objectBaselineRef.current.set(operation.objectId, {
            serialized: serializedObject(incomingObject),
            stackIndex: index,
          });
          canvas.requestRenderAll();
          syncObjects();
        } finally {
          suppressHistoryRef.current = wasSuppressed;
          remoteDepthRef.current -= 1;
        }
      } catch (error) {
        setNotice(
          error instanceof Error
            ? `A remote object could not be applied: ${error.message}`
            : "A remote object could not be applied.",
        );
      }
    },
    [
      canvasRef,
      clientId,
      rememberOperation,
      setNotice,
      suppressHistoryRef,
      syncObjects,
    ],
  );

  const reconcileAfterReconnect = useCallback(
    async (expectedDocumentId: string) => {
      const result = await openCanvasDocument(expectedDocumentId);
      const remoteState = documentStateFromRecord(result.document);
      const state = dirtyRef.current
        ? mergeDocumentStates(remoteState, await serializeState())
        : remoteState;
      await applyScene(state, result.imageUrl);
      documentRef.current = result.document;
      versionRef.current = result.document.version;
      imageSourceRef.current = result.imageUrl;
      if (dirtyRef.current) scheduleSave(0);
      else setSaveStatus("saved");
    },
    [
      applyScene,
      documentStateFromRecord,
      imageSourceRef,
      scheduleSave,
      serializeState,
    ],
  );

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleObjectChange = (
      action: CanvasOperation["action"],
      event: { target?: FabricObject },
    ) => {
      const documentId = documentIdRef.current;
      const target = event.target;
      if (
        !documentId ||
        !target ||
        suppressHistoryRef.current ||
        remoteDepthRef.current > 0
      )
        return;
      const index = fabricCanvas.getObjects().indexOf(target);
      publishLocalOperation(
        action,
        target,
        undefined,
        index >= 0 ? index : undefined,
      );
    };

    const handleAdded = (event: { target?: FabricObject }) =>
      handleObjectChange("add", event);
    const handleModified = (event: { target?: FabricObject }) =>
      handleObjectChange("update", event);
    const handleRemoved = (event: { target?: FabricObject }) =>
      handleObjectChange("remove", event);
    const handleTextChanged = (event: { target?: FabricObject }) =>
      handleObjectChange("update", event);
    fabricCanvas.on("object:added", handleAdded);
    fabricCanvas.on("object:modified", handleModified);
    fabricCanvas.on("object:removed", handleRemoved);
    fabricCanvas.on("text:changed", handleTextChanged);
    return () => {
      fabricCanvas.off("object:added", handleAdded);
      fabricCanvas.off("object:modified", handleModified);
      fabricCanvas.off("object:removed", handleRemoved);
      fabricCanvas.off("text:changed", handleTextChanged);
    };
  }, [fabricCanvas, publishLocalOperation, suppressHistoryRef]);

  useEffect(() => {
    if (processedHistoryVersionRef.current === historyVersion) return;
    processedHistoryVersionRef.current = historyVersion;
    syncCanvasDiff();
  }, [historyVersion, syncCanvasDiff]);

  useEffect(() => {
    const handleConnect = () => {
      setConnectionStatus("connected");
      const activeDocumentId = documentIdRef.current;
      const resumeRoom = () => {
        if (!socket.connected) return;
        if (activeDocumentId)
          joinDocumentRoom(socket, activeDocumentId, clientId);
        for (const operation of pendingOperationsRef.current.splice(0))
          sendCanvasOperation(socket, operation);
        if (dirtyRef.current) scheduleSave(0);
      };
      if (activeDocumentId && !storageOnlySessionRef.current) {
        void reconcileAfterReconnect(activeDocumentId)
          .catch((error: unknown) => {
            setNotice(
              error instanceof Error
                ? `Reconnect refresh failed; local edits are retained. ${error.message}`
                : "Reconnect refresh failed; local edits are retained.",
            );
          })
          .finally(resumeRoom);
      } else {
        resumeRoom();
      }
    };
    const handleDisconnect = () => setConnectionStatus("disconnected");
    const handleConnectError = () => setConnectionStatus("disconnected");
    const handleUsers = (message: { documentId: string; users: string[] }) => {
      if (message.documentId === documentIdRef.current)
        setActiveUsers(message.users.length);
    };
    const handleOperation = (operation: CanvasOperation) =>
      void applyRemoteOperation(operation);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("document:users", handleUsers);
    socket.on("canvas:operation", handleOperation);
    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("document:users", handleUsers);
      socket.off("canvas:operation", handleOperation);
    };
  }, [
    applyRemoteOperation,
    clientId,
    reconcileAfterReconnect,
    scheduleSave,
    setNotice,
    socket,
  ]);

  useEffect(
    () => () => {
      if (saveTimerRef.current !== null)
        window.clearTimeout(saveTimerRef.current);
      const activeDocumentId = documentIdRef.current;
      if (activeDocumentId && socket.connected)
        leaveDocumentRoom(socket, activeDocumentId, clientId);
    },
    [clientId, socket],
  );

  useEffect(() => {
    const flushOnPageHide = () => {
      if (dirtyRef.current) void persistDocumentRef.current();
    };
    window.addEventListener("pagehide", flushOnPageHide);
    return () => window.removeEventListener("pagehide", flushOnPageHide);
  }, []);

  useEffect(() => {
    const requestedDocumentId = new URLSearchParams(window.location.search).get(
      "document",
    );
    if (
      !fabricCanvas ||
      !requestedDocumentId ||
      autoOpenedDocumentIdRef.current === requestedDocumentId
    )
      return;
    const timer = window.setTimeout(() => {
      if (autoOpenedDocumentIdRef.current === requestedDocumentId) return;
      autoOpenedDocumentIdRef.current = requestedDocumentId;
      void openDocument(requestedDocumentId).catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fabricCanvas, openDocument]);

  return {
    documentId,
    connectionStatus,
    saveStatus,
    activeUsers,
    loading,
    openingDocumentId,
    workspaceOpen,
    storageOnlyActive,
    openWorkspace,
    closeWorkspace: () => setWorkspaceOpen(false),
    enabled: isSupabaseConfigured,
    openDocument,
    createFromUpload,
    createSharedCopy,
    flushPendingSave,
    prepareForImageUpload,
    libraryItems,
    libraryLoading,
    libraryError,
    refreshLibrary,
  };
}
