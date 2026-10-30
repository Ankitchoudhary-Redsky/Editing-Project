import { useEffect, useRef } from 'react'
import { type FabricObject, type TPointerEvent } from 'fabric'
import { shapeNames } from '../model/constants'
import { buildShapeObject, constrainShapeToImage } from '../operations/shapeObjects'
import { getImageBounds } from '../operations/tableGeometry'
import type { UseShapeDrawingOptions } from '../model/types'

export function useShapeDrawing({
  canvas: canvasInstance,
  canvasRef,
  imageObjectRef,
  activeTool,
  hasDocument,
  shapeKind,
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
  } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const drawing = activeTool === 'shapes'
    canvas.selection = !drawing
    canvas.skipTargetFind = false
    canvas.defaultCursor = drawing ? 'crosshair' : 'default'
    canvas.hoverCursor = 'move'

    const handlePointerDown = (event: { e: TPointerEvent }) => {
      if (!drawing || !hasDocument || canvas.findTarget(event.e)) return
      const bounds = getImageBounds(canvas, imageObjectRef.current)
      const pointer = canvas.getPointer(event.e)
      const start = {
        x: Math.max(bounds.left, Math.min(bounds.left + bounds.width, pointer.x)),
        y: Math.max(bounds.top, Math.min(bounds.top + bounds.height, pointer.y)),
      }
      shapeDrawingRef.current = { start, preview: null }
      suppressHistoryRef.current = true
      const preview = buildShapeObject({
        kind: shapeKind,
        fill: fillColor,
        transparentFill,
        stroke: strokeColor,
        strokeWidth,
        opacity: shapeOpacity,
        name: shapeNames[shapeKind],
      }, { left: start.x, top: start.y, width: 1, height: 1 })
      shapeDrawingRef.current.preview = preview
      canvas.add(preview)
      canvas.requestRenderAll()
    }

    const handlePointerMove = (event: { e: TPointerEvent }) => {
      const drawingState = shapeDrawingRef.current
      if (!drawing || !drawingState) return
      const bounds = getImageBounds(canvas, imageObjectRef.current)
      const pointer = canvas.getPointer(event.e)
      const point = {
        x: Math.max(bounds.left, Math.min(bounds.left + bounds.width, pointer.x)),
        y: Math.max(bounds.top, Math.min(bounds.top + bounds.height, pointer.y)),
      }
      const left = Math.min(drawingState.start.x, point.x)
      const top = Math.min(drawingState.start.y, point.y)
      const width = Math.max(1, Math.abs(point.x - drawingState.start.x))
      const height = Math.max(1, Math.abs(point.y - drawingState.start.y))
      if (drawingState.preview) canvas.remove(drawingState.preview)
      const preview = buildShapeObject({
        kind: shapeKind,
        fill: fillColor,
        transparentFill,
        stroke: strokeColor,
        strokeWidth,
        opacity: shapeOpacity,
        name: shapeNames[shapeKind],
      }, {
        left,
        top,
        width,
        height,
        directionX: point.x < drawingState.start.x ? -1 : 1,
        directionY: point.y < drawingState.start.y ? -1 : 1,
      })
      constrainShapeToImage(canvas, imageObjectRef.current, preview)
      drawingState.preview = preview
      canvas.add(preview)
      canvas.requestRenderAll()
    }

    const handlePointerUp = () => {
      const drawingState = shapeDrawingRef.current
      if (!drawing || !drawingState) return
      shapeDrawingRef.current = null
      const preview = drawingState.preview
      if (!preview || (preview.getScaledWidth() < 4 && preview.getScaledHeight() < 4)) {
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
    }
  }, [activeTool, canvasInstance, canvasRef, fillColor, hasDocument, imageObjectRef, recordHistory, shapeKind, shapeOpacity, strokeColor, strokeWidth, suppressHistoryRef, syncObjects, transparentFill])
}
