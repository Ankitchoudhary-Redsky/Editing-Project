import { useCallback, useRef } from 'react'
import type { Canvas, FabricImage } from 'fabric'
import type {
  EditPoint,
  ImageEditingTransform,
  OriginalImageState,
  UseMagicImageRemovalOptions,
} from '../model/types'
import { createImageEditingTransform, createVisibleImageCanvas, getImageBrushScale, toImagePoint } from '../operations/pixelCanvas'

export function useMagicImageRemoval({
  canvasRef,
  imageObjectRef,
  brushSizeRef,
  recordHistory,
  syncObjects,
  setNotice,
}: UseMagicImageRemovalOptions) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const livePreviewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const livePreviewContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const imageRef = useRef<FabricImage | null>(null)
  const targetCanvasRef = useRef<Canvas | null>(null)
  const transformRef = useRef<ImageEditingTransform | null>(null)
  const removalInProgressRef = useRef(false)
  const originalImageStateRef = useRef<OriginalImageState | null>(null)

  const restoreOriginalImage = useCallback((targetCanvas: Canvas | null, image: FabricImage, state: OriginalImageState) => {
    image.filters = []
    image.setElement(state.originalElement)
    image.set({
      width: state.width,
      height: state.height,
      cropX: state.cropX,
      cropY: state.cropY,
      filters: state.filters,
    })
    image.applyFilters()
    image.setCoords()
    if (targetCanvas && canvasRef.current === targetCanvas) targetCanvas.requestRenderAll()
  }, [canvasRef])

  const paintMagicRemoval = useCallback((from: EditPoint, to: EditPoint) => {
    const preview = previewCanvasRef.current
    const livePreview = livePreviewCanvasRef.current
    const contexts = [previewContextRef.current, livePreviewContextRef.current]
    const image = imageRef.current
    const targetCanvas = canvasRef.current
    const transform = transformRef.current
    if (!preview || !livePreview || contexts.some((context) => !context) || !image || !targetCanvas || !transform || targetCanvasRef.current !== targetCanvas) return

    const fromPoint = toImagePoint(image, from, transform)
    const toPoint = toImagePoint(image, to, transform)
    const scaleX = preview.width / image.width
    const scaleY = preview.height / image.height
    const fromX = fromPoint.x * scaleX
    const fromY = fromPoint.y * scaleY
    const toX = toPoint.x * scaleX
    const toY = toPoint.y * scaleY

    const lineWidth = brushSizeRef.current * getImageBrushScale(image, transform) * ((scaleX + scaleY) / 2)
    const isDot = fromPoint.x === toPoint.x && fromPoint.y === toPoint.y
    contexts.forEach((context) => {
      if (!context) return
      context.save()
      context.globalCompositeOperation = 'destination-out'
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.lineWidth = lineWidth
      context.beginPath()
      context.moveTo(fromX, fromY)
      context.lineTo(toX, toY)
      context.stroke()
      if (isDot) {
        context.beginPath()
        context.arc(fromX, fromY, lineWidth / 2, 0, Math.PI * 2)
        context.fill()
      }
      context.restore()
    })

    image.dirty = true
    targetCanvas.requestRenderAll()
  }, [brushSizeRef, canvasRef])

  const startMagicRemoval = useCallback((point: EditPoint) => {
    const targetCanvas = canvasRef.current
    const image = imageObjectRef.current
    if (removalInProgressRef.current) return false
    if (!targetCanvas || !image) {
      setNotice('Upload an image before editing pixels.')
      return false
    }

    const preview = createVisibleImageCanvas(image)
    const livePreview = createVisibleImageCanvas(image, image.getElement())
    const context = preview.getContext('2d')
    const liveContext = livePreview.getContext('2d')
    if (!context || !liveContext) {
      setNotice('Could not edit this image.')
      return false
    }

    const originalState: OriginalImageState = {
      element: image.getElement(),
      originalElement: image._originalElement,
      width: image.width,
      height: image.height,
      cropX: image.cropX || 0,
      cropY: image.cropY || 0,
      filters: image.filters,
    }
    try {
      transformRef.current = createImageEditingTransform(image)
      targetCanvasRef.current = targetCanvas
      originalImageStateRef.current = originalState
      imageRef.current = image
      previewCanvasRef.current = preview
      previewContextRef.current = context
      livePreviewCanvasRef.current = livePreview
      livePreviewContextRef.current = liveContext
      image.filters = []
      image.setElement(livePreview)
      image.set({ cropX: 0, cropY: 0, width: preview.width, height: preview.height })
      image.dirty = true
      removalInProgressRef.current = true
      paintMagicRemoval(point, point)
      return true
    } catch (error) {
      try {
        restoreOriginalImage(targetCanvas, image, originalState)
      } finally {
        removalInProgressRef.current = false
        previewCanvasRef.current = null
        previewContextRef.current = null
        livePreviewCanvasRef.current = null
        livePreviewContextRef.current = null
        imageRef.current = null
        targetCanvasRef.current = null
        transformRef.current = null
        originalImageStateRef.current = null
      }
      setNotice(error instanceof Error ? error.message : 'Could not edit this image.')
      return false
    }
  }, [canvasRef, imageObjectRef, paintMagicRemoval, restoreOriginalImage, setNotice])

  const finishMagicRemoval = useCallback(async () => {
    const preview = previewCanvasRef.current
    const image = imageRef.current
    const targetCanvas = targetCanvasRef.current
    const originalState = originalImageStateRef.current
    previewCanvasRef.current = null
    previewContextRef.current = null
    livePreviewCanvasRef.current = null
    livePreviewContextRef.current = null
    imageRef.current = null
    targetCanvasRef.current = null
    transformRef.current = null
    originalImageStateRef.current = null
    if (!preview || !image || !targetCanvas || !originalState) {
      removalInProgressRef.current = false
      return
    }

    try {
      if (canvasRef.current !== targetCanvas || imageObjectRef.current !== image) {
        restoreOriginalImage(targetCanvas, image, originalState)
        return
      }
      image.filters = []
      image.setElement(preview)
      image.set({ cropX: 0, cropY: 0, width: preview.width, height: preview.height })
      image.filters = originalState.filters
      image.applyFilters()
      image.setCoords()
      targetCanvas.requestRenderAll()
      recordHistory(true)
      syncObjects()
      setNotice('Image area removed.')
    } catch (error) {
      try {
        restoreOriginalImage(targetCanvas, image, originalState)
      } catch {
        targetCanvas.requestRenderAll()
      }
      setNotice(error instanceof Error ? error.message : 'Could not edit this image.')
    } finally {
      removalInProgressRef.current = false
    }
  }, [canvasRef, imageObjectRef, recordHistory, restoreOriginalImage, setNotice, syncObjects])

  return { startMagicRemoval, paintMagicRemoval, finishMagicRemoval }
}