import { useEffect, useRef } from 'react'
import { type FabricObject, type TPointerEvent } from 'fabric'
import { BACKGROUND_IMAGE_NAME, shapeNames } from '../model/constants'
import { buildShapeObject, constrainShapeToImage, updateShapeObject } from '../operations/shapeObjects'
import { EditableThreeDShape } from '../operations/EditableThreeDShape'
import { threeDShapeChoices } from '../operations/threeDShapes'
import { getImageBounds } from '../operations/tableGeometry'
import type { UseShapeDrawingOptions } from '../model/types'

export function useShapeDrawing({
  canvas: canvasInstance,
  canvasRef,
  imageObjectRef,
  activeTool,
  shapeToolMode,
  setActiveTool,
  hasDocument,
  shapeKind,
  threeDShapeKind,
  lineStyle,
  fillColor,
  transparentFill,
  strokeColor,
  strokeWidth,
  shapeOpacity,
  suppressHistoryRef,
  recordHistory,
  syncObjects,
}: UseShapeDrawingOptions) {
  const shapeDrawingRef = useRef<{
    start: { x: number; y: number };
    preview: FabricObject | null;
    backgroundTarget: FabricObject | null
    pendingBackgroundClick: boolean
    hasDragged: boolean
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shapeToolActive = activeTool === "shapes";
    const drawing = shapeToolActive && shapeToolMode === '2d'
    const drawingThreeD = shapeToolActive && shapeToolMode === '3d'
    const drawingActive = drawing || drawingThreeD
    ;(canvas as typeof canvas & { isDrawingThreeDShape?: boolean }).isDrawingThreeDShape = drawingThreeD
    canvas.selection = !drawingActive;
    canvas.skipTargetFind = drawing;
    if (drawingActive) canvas.discardActiveObject();
    canvas.defaultCursor = drawingActive ? "crosshair" : "default";
    canvas.hoverCursor =  drawingActive ? "crosshair" :'move' 
    canvas.requestRenderAll()
    const isBackgroundImage = (object: FabricObject) =>
      object === imageObjectRef.current || object.get('name') === BACKGROUND_IMAGE_NAME
    const setImageDrawingTargeting = (object: FabricObject) => {
      if (!isBackgroundImage(object)) return
      const locked = object.get('layerLocked') === true
      object.set({
        selectable: !drawingActive && !locked,
        evented: !locked,
      })
    }
    canvas.getObjects().forEach(setImageDrawingTargeting)
    const handleObjectAdded = (event: { target?: FabricObject }) => {
      if (event.target) setImageDrawingTargeting(event.target)
    }
    canvas.on('object:added', handleObjectAdded)
    if (drawingActive && canvas.getActiveObject() && isBackgroundImage(canvas.getActiveObject()!)) {
      canvas.discardActiveObject()
    }
 
    const handlePointerDown = (event: { e: TPointerEvent }) => {
      if ((!drawing && !drawingThreeD) || !hasDocument) return
      const target = canvas.findTarget(event.e)
      if (target && !isBackgroundImage(target)) return
      const backgroundTarget = target && isBackgroundImage(target)
        ? target
        : target ? null : imageObjectRef.current
 
      const bounds = getImageBounds(canvas, imageObjectRef.current)
      const pointer = canvas.getPointer(event.e)
      const start = {
        x: Math.max(bounds.left, Math.min(bounds.left + bounds.width, pointer.x)),
        y: Math.max(bounds.top, Math.min(bounds.top + bounds.height, pointer.y)),
      };
      const drawingState = {
        start,
        preview: null as FabricObject | null,
        backgroundTarget,
        pendingBackgroundClick: Boolean(backgroundTarget),
        hasDragged: false,
      }
      shapeDrawingRef.current = drawingState
      suppressHistoryRef.current = true;
      const selectedThreeDShape = threeDShapeChoices.find((shape) => shape.kind === threeDShapeKind)
      const preview = drawingThreeD
        ? new EditableThreeDShape({
          left: start.x,
          top: start.y,
          width: 1,
          height: 1,
          threeDKind: threeDShapeKind,
          threeDColor: selectedThreeDShape?.color,
          name: `3D ${selectedThreeDShape?.label ?? threeDShapeKind}`,
        })
        : buildShapeObject(
          {
            kind: shapeKind,
            fill: fillColor,
            transparentFill,
            stroke: strokeColor,
            strokeWidth,
            opacity: shapeOpacity,
            name: shapeNames[shapeKind],
            lineStyle,
          },
          { left: start.x, top: start.y, width: 1, height: 1 },
        );
      drawingState.preview = preview
      canvas.add(preview);
      canvas.requestRenderAll();
    };

    const handlePointerMove = (event: { e: TPointerEvent }) => {
      const drawingState = shapeDrawingRef.current
      if ((!drawing && !drawingThreeD) || !drawingState) return
      const bounds = getImageBounds(canvas, imageObjectRef.current)
      const pointer = canvas.getPointer(event.e)
      let point = {
        x: Math.max(bounds.left, Math.min(bounds.left + bounds.width, pointer.x)),
        y: Math.max(bounds.top, Math.min(bounds.top + bounds.height, pointer.y)),
      }
      const directionX = point.x < drawingState.start.x ? -1 : 1
      const directionY = point.y < drawingState.start.y ? -1 : 1
      if (event.e.shiftKey || shapeKind === 'circle' || shapeKind === 'square') {
        const availableWidth = directionX < 0 ? drawingState.start.x - bounds.left : bounds.left + bounds.width - drawingState.start.x
        const availableHeight = directionY < 0 ? drawingState.start.y - bounds.top : bounds.top + bounds.height - drawingState.start.y
        const size = Math.min(Math.max(Math.abs(point.x - drawingState.start.x), Math.abs(point.y - drawingState.start.y)), availableWidth, availableHeight)
        point = { x: drawingState.start.x + directionX * size, y: drawingState.start.y + directionY * size }
      }
      const dragDistance = Math.hypot(point.x - drawingState.start.x, point.y - drawingState.start.y)
      if (dragDistance >= 7) {
        drawingState.hasDragged = true
        drawingState.pendingBackgroundClick = false
      }
      const left = Math.min(drawingState.start.x, point.x)
      const top = Math.min(drawingState.start.y, point.y)
      const width = Math.max(1, Math.abs(point.x - drawingState.start.x))
      const height = Math.max(1, Math.abs(point.y - drawingState.start.y))
      if (!drawingState.preview) return
      if (drawingState.preview instanceof EditableThreeDShape) {
        drawingState.preview.set({ left: left + width / 2, top: top + height / 2, width, height })
        drawingState.preview.setCoords()
        drawingState.preview.dirty = true
      } else {
        updateShapeObject(drawingState.preview, {
          left,
          top,
          width,
          height,
          directionX,
          directionY,
        }, shapeKind)
      }
      constrainShapeToImage(canvas, imageObjectRef.current, drawingState.preview)
      canvas.requestRenderAll()
    }

    const handlePointerUp = () => {
      const drawingState = shapeDrawingRef.current;
      if ((!drawing && !drawingThreeD) || !drawingState) return;
      shapeDrawingRef.current = null;
      if (drawingState.pendingBackgroundClick && drawingState.backgroundTarget) {
        if (drawingState.preview) canvas.remove(drawingState.preview)
        const background = drawingState.backgroundTarget
        if (background.get('layerLocked') !== true) canvas.setActiveObject(background)
        canvas.requestRenderAll()
        suppressHistoryRef.current = false
        setActiveTool('layers')
        return
      }
      const preview = drawingState.preview;
      if (
        !preview || !drawingState.hasDragged ||
        (preview.getScaledWidth() < 4 && preview.getScaledHeight() < 4)
      ) {
        if (preview) canvas.remove(preview);
        suppressHistoryRef.current = false;
        canvas.requestRenderAll();
        return;
      }
      preview.set({ selectable: true, evented: true });
      canvas.setActiveObject(preview);
      canvas.requestRenderAll();
      suppressHistoryRef.current = false;
      recordHistory(true);
      syncObjects();
    };

    canvas.on("mouse:down", handlePointerDown);
    canvas.on("mouse:move", handlePointerMove);
    canvas.on("mouse:up", handlePointerUp);
    return () => {
      canvas.off('mouse:down', handlePointerDown)
      canvas.off('mouse:move', handlePointerMove)
      canvas.off('mouse:up', handlePointerUp)
      canvas.off('object:added', handleObjectAdded)
      if (shapeDrawingRef.current?.preview) canvas.remove(shapeDrawingRef.current.preview)
      shapeDrawingRef.current = null
      suppressHistoryRef.current = false
      canvas.skipTargetFind = false
      canvas.selection = true
      canvas.requestRenderAll()
      canvas.getObjects().forEach((object) => {
        if(!isBackgroundImage(object)) return
        const locked = object.get('layerLocked') === true
        object.set({ selectable: !locked, evented: !locked })
      })
    }
  }, [activeTool, canvasInstance, canvasRef, fillColor, hasDocument, imageObjectRef, lineStyle, recordHistory, setActiveTool, shapeKind, shapeOpacity, shapeToolMode, strokeColor, strokeWidth, suppressHistoryRef, syncObjects, threeDShapeKind, transparentFill])
}
