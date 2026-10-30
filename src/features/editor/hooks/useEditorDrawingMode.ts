import { useEffect } from 'react'
import { PencilBrush } from 'fabric'
import type { UseEditorDrawingModeOptions } from '../model/types'

export function useEditorDrawingMode({
  canvasRef,
  activeTool,
  activeDrawingMode,
  hasImage,
}: UseEditorDrawingModeOptions) {
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const isDrawingMode = activeTool === 'draw-remove' && hasImage && activeDrawingMode === 'lasso'
    if (activeTool === 'draw-remove') {
      canvas.discardActiveObject()
      canvas.requestRenderAll()
    }
    canvas.isDrawingMode = isDrawingMode
    canvas.selection = activeTool !== 'draw-remove'
    canvas.skipTargetFind = activeTool === 'draw-remove'
    if (isDrawingMode) {
      const brush = new PencilBrush(canvas)
      brush.color = '#3984ff'
      brush.width = 2
      canvas.freeDrawingBrush = brush
    }
    return () => {
      canvas.isDrawingMode = false
      canvas.selection = true
      canvas.skipTargetFind = false
    }
  }, [canvasRef, activeTool, activeDrawingMode, hasImage])
}