import { useCallback, useRef } from 'react'
import type { UseEditorDocumentActionsOptions } from '../model/types'
import { useImageUpload } from './useImageUpload'
import { deleteProjectDraft } from '../operations/projectStorage'

export function useEditorDocumentActions({
  uploadOptions,
  resetTables,
  resetDrawing,
  canvasRef,
  imageObjectRef,
  cropObjectRef,
  cropOriginalSnapshotRef,
  suppressHistoryRef,
  setHasImage,
  setHasDocument,
  setImageThumbnail,
  setCropActive,
  setDimensions,
  restoreResize,
  restoreBackground,
  setIsRemovingBackground,
  setBackgroundProgress,
  recordHistory,
  syncObjects,
  resizeDisplay,
  setNotice,
  setDraggingFile,
}: UseEditorDocumentActionsOptions) {
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const setUploadInputElement = useCallback((element: HTMLInputElement | null) => {
    uploadInputRef.current = element
  }, [])

  const uploadFile = useImageUpload({
    ...uploadOptions,
    resetTables,
    resetDrawing,
  })

  const deleteImage = () => {
    const canvas = canvasRef.current
    if (!canvas || !imageObjectRef.current) return

    suppressHistoryRef.current = true
    canvas.clear()
    canvas.setDimensions({ width: 1200, height: 800 })
    canvas.backgroundColor = 'rgba(0,0,0,0)'
    canvas.requestRenderAll()

    cropObjectRef.current = null
    cropOriginalSnapshotRef.current = null
    imageObjectRef.current = null
    setHasImage(false)
    setHasDocument(false)
    setImageThumbnail('')
    setCropActive(false)
    setDimensions({ width: 1200, height: 800 })
    restoreResize({ width: 1200, height: 800, keepRatio: true, scaleArtwork: true })
    restoreBackground(false, '#ffffff')
    setIsRemovingBackground(false)
    setBackgroundProgress('')
    resetDrawing()
    resetTables()

    suppressHistoryRef.current = false
    syncObjects()
    recordHistory(true)
    resizeDisplay()
    void deleteProjectDraft().catch(() => {
      setNotice('Deleted project data could not be cleared from browser storage.')
    })
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDraggingFile(false)
    void uploadFile(event.dataTransfer.files[0])
  }

  const openFilePicker = () => {
    uploadInputRef.current?.click()
  }

  return { uploadFile, deleteImage, handleDrop, openFilePicker, setUploadInputElement }
}