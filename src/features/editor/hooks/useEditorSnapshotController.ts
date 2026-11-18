import { useCallback } from 'react'
import type { EditorSnapshot, UseEditorSnapshotControllerOptions } from '../model/types'
import { DEFAULT_PAGE_HEIGHT, DEFAULT_PAGE_WIDTH, IMAGE_SOURCE_TOKEN, resolveImageSourceToken } from '../model/constants'
import { fitBaseImageInsideCanvas } from '../operations/loadLocalImage'
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
    const needsLegacyImageFit = snapshot.width !== DEFAULT_PAGE_WIDTH || snapshot.height !== DEFAULT_PAGE_HEIGHT
    canvas.setDimensions({ width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT })
    await canvas.loadFromJSON(restoreScene(snapshot))
    if (canvasRef.current !== canvas) return
    if (needsLegacyImageFit)
      fitBaseImageInsideCanvas(canvas, DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT)
    restoreTables(canvas)
    void restartAnimatedStickers(canvas)
    canvas.requestRenderAll()
    setDimensions({ width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT })
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
    setHasDocument(canvas.getObjects().length > 0)
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
    setImageThumbnail,
    setHasDocument,
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