import type { Json } from "./types";
import {
  CANVAS_STORAGE_BUCKET,
  getCanvasAssetUrl,
  uploadOriginalImage,
} from "./canvasStorageService";
import { getSupabaseClient } from "./supabaseClient";

export type CanvasDocument = {
  id: string;
  name: string;
  storage_path: string;
  storage_bucket: string;
  document: CanvasDocumentState;
  version: number;
  created_at: string;
  updated_at: string;
};

export type CanvasDocumentSaveResult = Pick<
  CanvasDocument,
  "id" | "name" | "version" | "updated_at"
>;

export type CanvasLibraryItem = Pick<
  CanvasDocument,
  "id" | "name" | "storage_path" | "storage_bucket" | "updated_at"
> & { imageUrl: string; storageOnly?: boolean };

export type CanvasDocumentState = {
  width: number;
  height: number;
  scene: Record<string, unknown>;
  originalImageObjectId: string;
  tombstones: Array<{ objectId: string; timestamp: string; clientId: string }>;
};

export type NewCanvasDocument = {
  id: string;
  file: File;
  name: string;
  scene: Record<string, unknown>;
  width: number;
  height: number;
  originalImageObjectId: string;
  originalImageIsModified: boolean;
};

export async function assertCanvasDocumentsAvailable() {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("canvas_documents")
    .select("id")
    .limit(1);

  if (error) throw error;
}

export async function createCanvasDocument(input: NewCanvasDocument) {
  const id = input.id;
  const asset = await uploadOriginalImage(id, input.file);
  const imageUrl = getCanvasAssetUrl(asset.storagePath, asset.storageBucket);
  const scene = structuredClone(input.scene);
  const sceneObjects = scene.objects;
  const supabase = getSupabaseClient();

  if (Array.isArray(sceneObjects)) {
    for (const sceneObject of sceneObjects) {
      if (!sceneObject || typeof sceneObject !== "object") continue;
      const object = sceneObject as Record<string, unknown>;
      if (
        object.collabId === input.originalImageObjectId &&
        !input.originalImageIsModified
      ) {
        object.src = imageUrl;
        object.crossOrigin = "anonymous";
      }
    }
  }
  const initialDocument: CanvasDocumentState = {
    width: input.width,
    height: input.height,
    scene,
    originalImageObjectId: input.originalImageObjectId,
    tombstones: [],
  };
  const { data, error } = await supabase
    .from("canvas_documents")
    .insert({
      id,
      name: input.name,
      storage_path: asset.storagePath,
      storage_bucket: asset.storageBucket,
      document: initialDocument as unknown as Json,
      //   version: 1,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as CanvasDocument;
}

export async function openCanvasDocument(documentId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("canvas_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("No shared document exists with that ID.");

  const document = data as CanvasDocument;
  return {
    document,
    imageUrl: getCanvasAssetUrl(
      document.storage_path,
      document.storage_bucket || CANVAS_STORAGE_BUCKET,
    ),
  };
}

export async function listCanvasDocuments(): Promise<CanvasLibraryItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("canvas_documents")
    .select("id,name,storage_path,storage_bucket,updated_at")
    .order("updated_at", { ascending: false })
    .limit(10);
  console.log("listCanvasDocuments data:", data);
  if (error) {
    console.error("Canvas documents query failed:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      error,
    });
    throw error;
  }
  return (data ?? []).map((document) => {
    const item = document as Omit<CanvasLibraryItem, "imageUrl">;
    return {
      ...item,
      imageUrl: getCanvasAssetUrl(item.storage_path, item.storage_bucket),
    };
  });
}

export async function listOriginalImagesFromStorage(): Promise<
  CanvasLibraryItem[]
> {
  const supabase = getSupabaseClient();
  const storage = supabase.storage.from(CANVAS_STORAGE_BUCKET);
  const { data: folders, error: foldersError } = await storage.list("", {
    limit: 20,
    sortBy: { column: "name", order: "asc" },
  });
  if (foldersError) throw foldersError;

  const documentFolders = (folders ?? [])
    .filter((entry) => !entry.id && /^[0-9a-f-]{36}$/i.test(entry.name))
    .slice(0, 20);
  const originalLists = await Promise.all(
    documentFolders.map(async (folder) => {
      const { data, error } = await storage.list(`${folder.name}/original`, {
        limit: 20,
      });
      if (error) return [];
      return (data ?? [])
        .filter((file) => Boolean(file.id))
        .map((file) => {
          const storagePath = `${folder.name}/original/${file.name}`;
          return {
            id: folder.name,
            name: file.name.replace(/\.[^.]+$/, "") || "Untitled image",
            storage_path: storagePath,
            storage_bucket: CANVAS_STORAGE_BUCKET,
            updated_at:
              file.updated_at || file.created_at || new Date().toISOString(),
            imageUrl: getCanvasAssetUrl(storagePath),
            storageOnly: true,
          } satisfies CanvasLibraryItem;
        });
    }),
  );

  return originalLists
    .flat()
    .sort((left, right) => right.updated_at.localeCompare(left.updated_at));
}

export async function saveCanvasDocument(
  documentId: string,
  document: CanvasDocumentState,
  expectedVersion: number,
): Promise<CanvasDocumentSaveResult> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .rpc("save_canvas_document", {
      p_id: documentId,
      p_document: document as unknown as Json,
      p_expected_version: expectedVersion,
    })
    .select("id,name,version,updated_at");

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row)
    throw new Error("The document version changed before this save completed.");
  return row as unknown as CanvasDocumentSaveResult;
}
