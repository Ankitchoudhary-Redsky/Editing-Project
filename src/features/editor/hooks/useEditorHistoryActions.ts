import { useCallback, useRef } from 'react'
import type { EditorSnapshot, UseEditorHistoryActionsOptions } from '../model/types'
import { restartAnimatedStickers } from '../operations/animatedStickerPlayback'

export function useEditorHistoryActions({
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
}: UseEditorHistoryActionsOptions) {
  const restoreQueueRef = useRef(Promise.resolve())

  const restoreSnapshotAtIndex = useCallback(async (index: number) => {
    const canvas = canvasRef.current
    const serializedSnapshot = historyRef.current[index]
    if (!canvas || !serializedSnapshot) return

    const restore = restoreQueueRef.current.then(async () => {
      if (canvasRef.current !== canvas) return
      suppressHistoryRef.current = true
      try {
        const snapshot = JSON.parse(serializedSnapshot) as EditorSnapshot
        canvas.setDimensions({ width: snapshot.width, height: snapshot.height })
        await canvas.loadFromJSON(restoreScene(snapshot))
        if (canvasRef.current !== canvas) return
        restoreTables(canvas)
        void restartAnimatedStickers(canvas)
        canvas.requestRenderAll()

        setDimensions({ width: snapshot.width, height: snapshot.height })
        const restoredBackgroundRemoved = snapshot.editor?.backgroundRemoved ?? false
        const restoredBackgroundColor = snapshot.editor?.backgroundColor ?? '#ffffff'
        backgroundRemovedRef.current = restoredBackgroundRemoved
        backgroundColorRef.current = restoredBackgroundColor
        setBackgroundRemoved(restoredBackgroundRemoved)
        setBackgroundColor(restoredBackgroundColor)

        const restoredFilter = snapshot.editor?.filterId ?? 'original'
        const restoredIntensity = snapshot.editor?.filterIntensity ?? 100
        selectedFilterRef.current = restoredFilter
        filterIntensityRef.current = restoredIntensity
        setSelectedFilter(restoredFilter)
        setFilterIntensity(restoredIntensity)

        resizeDisplay()
        syncObjects()
        setImageThumbnail(imageObjectRef.current
          ? canvas.toDataURL({ format: 'png', multiplier: 0.12 })
          : '')
        setHasDocument(Boolean(imageObjectRef.current))
        syncHistoryControls()
        touchHistory()
      } finally {
        suppressHistoryRef.current = false
      }
    })
    restoreQueueRef.current = restore.catch(() => {})
    await restore
  }, [
    backgroundColorRef,
    backgroundRemovedRef,
    canvasRef,
    filterIntensityRef,
    historyRef,
    imageObjectRef,
    resizeDisplay,
    restoreScene,
    restoreTables,
    selectedFilterRef,
    setBackgroundColor,
    setBackgroundRemoved,
    setDimensions,
    setFilterIntensity,
    setHasDocument,
    setImageThumbnail,
    setSelectedFilter,
    suppressHistoryRef,
    syncHistoryControls,
    syncObjects,
    touchHistory,
  ])

  const undo = useCallback(async () => {
    if (historyTimerRef.current) recordHistory(true)
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    await restoreSnapshotAtIndex(historyIndexRef.current)
  }, [historyIndexRef, historyTimerRef, recordHistory, restoreSnapshotAtIndex])

  const redo = useCallback(async () => {
    if (historyTimerRef.current) recordHistory(true)
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    await restoreSnapshotAtIndex(historyIndexRef.current)
  }, [historyIndexRef, historyRef, historyTimerRef, recordHistory, restoreSnapshotAtIndex])

  return { undo, redo }
}