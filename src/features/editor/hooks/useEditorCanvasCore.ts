import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas, FabricImage, Rect, type FabricObject } from "fabric";
import type {
  FilterId,
  EditorTool,
  UseEditorCanvasCoreOptions,
} from "../model/types";
import { BACKGROUND_IMAGE_NAME, BASE_IMAGE_PROPERTY, isDrawingLayerName, serializeCanvas } from "../model/constants";
import { useFabricCanvas } from "./useFabricCanvas";
import { useHistoryRecorder } from "./useHistoryRecorder";

const SELECTION_CORNER_SIZE = 12;
const SELECTION_BORDER_SCALE = 2;

function getCanvasDisplayScale(canvas: Canvas) {
  const element = canvas.upperCanvasEl;
  const width = element.clientWidth;
  return width > 0 ? element.getBoundingClientRect().width / width : 1;
}

function applySelectionControlStyle(canvas: Canvas, object: FabricObject) {
  const displayScale = Math.max(getCanvasDisplayScale(canvas), 0.001);
  const selectionStyle = {
    borderColor: "#2c7660",
    borderScaleFactor: SELECTION_BORDER_SCALE / displayScale,
    cornerColor: "#ffffff",
    cornerStrokeColor: "#2c7660",
    cornerSize: SELECTION_CORNER_SIZE / displayScale,
    cornerStyle: "circle",
    transparentCorners: false,
  };

  if (
    object.borderColor !== selectionStyle.borderColor ||
    object.borderScaleFactor !== selectionStyle.borderScaleFactor ||
    object.cornerColor !== selectionStyle.cornerColor ||
    object.cornerStrokeColor !== selectionStyle.cornerStrokeColor ||
    object.cornerSize !== selectionStyle.cornerSize ||
    object.cornerStyle !== selectionStyle.cornerStyle ||
    object.transparentCorners !== selectionStyle.transparentCorners
  ) {
    object.set(selectionStyle);
    return true;
  }
  return false;
}

export function useEditorCanvasCore({
  activeTool,
  zoom,
  setZoom,
  setHasDocument,
  setHasImage,
  setSelectedObject,
  setObjects,
  setSelectedIsImage,
  setImageThumbnail,
  setCropRotation,
}: UseEditorCanvasCoreOptions) {
  const canvasRef = useRef<Canvas | null>(null);
  const suppressHistoryRef = useRef(false);
  const cropObjectRef = useRef<Rect | null>(null);
  const cropOriginalSnapshotRef = useRef<string | null>(null);
  const imageObjectRef = useRef<FabricImage | null>(null);
  const imageSourceRef = useRef("");
  const selectedFilterRef = useRef<FilterId>("original");
  const filterIntensityRef = useRef(100);
  const backgroundRemovedRef = useRef(false);
  const backgroundColorRef = useRef("#ffffff");
  const activeToolRef = useRef<EditorTool>("upload");
  const userEditedBeforeDraftLoadRef = useRef(false);
  const syncedObjectsRef = useRef<FabricObject[]>([]);
  const [imageResizeLocked, setImageResizeLocked] = useState(false);

  const markUserEditedBeforeDraftLoad = useCallback(() => {
    if (!suppressHistoryRef.current)
      userEditedBeforeDraftLoadRef.current = true;
  }, []);
  const markUserInteractionBeforeDraftLoad = useCallback(() => {
    userEditedBeforeDraftLoadRef.current = true;
  }, []);
  const shouldSyncCanvasObjects = useCallback(
    () => !suppressHistoryRef.current,
    [],
  );

  const syncSelection = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const active = canvas.getActiveObject() ?? null;
    canvas.getObjects()
      .filter((object) => isDrawingLayerName(object.get('name')))
      .forEach((drawingLayer) => drawingLayer.set('perPixelTargetFind', active !== drawingLayer))
    if (active) applySelectionControlStyle(canvas, active);
    setSelectedObject(active);
    setSelectedIsImage(active === imageObjectRef.current);
  }, [setSelectedIsImage, setSelectedObject]);

  const syncObjects = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const currentObjects = canvas.getObjects();
    const image = currentObjects.find(
      (item) =>
        item instanceof FabricImage &&
       
        item.get(BASE_IMAGE_PROPERTY) === true,
    ) ?? currentObjects.find(
      (item) => item instanceof FabricImage &&
        item.get("name") !== BACKGROUND_IMAGE_NAME &&
        !String(item.get("name") ?? "").startsWith("layout-image-") &&
        !isDrawingLayerName(item.get('name')) &&
        !item.get('stickerAnimationId') &&
        !item.get('threeDType') &&
        !item.get('emojiId'),
    );

    const imageLocked = image?.get('layerLocked') === true
    if (image && (
      image.selectable !== !imageLocked || image.evented !== !imageLocked ||
      image.lockMovementX !== imageLocked || image.lockMovementY !== imageLocked ||
      image.lockScalingX !== imageLocked || image.lockScalingY !== imageLocked ||
      image.lockRotation !== imageLocked
    )) {
      image.set({
        selectable: !imageLocked,
        evented: !imageLocked,
        lockMovementX: imageLocked,
        lockMovementY: imageLocked,
        lockScalingX: imageLocked,
        lockScalingY: imageLocked,
        lockRotation: imageLocked,
      })
    }
    currentObjects.filter((item) => isDrawingLayerName(item.get('name'))).forEach((drawingLayer) => {
      const drawingLayerLocked = drawingLayer.get('layerLocked') === true
      if (
        drawingLayer.selectable !== !drawingLayerLocked || drawingLayer.evented !== !drawingLayerLocked ||
        drawingLayer.lockMovementX !== drawingLayerLocked || drawingLayer.lockMovementY !== drawingLayerLocked ||
        drawingLayer.lockScalingX !== drawingLayerLocked || drawingLayer.lockScalingY !== drawingLayerLocked ||
        drawingLayer.lockRotation !== drawingLayerLocked ||
        drawingLayer.perPixelTargetFind !== (canvas.getActiveObject() !== drawingLayer)
      ) {
        drawingLayer.set({
          selectable: !drawingLayerLocked,
          evented: !drawingLayerLocked,
          perPixelTargetFind: canvas.getActiveObject() !== drawingLayer,
          lockMovementX: drawingLayerLocked,
          lockMovementY: drawingLayerLocked,
          lockScalingX: drawingLayerLocked,
          lockScalingY: drawingLayerLocked,
          lockRotation: drawingLayerLocked,
        })
      }
    })
 
    const imageObject = image instanceof FabricImage ? image : null
    if (imageObjectRef.current !== imageObject) {
      imageObjectRef.current = imageObject
      imageSourceRef.current = imageObject?.getSrc() ?? ''
    }
    setCropRotation(image instanceof FabricImage ? Math.round(image.angle || 0) : 0)
    setHasImage(Boolean(image))
    if (!(image instanceof FabricImage)) setImageThumbnail('')
    const visibleObjects = currentObjects.filter((item) => item !== cropObjectRef.current)
    setHasDocument(visibleObjects.length > 0)
    const previousObjects = syncedObjectsRef.current
    const activeObject = canvas.getActiveObject()
    if (
      activeObject && activeObject === image && imageResizeLocked
    )
      canvas.discardActiveObject();
    if (
      visibleObjects.length !== previousObjects.length ||
      visibleObjects.some((item, index) => item !== previousObjects[index])
    ) {
      syncedObjectsRef.current = visibleObjects;
      setObjects(visibleObjects);
    }

    syncSelection();
  }, [
    imageResizeLocked,
    setCropRotation,
    setHasDocument,
    setHasImage,
    setImageThumbnail,
    setObjects,
    syncSelection,
  ]);

  const toggleImageResizeLock = useCallback(() => {
    const nextLocked = !imageResizeLocked;
    setImageResizeLocked(nextLocked);
    const image = imageObjectRef.current;
    const canvas = canvasRef.current;
    const locked = nextLocked || image?.get('layerLocked') === true
    image?.set({
      selectable: !locked,
      evented: !locked,
      lockMovementX: locked,
      lockMovementY: locked,
      lockScalingX: locked,
      lockScalingY: locked,
      lockRotation: locked,
    });
    if (locked && canvas?.getActiveObject() === image)
      canvas.discardActiveObject();
    image?.setCoords();
    canvas?.requestRenderAll();
    syncSelection();
  }, [imageResizeLocked, syncSelection]);

  const serializeEditorSnapshot = useCallback((canvas: Canvas) => {
    const base = JSON.parse(serializeCanvas(canvas)) as {
      width: number
      height: number
      scene: Parameters<Canvas['loadFromJSON']>[0]
    }
    return JSON.stringify({
      ...base,
      editor: {
        filterId: selectedFilterRef.current,
        filterIntensity: filterIntensityRef.current,
        backgroundRemoved: backgroundRemovedRef.current,
        backgroundColor: backgroundColorRef.current,
      },
    });
  }, []);

  const history = useHistoryRecorder({
    canvasRef,
    suppressHistoryRef,
    serializeSnapshot: serializeEditorSnapshot,
    syncObjects,
  });
  const fabric = useFabricCanvas({
    canvasRef,
    recordHistory: history.recordHistory,
    initializeHistory: history.initialize,
    syncObjects,
    syncSelection,
    setZoom,
    onUserEdit: markUserEditedBeforeDraftLoad,
    onUserInteraction: markUserInteractionBeforeDraftLoad,
    shouldSyncObjects: shouldSyncCanvasObjects,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const active = canvas?.getActiveObject();
    if (canvas && active && applySelectionControlStyle(canvas, active))
      canvas.requestRenderAll();
  }, [fabric.fitScale, zoom]);

  useEffect(() => {
    activeToolRef.current = activeTool;
    syncObjects()
  }, [activeTool, syncObjects]);

  return {
    canvasRef,
    suppressHistoryRef,
    cropObjectRef,
    cropOriginalSnapshotRef,
    imageObjectRef,
    imageSourceRef,
    selectedFilterRef,
    filterIntensityRef,
    backgroundRemovedRef,
    backgroundColorRef,
    activeToolRef,
    imageResizeLocked,
    toggleImageResizeLock,
    userEditedBeforeDraftLoadRef,
    markUserInteractionBeforeDraftLoad,
    serializeEditorSnapshot,
    syncObjects,
    syncSelection,
    history,
    fabric,
  };
}
