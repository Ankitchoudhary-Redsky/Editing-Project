import { useEffect, useRef } from 'react'
import type {
  PersistedEditorDraft,
  UseEditorProjectPersistenceOptions,
} from '../model/types'
import { getImageSourceTokens, restoreImageSourceTokens } from '../model/constants'
import { loadProjectDraft, saveProjectDraft } from '../operations/projectStorage'

export function useEditorProjectPersistence({
  canvasRef,
  fabricCanvas,
  suppressHistoryRef,
  userEditedBeforeDraftLoadRef,
  draftReady,
  setDraftReady,
  historyVersion,
  pagesVersion,
  draftSettings,
  resizeSettings,
  restoreCanvasSnapshot,
  getPagesSnapshot,
  restorePages,
  restoreDraftSettings,
  restoreResize,
  initializeHistory,
  touchHistory,
  setNotice,
}: UseEditorProjectPersistenceOptions) {
  const restorationGenerationRef = useRef(0)

  useEffect(() => {
    if (!fabricCanvas) return
    let disposed = false
    const generation = ++restorationGenerationRef.current

    void loadProjectDraft<PersistedEditorDraft>()
      .then(async (draft) => {
        if (
          disposed ||
          generation !== restorationGenerationRef.current ||
          !draft ||
          userEditedBeforeDraftLoadRef.current
        ) return

        suppressHistoryRef.current = true
        if (draft.imageSources) restoreImageSourceTokens(draft.imageSources)
        await restoreCanvasSnapshot(draft)
        if (disposed || generation !== restorationGenerationRef.current) return

        restoreDraftSettings(draft, restoreResize)
        restorePages(draft.pages)
        initializeHistory(fabricCanvas)
      })
      .catch(() => {
        if (!disposed) setNotice('Saved project data could not be restored.')
      })
      .finally(() => {
        if (generation === restorationGenerationRef.current) {
          suppressHistoryRef.current = false
          if (!disposed) {
            setDraftReady(true)
            touchHistory()
          }
        }
      })

    return () => {
      disposed = true
      if (generation === restorationGenerationRef.current) {
        restorationGenerationRef.current += 1
        suppressHistoryRef.current = false
      }
    }
  }, [
    fabricCanvas,
    initializeHistory,
    restoreCanvasSnapshot,
    restorePages,
    restoreDraftSettings,
    restoreResize,
    setDraftReady,
    setNotice,
    suppressHistoryRef,
    touchHistory,
    userEditedBeforeDraftLoadRef,
  ])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!draftReady || !canvas) return

    const timer = window.setTimeout(() => {
      const draft: PersistedEditorDraft = {
        width: canvas.getWidth(),
        height: canvas.getHeight(),
        scene: canvas.toJSON(),
        pages: getPagesSnapshot(),
        imageSources: getImageSourceTokens(),
        ...draftSettings,
        resizeWidth: resizeSettings.width,
        resizeHeight: resizeSettings.height,
        keepRatio: resizeSettings.keepRatio,
        scaleArtwork: resizeSettings.scaleArtwork,
      }
      void saveProjectDraft(draft).catch(() => {
        setNotice('This project could not be saved in browser storage.')
      })
    }, 350)

    return () => window.clearTimeout(timer)
  }, [
    canvasRef,
    draftReady,
    draftSettings,
    getPagesSnapshot,
    pagesVersion,
    historyVersion,
    resizeSettings.height,
    resizeSettings.keepRatio,
    resizeSettings.scaleArtwork,
    resizeSettings.width,
    setNotice,
  ])
}