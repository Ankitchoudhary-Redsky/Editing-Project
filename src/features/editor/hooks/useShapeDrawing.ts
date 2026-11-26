import { useEffect, useRef } from 'react'
import { type FabricObject, type TPointerEvent } from 'fabric'
import { BACKGROUND_IMAGE_NAME, shapeNames } from '../model/constants'
import { buildShapeObject, constrainShapeToCanvas, updateShapeObject } from '../operations/shapeObjects'
import { EditableThreeDShape } from '../operations/EditableThreeDShape'
import { threeDShapeChoices } from '../operations/threeDShapes'
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
    hasDragged: boolean
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const shapeToolActive = activeTool === "shapes";
    const drawing = shapeToolActive && shapeToolMode === '2d'
    const drawingThreeD = shapeToolActive && shapeToolMode === '3d'
    const drawingActive = drawing || drawingThreeD
    let isCreatingShape = false
    let pointerDownTarget: FabricObject | null = null
    let imageWasSelectedAtPointerDown = false
    let pointerStartedOnImage = false
    let temporarilyDisabledImage: FabricObject | null = null
    const isDrawingEnabled = () => {
    const canvasState = canvas as typeof canvas & {
      isDrawingThreeDShape?: boolean
    }
    if (!drawingActive) return false
    if (drawing) return true
    return drawingThreeD && canvasState.isDrawingThreeDShape === true
  }

    const restoreImageTargeting = () => {
      if (!temporarilyDisabledImage) return
      const locked = temporarilyDisabledImage.get('layerLocked') === true
      temporarilyDisabledImage.set({
        selectable: !locked,
        evented: !locked,
        hasControls: !locked,
        hoverCursor: 'move',
      })
      temporarilyDisabledImage.setCoords()
      temporarilyDisabledImage = null
    }

    const resetPointerState = () => {
      pointerDownTarget = null
      pointerStartedOnImage = false
      imageWasSelectedAtPointerDown = false
      temporarilyDisabledImage = null
    }
    const isBackgroundImage = (object: FabricObject) => object === imageObjectRef.current || object.get('name') === BACKGROUND_IMAGE_NAME
    if (drawingActive) {
      const activeObject = canvas.getActiveObject()
      if (activeObject && isBackgroundImage(activeObject)) {
        canvas.discardActiveObject()
        canvas.requestRenderAll()
      }
    }
    const handleNativeMouseDown = (event: Event) => {
      if (!isDrawingEnabled()) return
      const target = canvas.findTarget(event as TPointerEvent)
      pointerDownTarget = target ?? null
      pointerStartedOnImage = !!target && isBackgroundImage(target)
      imageWasSelectedAtPointerDown = pointerStartedOnImage && canvas.getActiveObject() === target
      if (pointerStartedOnImage && !imageWasSelectedAtPointerDown) {
        target!.set({
          selectable: false,
          evented: false,
          hasControls: false,
        })
        target!.setCoords()
        temporarilyDisabledImage = target ?? null
      }
    }
    if (drawingActive) {
      canvas.upperCanvasEl.addEventListener(
        'mousedown',
        handleNativeMouseDown,
        true
      )

      canvas.upperCanvasEl.addEventListener(
        'touchstart',
        handleNativeMouseDown,
        true
      )
    }
    const handleShapeHover = (event: { e: TPointerEvent }) => {
      if (!isDrawingEnabled()) return

      const target = canvas.findTarget(event.e)

      if (target && !isBackgroundImage(target)) {
        canvas.setCursor('move')
      } else {
        canvas.setCursor('crosshair')
      }
    }
    
    canvas.selection = true;
    canvas.skipTargetFind = false;
    canvas.defaultCursor = drawingActive ? "crosshair" : "default";
    canvas.hoverCursor = "move";
    canvas.requestRenderAll()
    const setImageDrawingTargeting = (object: FabricObject) => {
      const locked = object.get('layerLocked') === true
      object.set({
        selectable: !locked,
        evented: !locked,
      })

      if (isBackgroundImage(object)) {
        object.set({
          hasControls: !locked,
          hoverCursor: 'move',
        })
      }
      object.setCoords()
    }
    canvas.getObjects().forEach(setImageDrawingTargeting)
    const handleObjectAdded = (event: { target?: FabricObject }) => {
      if (event.target) setImageDrawingTargeting(event.target)
    }
    canvas.on('object:added', handleObjectAdded)
 
    const handlePointerDown = (event: { e: TPointerEvent }) => {
      if (!isDrawingEnabled()) return
      const target = pointerDownTarget
      if (pointerStartedOnImage && imageWasSelectedAtPointerDown) {
        return
      }
      if (target && !isBackgroundImage(target)) {
        return
      }
      isCreatingShape = true

      const pointer = canvas.getPointer(event.e)
      const start = {
        x: Math.max(0, Math.min(canvas.getWidth(), pointer.x)),
        y: Math.max(0, Math.min(canvas.getHeight(), pointer.y)),
      };
      const drawingState = {
        start,
        preview: null as FabricObject | null,
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
      if (!isDrawingEnabled() || !drawingState || !isCreatingShape) return
      const bounds = {
        left: 0,
        top: 0,
        width: canvas.getWidth(),
        height: canvas.getHeight(),
      }
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
      constrainShapeToCanvas(canvas, drawingState.preview)
      canvas.requestRenderAll()
    }

    const handlePointerUp = () => {
      const drawingState = shapeDrawingRef.current

  if (!isDrawingEnabled()) {
    isCreatingShape = false

    if (drawingState?.preview) {
      canvas.remove(drawingState.preview)
    }

    shapeDrawingRef.current = null
    restoreImageTargeting()
    resetPointerState()
    suppressHistoryRef.current = false
    canvas.requestRenderAll()
    return
  }
      restoreImageTargeting()
      if (pointerStartedOnImage && imageWasSelectedAtPointerDown) {
        resetPointerState()
        return
      }
      if (!drawingState) {
        resetPointerState()
        return
      }
      isCreatingShape = false
      shapeDrawingRef.current = null

      const preview = drawingState.preview;
      if (
        !preview || !drawingState.hasDragged ||
        (preview.getScaledWidth() < 4 && preview.getScaledHeight() < 4)
      ) {
        if (preview) canvas.remove(preview);
      if (
        pointerStartedOnImage &&
        pointerDownTarget &&
        pointerDownTarget.get('layerLocked') !== true
      ) {
        canvas.setActiveObject(pointerDownTarget)
      }

        suppressHistoryRef.current = false;
        resetPointerState()
        canvas.requestRenderAll();
        return;
      }
      preview.set({ selectable: true, evented: true });
      canvas.setActiveObject(preview);
      canvas.requestRenderAll();
      suppressHistoryRef.current = false;
      recordHistory(true);
      syncObjects();
      resetPointerState()
    };

    canvas.on("mouse:down", handlePointerDown);
    canvas.on("mouse:move", handlePointerMove);
    canvas.on('mouse:move', handleShapeHover);
    canvas.on("mouse:up", handlePointerUp);
    return () => {
      canvas.off('mouse:down', handlePointerDown)
      canvas.off('mouse:move', handlePointerMove)
      canvas.off('mouse:move', handleShapeHover)
      canvas.off('mouse:up', handlePointerUp)
      canvas.off('object:added', handleObjectAdded)
      if (drawingActive) {
        canvas.upperCanvasEl.removeEventListener(
          'mousedown',
          handleNativeMouseDown,
          true
        )
        canvas.upperCanvasEl.removeEventListener(
          'touchstart',
          handleNativeMouseDown,
          true
        )
      }
      restoreImageTargeting()
      resetPointerState()
      if (shapeDrawingRef.current?.preview) canvas.remove(shapeDrawingRef.current.preview)
      shapeDrawingRef.current = null
      suppressHistoryRef.current = false
      canvas.skipTargetFind = false
      canvas.selection = true
      canvas.requestRenderAll()
      canvas.getObjects().forEach((object) => {
        if(!isBackgroundImage(object)) return
        const locked = object.get('layerLocked') === true
        object.set({ selectable: !locked, evented: !locked, hasControls: !locked })
      })
    }
  }, [activeTool, canvasInstance, canvasRef, fillColor, hasDocument, imageObjectRef, lineStyle, recordHistory, setActiveTool, shapeKind, shapeOpacity, shapeToolMode, strokeColor, strokeWidth, suppressHistoryRef, syncObjects, threeDShapeKind, transparentFill])
}
