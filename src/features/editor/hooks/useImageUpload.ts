import { useRef } from 'react'
import type { UseImageUploadOptions } from '../model/types'
import { hasTransparentPixels } from '../operations/removeImageBackground'
import { loadLocalImage } from '../operations/loadLocalImage'

export function useImageUpload({
  canvasRef,
  imageObjectRef,
  imageSourceRef,
  suppressHistoryRef,
  selectedFilterRef,
  filterIntensityRef,
  backgroundRemovedRef,
  backgroundColorRef,
  resetTables,
  resetDrawing,
  setBackgroundRemoved,
  setBackgroundColor,
  setIsRemovingBackground,
  setBackgroundProgress,
  setSelectedFilter,
  setFilterIntensity,
  setDimensions,
  setHasDocument,
  setImageThumbnail,
  setBrightness,
  setContrast,
  setSaturation,
  setZoom,
  resizeDisplay,
  initializeHistory,
  syncObjects,
  setNotice,
  setDraggingFile,
  markUserInteractionBeforeDraftLoad,
}: UseImageUploadOptions) {
  const uploadRequestRef = useRef(0)

  return async function uploadFile(file?: File) {
    if (!file) return
    const requestId = ++uploadRequestRef.current
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setNotice('Choose a PNG, JPG, or WebP image.')
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      setNotice('Images must be smaller than 30 MB.')
      return
    }
    markUserInteractionBeforeDraftLoad()

    try {
      const { image, source, dimensions, thumbnail } = await loadLocalImage(file)
      if (requestId !== uploadRequestRef.current) return
      const alreadyTransparent = await hasTransparentPixels(source)
      if (requestId !== uploadRequestRef.current) return
      backgroundRemovedRef.current = alreadyTransparent
      backgroundColorRef.current = '#ffffff'
      setBackgroundRemoved(alreadyTransparent)
      setBackgroundColor('#ffffff')
      setIsRemovingBackground(false)
      setBackgroundProgress('')
      const { width, height } = dimensions
      const canvas = canvasRef.current
      if (!canvas) return

      imageSourceRef.current = source
      suppressHistoryRef.current = true
      canvas.clear()
      imageObjectRef.current = image
      resetTables()
      resetDrawing()
      canvas.setDimensions({ width, height })
      canvas.backgroundColor = 'rgba(0,0,0,0)'
      image.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
      })
      image.set('name', file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Image')
      canvas.add(image)
      canvas.sendObjectToBack(image)
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      selectedFilterRef.current = 'original'
      filterIntensityRef.current = 100
      setSelectedFilter('original')
      setFilterIntensity(100)
      setDimensions({ width, height })
      setHasDocument(true)
      setImageThumbnail(thumbnail)
      setBrightness(0)
      setContrast(0)
      setSaturation(0)
      setZoom(1)
      resizeDisplay()
      suppressHistoryRef.current = false
      initializeHistory(canvas)
      syncObjects()
    } catch (error) {
      if (requestId === uploadRequestRef.current) {
        setNotice(error instanceof Error ? error.message : 'The image could not be opened. Try another file.')
      }
    } finally {
      if (requestId === uploadRequestRef.current) {
        suppressHistoryRef.current = false
        setDraggingFile(false)
      }
    }
  }
}
