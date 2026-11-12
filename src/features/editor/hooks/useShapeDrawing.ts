import { useEffect, useRef } from 'react'
import { type FabricObject, type TPointerEvent } from 'fabric'
import { BACKGROUND_IMAGE_NAME, shapeNames } from '../model/constants'
import { buildShapeObject, constrainShapeToImage, updateShapeObject } from '../operations/shapeObjects'
import { EditableThreeDShape } from '../operations/EditableThreeDShape'
import { getImageBounds } from '../operations/tableGeometry'
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
    start: { x: number; y: number }
    preview: FabricObject | null
    backgroundTarget: FabricObject | null
    pendingBackgroundClick: boolean
    hasDragged: boolean
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const shapeToolActive = activeTool === 'shapes'
    const drawing = shapeToolActive && shapeToolMode === '2d'
    const drawingThreeD = shapeToolActive && shapeToolMode === '3d'
    const drawingActive = drawing || drawingThreeD
    canvas.selection = !shapeToolActive || shapeToolMode === '2d'
    canvas.skipTargetFind = false
    canvas.defaultCursor = drawing ? 'crosshair' : 'default'
    canvas.hoverCursor = 'move'
    const backgroundLayers = canvas.getObjects().filter((object) => object.get('name') === BACKGROUND_IMAGE_NAME)
    backgroundLayers.forEach((object) => {
      const locked = object.get('layerLocked') === true
      object.set({
        selectable: !drawingActive && !locked,
        evented: !locked,
        lockMovementX: drawingActive || locked,
        lockMovementY: drawingActive || locked,
        lockScalingX: drawingActive || locked,
        lockScalingY: drawingActive || locked,
        lockRotation: drawingActive || locked,
      })
    })
    if (drawingActive && backgroundLayers.some((object) => canvas.getActiveObject() === object)) {
      canvas.discardActiveObject()
    }
    canvas.requestRenderAll()

    const handlePointerDown = (event: { e: TPointerEvent }) => {
      const target = canvas.findTarget(event.e)
      if ((!drawing && !drawingThreeD) || !hasDocument) return
      if (target && target.get('name') !== BACKGROUND_IMAGE_NAME) {
        return
      }
      const backgroundTarget = target?.get('name') === BACKGROUND_IMAGE_NAME ? target : null
      if (backgroundTarget) {
        canvas.discardActiveObject()
      }
      const bounds = getImageBounds(canvas, imageObjectRef.current)
      const pointer = canvas.getPointer(event.e)
      const start = {
        x: Math.max(bounds.left, Math.min(bounds.left + bounds.width, pointer.x)),
        y: Math.max(bounds.top, Math.min(bounds.top + bounds.height, pointer.y)),
      }
      shapeDrawingRef.current = {
        start,
        preview: null,
        backgroundTarget,
        pendingBackgroundClick: Boolean(backgroundTarget),
        hasDragged: false,
      }
      suppressHistoryRef.current = true
      const preview = drawing
        ? buildShapeObject({
          kind: shapeKind,
          fill: fillColor,
          transparentFill,
          stroke: strokeColor,
          strokeWidth,
          opacity: shapeOpacity,
          name: shapeNames[shapeKind],
          lineStyle,
        }, { left: start.x - 3, top: start.y - 3, width: 6, height: 6 })
        : new EditableThreeDShape({
          left: start.x,
          top: start.y,
          width: 6,
          height: 6,
          name: `3D ${threeDShapeChoices.find((choice) => choice.kind === threeDShapeKind)?.label ?? threeDShapeKind}`,
          threeDKind: threeDShapeKind,
        })
      preview.set({ selectable: false, evented: false })
      constrainShapeToImage(canvas, imageObjectRef.current, preview)
      shapeDrawingRef.current.preview = preview
      canvas.add(preview)
      canvas.requestRenderAll()
    }

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
      if (drawingState.pendingBackgroundClick) {
        if (dragDistance >= 4) {
          drawingState.pendingBackgroundClick = false
        }
      }
      if (dragDistance >= 4) drawingState.hasDragged = true
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
      const drawingState = shapeDrawingRef.current
      if ((!drawing && !drawingThreeD) || !drawingState) return
      shapeDrawingRef.current = null
      if (drawingState.pendingBackgroundClick && drawingState.backgroundTarget) {
        if (drawingState.preview) canvas.remove(drawingState.preview)
        const background = drawingState.backgroundTarget
        background.set({
          selectable: true,
          evented: true,
          lockMovementX: false,
          lockMovementY: false,
          lockScalingX: false,
          lockScalingY: false,
          lockRotation: false,
        })
        canvas.setActiveObject(background)
        canvas.requestRenderAll()
        suppressHistoryRef.current = false
        setActiveTool('layers')
        return
      }
      const preview = drawingState.preview
      if (!preview || !drawingState.hasDragged || (preview.getScaledWidth() < 4 && preview.getScaledHeight() < 4)) {
        if (preview) canvas.remove(preview)
        suppressHistoryRef.current = false
        canvas.requestRenderAll()
        return
      }
      preview.set({ selectable: true, evented: true })
      canvas.setActiveObject(preview)
      canvas.requestRenderAll()
      suppressHistoryRef.current = false
      recordHistory(true)
      syncObjects()
    }

    canvas.on('mouse:down', handlePointerDown)
    canvas.on('mouse:move', handlePointerMove)
    canvas.on('mouse:up', handlePointerUp)
    return () => {
      canvas.off('mouse:down', handlePointerDown)
      canvas.off('mouse:move', handlePointerMove)
      canvas.off('mouse:up', handlePointerUp)
      if (shapeDrawingRef.current?.preview) canvas.remove(shapeDrawingRef.current.preview)
      shapeDrawingRef.current = null
      suppressHistoryRef.current = false
      canvas.skipTargetFind = false
      canvas.selection = true
      backgroundLayers.forEach((object) => {
        const locked = object.get('layerLocked') === true
        object.set({
          selectable: !locked,
          evented: !locked,
          lockMovementX: locked,
          lockMovementY: locked,
          lockScalingX: locked,
          lockScalingY: locked,
          lockRotation: locked,
        })
      })
      canvas.requestRenderAll()
    }
  }, [activeTool, canvasInstance, canvasRef, fillColor, hasDocument, imageObjectRef, lineStyle, recordHistory, setActiveTool, shapeKind, shapeOpacity, shapeToolMode, strokeColor, strokeWidth, suppressHistoryRef, syncObjects, threeDShapeKind, transparentFill])
}
