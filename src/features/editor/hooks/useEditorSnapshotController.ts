import { useCallback } from 'react'
import type { EditorSnapshot, UseEditorSnapshotControllerOptions } from '../model/types'
import { IMAGE_SOURCE_TOKEN, resolveImageSourceToken } from '../model/constants'
import { restartAnimatedStickers } from '../operations/animatedStickerPlayback'
import { useCanvasTransforms } from './useCanvasTransforms'
import { useEditorHistoryActions } from './useEditorHistoryActions'

export function useEditorSnapshotController({
  canvasRef,
  imageObjectRef,
  imageSourceRef,
  cropObjectRef,
  cropOriginalSnapshotRef,
  suppressHistoryRef,
  historyRef,
  historyIndexRef,
  historyTimerRef,
  backgroundRemovedRef,
  backgroundColorRef,
  selectedFilterRef,
  filterIntensityRef,
  serializeEditorSnapshot,
  restoreTables,
  restoreBackground,
  recordHistory,
  resizeDisplay,
  syncObjects,
  syncHistoryControls,
  touchHistory,
  setDimensions,
  setHasDocument,
  setImageThumbnail,
  setBackgroundRemoved,
  setBackgroundColor,
  setSelectedFilter,
  setFilterIntensity,
  hasDocument,
  dimensions,
  cropActive,
  cropRotation,
  setCropActive,
  setCropRotation,
  setActiveTool,
}: UseEditorSnapshotControllerOptions) {
  const restoreScene = useCallback((snapshot: EditorSnapshot) => {
    const scene = snapshot.scene as { objects?: Array<{ src?: string }> }
    scene.objects?.forEach((object) => {
      if (object.src === IMAGE_SOURCE_TOKEN) object.src = imageSourceRef.current
      else if (typeof object.src === 'string') {
        object.src = resolveImageSourceToken(object.src) ?? object.src
      }
    })
    return scene
  }, [imageSourceRef])

  const restoreCanvasSnapshot = useCallback(async (snapshot: EditorSnapshot) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setDimensions({ width: snapshot.width, height: snapshot.height })
    await canvas.loadFromJSON(restoreScene(snapshot))
    if (canvasRef.current !== canvas) return
    restoreTables(canvas)
    void restartAnimatedStickers(canvas)
    canvas.requestRenderAll()
    setDimensions({ width: snapshot.width, height: snapshot.height })
    const restoredBackgroundRemoved = snapshot.editor?.backgroundRemoved ?? false
    const restoredBackgroundColor = snapshot.editor?.backgroundColor ?? '#ffffff'
    restoreBackground(restoredBackgroundRemoved, restoredBackgroundColor)
    const restoredFilter = snapshot.editor?.filterId ?? 'original'
    const restoredIntensity = snapshot.editor?.filterIntensity ?? 100
    selectedFilterRef.current = restoredFilter
    filterIntensityRef.current = restoredIntensity
    setSelectedFilter(restoredFilter)
    setFilterIntensity(restoredIntensity)
    resizeDisplay()
    syncObjects()
    imageSourceRef.current = imageObjectRef.current?.getSrc() ?? ''
    setHasDocument(Boolean(imageObjectRef.current))
    setImageThumbnail(imageObjectRef.current
      ? canvas.toDataURL({ format: 'png', multiplier: 0.12 })
      : '')
  }, [
    canvasRef,
    filterIntensityRef,
    imageObjectRef,
    imageSourceRef,
    resizeDisplay,
    restoreBackground,
    restoreScene,
    restoreTables,
    selectedFilterRef,
    setDimensions,
    setFilterIntensity,
    setHasDocument,
    setImageThumbnail,
    setSelectedFilter,
    syncObjects,
  ])

  const historyActions = useEditorHistoryActions({
    canvasRef,
    imageObjectRef,
    suppressHistoryRef,
    historyRef,
    historyIndexRef,
    historyTimerRef,
    backgroundRemovedRef,
    backgroundColorRef,
    selectedFilterRef,
    filterIntensityRef,
    restoreScene,
    restoreTables,
    recordHistory,
    resizeDisplay,
    syncObjects,
    syncHistoryControls,
    touchHistory,
    setDimensions,
    setBackgroundRemoved,
    setBackgroundColor,
    setSelectedFilter,
    setFilterIntensity,
    setImageThumbnail,
    setHasDocument,
  })

  const canvasTransforms = useCanvasTransforms({
    canvasRef,
    imageObjectRef,
    cropObjectRef,
    cropOriginalSnapshotRef,
    serializeSnapshot: () => serializeEditorSnapshot(canvasRef.current!),
    restoreSnapshot: async (snapshot) => {
      await restoreCanvasSnapshot(JSON.parse(snapshot) as EditorSnapshot)
    },
    hasDocument,
    dimensions,
    setDimensions,
    cropActive,
    cropRotation,
    setCropActive,
    setCropRotation,
    setActiveTool,
    suppressHistoryRef,
    recordHistory,
    syncObjects,
    resizeDisplay,
  })

  return {
    restoreScene,
    restoreCanvasSnapshot,
    restoreResize: canvasTransforms.restoreResize,
    canvasTransforms,
    ...historyActions,
  }
}