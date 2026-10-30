import { useCallback, useRef } from 'react'
import { BACKGROUND_IMAGE_NAME } from '../model/constants'
import { loadLocalImage } from '../operations/loadLocalImage'
import { removeImageBackground } from '../operations/removeImageBackground'
import type { ImageBackgroundState, UseImageBackgroundOptions } from '../model/types'

export function useImageBackground({
  canvasRef,
  imageObjectRef,
  imageSourceRef,
  backgroundRemovedRef,
  backgroundColorRef,
  backgroundRemoved,
  isRemovingBackground,
  backgroundProgress,
  backgroundColor,
  setBackgroundRemoved,
  setIsRemovingBackground,
  setBackgroundProgress,
  setBackgroundColor,
  recordHistory,
  syncObjects,
  setNotice,
}: UseImageBackgroundOptions) {
  const removalRequestRef = useRef(0)

  const remove = async () => {
    const canvas = canvasRef.current
    const image = imageObjectRef.current
    if (!canvas || !image || isRemovingBackground || backgroundRemovedRef.current) return
    const requestId = ++removalRequestRef.current

    setIsRemovingBackground(true)
    setBackgroundProgress('Preparing AI model...')
    try {
      const source = imageSourceRef.current
      if (!source) throw new Error('The original image source is unavailable.')
      const resultSource = await removeImageBackground(source, setBackgroundProgress)
      if (
        requestId !== removalRequestRef.current ||
        canvasRef.current !== canvas ||
        imageObjectRef.current !== image ||
        imageSourceRef.current !== source
      ) return
      await image.setSrc(resultSource)
      if (
        requestId !== removalRequestRef.current ||
        canvasRef.current !== canvas ||
        imageObjectRef.current !== image
      ) return
      image.applyFilters()
      canvas.getObjects()
        .filter((item) => item.get('name') === BACKGROUND_IMAGE_NAME)
        .forEach((item) => canvas.remove(item))
      canvas.backgroundColor = 'rgba(0,0,0,0)'
      backgroundRemovedRef.current = true
      setBackgroundRemoved(true)
      canvas.setActiveObject(image)
      canvas.requestRenderAll()
      recordHistory(true)
      syncObjects()
      setNotice('Background removed successfully.')
    } catch (error) {
      if (requestId === removalRequestRef.current) {
        setNotice(error instanceof Error ? error.message : 'Background removal failed. Please try again.')
      }
    } finally {
      if (requestId === removalRequestRef.current) {
        setIsRemovingBackground(false)
        setBackgroundProgress('')
      }
    }
  }

  const setColor = (color: string) => {
    backgroundColorRef.current = color
    setBackgroundColor(color)
    const canvas = canvasRef.current
    if (!canvas || !backgroundRemovedRef.current) return
    canvas.getObjects()
      .filter((item) => item.get('name') === BACKGROUND_IMAGE_NAME)
      .forEach((item) => canvas.remove(item))
    canvas.backgroundColor = color
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const uploadBackground = async (file?: File) => {
    if (!file) return
    if (!backgroundRemovedRef.current) {
      setNotice('Remove the original background first.')
      return
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setNotice('Choose a PNG, JPG, or WebP background image.')
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      setNotice('Background images must be smaller than 30 MB.')
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    try {
      const { image } = await loadLocalImage(file)
      canvas.getObjects()
        .filter((item) => item.get('name') === BACKGROUND_IMAGE_NAME)
        .forEach((item) => canvas.remove(item))
      const originalWidth = image.width ?? 0
      const originalHeight = image.height ?? 0
      if (!originalWidth || !originalHeight) {
        throw new Error('The background image has invalid dimensions.')
      }

      image.set({
        name: BACKGROUND_IMAGE_NAME,
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        scaleX: canvas.getWidth() / originalWidth,
        scaleY: canvas.getHeight() / originalHeight,
        selectable: false,
        evented: false,
      })
      canvas.backgroundColor = 'rgba(0,0,0,0)'
      canvas.add(image)
      canvas.sendObjectToBack(image)
      const subject = imageObjectRef.current
      if (subject) canvas.bringObjectToFront(subject)
      canvas.requestRenderAll()
      recordHistory(true)
      syncObjects()
      setNotice('Custom background applied.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load the background image.')
    }
  }

  const clearBackground = () => {
    const canvas = canvasRef.current
    if (!canvas || !backgroundRemovedRef.current) return
    canvas.getObjects()
      .filter((item) => item.get('name') === BACKGROUND_IMAGE_NAME)
      .forEach((item) => canvas.remove(item))
    canvas.backgroundColor = 'rgba(0,0,0,0)'
    canvas.requestRenderAll()
    recordHistory(true)
    syncObjects()
    setNotice('Background is now transparent.')
  }

  const reset = async () => {
    const canvas = canvasRef.current
    const image = imageObjectRef.current
    const source = imageSourceRef.current
    if (!canvas || !image || !source || !backgroundRemovedRef.current) return

    try {
      await image.setSrc(source)
      image.applyFilters()
      canvas.getObjects()
        .filter((item) => item.get('name') === BACKGROUND_IMAGE_NAME)
        .forEach((item) => canvas.remove(item))
      canvas.backgroundColor = 'rgba(0,0,0,0)'
      backgroundRemovedRef.current = false
      backgroundColorRef.current = '#ffffff'
      setBackgroundRemoved(false)
      setBackgroundColor('#ffffff')
      canvas.setActiveObject(image)
      canvas.requestRenderAll()
      recordHistory(true)
      syncObjects()
      setNotice('Original image restored.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Original image could not be restored.')
    }
  }

  const restore = useCallback((removed: boolean, color: string) => {
    backgroundRemovedRef.current = removed
    backgroundColorRef.current = color
    setBackgroundRemoved(removed)
    setBackgroundColor(color)
  }, [backgroundColorRef, backgroundRemovedRef, setBackgroundColor, setBackgroundRemoved])

  const state: ImageBackgroundState = {
    removed: backgroundRemoved,
    isRemoving: isRemovingBackground,
    progress: backgroundProgress,
    color: backgroundColor,
  }

  return {
    ...state,
    remove,
    setColor,
    uploadBackground,
    clearBackground,
    reset,
    restore,
  }
}
