import { useCallback, useEffect, useRef } from 'react'
import { FabricImage, type FabricObject } from 'fabric'
import type { EditPoint, UsePixelDrawingOptions } from '../model/types'
import { editImagePixelsInCanvas } from '../operations/editImagePixels'
import { createImageEditingTransform, createVisibleImageCanvas, getImageBrushScale, toImagePoint } from '../operations/pixelCanvas'
import { useMagicImageRemoval } from './useMagicImageRemoval'

const LASSO_PREVIEW_NAME = '__pixel_studio_lasso_preview__'

export function usePixelDrawing({
  canvas,
  canvasRef,
  imageObjectRef,
  activeTool,
  activeToolRef,
  activeDrawingMode,
  drawingColor,
  brushSize,
  tableEditing,
  recordHistory,
  syncObjects,
  setNotice,
}: UsePixelDrawingOptions) {
  const drawingLayerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingLayerImageRef = useRef<FabricImage | null>(null)
  const pendingDrawingPointsRef = useRef<EditPoint[]>([])
  const pendingDrawingModeRef = useRef<'pencil' | 'eraser' | null>(null)
  const lastDrawnPointRef = useRef<EditPoint | null>(null)
  const drawingFrameRef = useRef<number | null>(null)
  const activeDrawingModeRef = useRef(activeDrawingMode)
  const drawingColorRef = useRef(drawingColor)
  const brushSizeRef = useRef(brushSize)
  const gesturePointsRef = useRef<EditPoint[]>([])
  const lassoPointsRef = useRef<EditPoint[]>([])
  const lassoPreviewObjectsRef = useRef<FabricObject[]>([])
  const isGestureDrawingRef = useRef(false)

  const {
    startMagicRemoval,
    paintMagicRemoval,
    finishMagicRemoval,
  } = useMagicImageRemoval({
    canvasRef,
    imageObjectRef,
    brushSizeRef,
    recordHistory,
    syncObjects,
    setNotice,
  })

  useEffect(() => {
    activeDrawingModeRef.current = activeDrawingMode
    drawingColorRef.current = drawingColor
    brushSizeRef.current = brushSize
  }, [activeDrawingMode, brushSize, drawingColor])

  const getDrawingLayer = useCallback(() => {
    const targetCanvas = canvasRef.current
    if (!targetCanvas) return null

    const cachedImage = drawingLayerImageRef.current
    const cachedCanvas = drawingLayerCanvasRef.current
    if (
      cachedImage?.canvas === targetCanvas &&
      cachedCanvas &&
      cachedImage.getElement() === cachedCanvas
    ) {
      return { canvas: cachedCanvas, image: cachedImage }
    }

    const layer = targetCanvas.getObjects().find(
      (object) => object.get('name') === '__pixel_studio_drawing_layer__',
    )
    let layerImage = layer instanceof FabricImage ? layer : null
    let layerCanvas = drawingLayerCanvasRef.current

    if (!layerImage) {
      layerCanvas = document.createElement('canvas')
      layerCanvas.width = targetCanvas.getWidth()
      layerCanvas.height = targetCanvas.getHeight()
      layerImage = new FabricImage(layerCanvas, {
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        selectable: false,
        evented: false,
      })
      layerImage.set('name', '__pixel_studio_drawing_layer__')
      targetCanvas.add(layerImage)
      targetCanvas.bringObjectToFront(layerImage)
    } else {
      const element = layerImage.getElement()
      if (element instanceof HTMLCanvasElement) {
        layerCanvas = element
      } else if (!layerCanvas || layerImage !== drawingLayerImageRef.current) {
        layerCanvas = document.createElement('canvas')
        layerCanvas.width = targetCanvas.getWidth()
        layerCanvas.height = targetCanvas.getHeight()
        const context = layerCanvas.getContext('2d')
        if (context) context.drawImage(element, 0, 0, layerCanvas.width, layerCanvas.height)
        layerImage.setElement(layerCanvas)
      }
    }

    drawingLayerCanvasRef.current = layerCanvas
    drawingLayerImageRef.current = layerImage
    return { canvas: layerCanvas, image: layerImage }
  }, [canvasRef])

  const drawOnDrawingLayer = useCallback((points: EditPoint[], mode: 'pencil' | 'eraser') => {
    const layer = getDrawingLayer()
    const targetCanvas = canvasRef.current
    const context = layer?.canvas.getContext('2d')
    if (!layer || !targetCanvas || !context || points.length === 0) return

    context.save()
    context.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over'
    context.strokeStyle = drawingColorRef.current
    context.fillStyle = drawingColorRef.current
    context.lineWidth = brushSizeRef.current
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.beginPath()
    context.moveTo(points[0].x, points[0].y)

    if (points.length === 1) {
      context.arc(points[0].x, points[0].y, brushSizeRef.current / 2, 0, Math.PI * 2)
      context.fill()
    } else {
      for (let index = 1; index < points.length; index += 1) {
        const point = points[index]
        context.lineTo(point.x, point.y)
      }
      context.stroke()
    }

    context.restore()
    layer.image.dirty = true
    targetCanvas.requestRenderAll()
  }, [canvasRef, getDrawingLayer])

  const flushPendingDrawing = useCallback(() => {
    if (drawingFrameRef.current !== null) {
      cancelAnimationFrame(drawingFrameRef.current)
      drawingFrameRef.current = null
    }

    const points = pendingDrawingPointsRef.current
    const mode = pendingDrawingModeRef.current
    pendingDrawingPointsRef.current = []
    pendingDrawingModeRef.current = null
    if (!mode || points.length === 0) return

    drawOnDrawingLayer(points, mode)
    lastDrawnPointRef.current = points[points.length - 1]
  }, [drawOnDrawingLayer])

  const queueDrawingPoint = useCallback((point: EditPoint, mode: 'pencil' | 'eraser', startsGesture = false) => {
    if (startsGesture) {
      pendingDrawingPointsRef.current = [point]
      pendingDrawingModeRef.current = mode
      lastDrawnPointRef.current = null
    } else {
      if (pendingDrawingModeRef.current && pendingDrawingModeRef.current !== mode) {
        flushPendingDrawing()
      }
      if (pendingDrawingPointsRef.current.length === 0) {
        if (lastDrawnPointRef.current) pendingDrawingPointsRef.current.push(lastDrawnPointRef.current)
        pendingDrawingModeRef.current = mode
      }
      pendingDrawingPointsRef.current.push(point)
    }

    if (drawingFrameRef.current === null) {
      drawingFrameRef.current = requestAnimationFrame(flushPendingDrawing)
    }
  }, [flushPendingDrawing])

  const applyPixelEdit = async (points: EditPoint[], mode: 'brush' | 'lasso') => {
    const targetCanvas = canvasRef.current
    const image = imageObjectRef.current
    if (!targetCanvas || !image) {
      setNotice('Upload an image before editing pixels.')
      return
    }

    try {
      const source = createVisibleImageCanvas(image)
      const transform = createImageEditingTransform(image)
      const localPoints = points.map((point) => toImagePoint(image, point, transform))
      const editedCanvas = editImagePixelsInCanvas(
        source,
        image.width,
        image.height,
        localPoints,
        brushSizeRef.current * getImageBrushScale(image, transform),
        mode,
      )
      if (canvasRef.current !== targetCanvas || imageObjectRef.current !== image) return
      image.setElement(editedCanvas)
      image.set({ cropX: 0, cropY: 0, width: editedCanvas.width, height: editedCanvas.height })
      image.setCoords()
      targetCanvas.requestRenderAll()

      if (mode === 'brush') recordHistory(true)
      syncObjects()
      setNotice(mode === 'brush' ? 'Image area erased.' : 'Selected image area removed.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not edit this image.')
    }
  }

  const removeLassoPreview = useCallback(() => {
    const targetCanvas = canvasRef.current
    if (!targetCanvas) return

    const previews = new Set([
      ...lassoPreviewObjectsRef.current,
      ...targetCanvas.getObjects().filter((object) => object.get('name') === LASSO_PREVIEW_NAME),
    ])
    previews.forEach((object) => targetCanvas.remove(object))
    lassoPreviewObjectsRef.current = []
    targetCanvas.requestRenderAll()
  }, [canvasRef])

  useEffect(() => {
    if (!canvas) return
    const handlePathCreated = (event: { path: FabricObject }) => {
      if (activeToolRef.current !== 'draw-remove' || activeDrawingModeRef.current !== 'lasso') return
      event.path.set('name', LASSO_PREVIEW_NAME)
      lassoPreviewObjectsRef.current.push(event.path)
    }
    canvas.on('path:created', handlePathCreated)
    return () => {
      canvas.off('path:created', handlePathCreated)
    }
  }, [activeToolRef, canvas])

  useEffect(() => {
    if (activeTool === 'draw-remove' && activeDrawingMode === 'lasso') return
    lassoPointsRef.current = []
    removeLassoPreview()
  }, [activeDrawingMode, activeTool, removeLassoPreview])

  useEffect(() => {
    if (!canvas) return

    const onMouseDown = (event: { scenePoint?: { x: number; y: number } }) => {
      const point = event.scenePoint
      if (!point || activeToolRef.current !== 'draw-remove') return
      if (tableEditing) return
      if (!imageObjectRef.current) {
        setNotice('Upload an image before using drawing tools.')
        return
      }

      const mode = activeDrawingModeRef.current
      if (mode === 'pencil' || mode === 'eraser') {
        isGestureDrawingRef.current = true
        gesturePointsRef.current = [{ x: point.x, y: point.y }]
        queueDrawingPoint(point, mode, true)
      } else if (mode === 'magic-remover') {
        if (!startMagicRemoval(point)) return
        isGestureDrawingRef.current = true
        gesturePointsRef.current = [{ x: point.x, y: point.y }]
      } else if (mode === 'lasso') {
        isGestureDrawingRef.current = true
        gesturePointsRef.current = [{ x: point.x, y: point.y }]
      }
    }

    const onMouseMove = (event: { scenePoint?: { x: number; y: number } }) => {
      const point = event.scenePoint
      if (!point || !isGestureDrawingRef.current) return

      const mode = activeDrawingModeRef.current
      if (mode === 'pencil' || mode === 'eraser') {
        gesturePointsRef.current.push({ x: point.x, y: point.y })
        queueDrawingPoint(point, mode)
      } else if (mode === 'magic-remover') {
        const previousPoint = gesturePointsRef.current.at(-1)
        gesturePointsRef.current.push({ x: point.x, y: point.y })
        if (previousPoint) paintMagicRemoval(previousPoint, point)
      } else if (mode === 'lasso') {
        gesturePointsRef.current.push({ x: point.x, y: point.y })
      }
    }

    const onMouseUp = (event: { scenePoint?: { x: number; y: number } }) => {
      if (!isGestureDrawingRef.current) return
      isGestureDrawingRef.current = false
      if (activeToolRef.current !== 'draw-remove') {
        flushPendingDrawing()
        gesturePointsRef.current = []
        return
      }

      const mode = activeDrawingModeRef.current
      const releasePoint = event.scenePoint
      const lastGesturePoint = gesturePointsRef.current.at(-1)
      if (
        (mode === 'pencil' || mode === 'eraser') &&
        releasePoint &&
        (!lastGesturePoint || releasePoint.x !== lastGesturePoint.x || releasePoint.y !== lastGesturePoint.y)
      ) {
        gesturePointsRef.current.push({ x: releasePoint.x, y: releasePoint.y })
        queueDrawingPoint(releasePoint, mode)
      }
      if (mode === 'pencil' || mode === 'eraser') flushPendingDrawing()
      const points = [...gesturePointsRef.current]
      gesturePointsRef.current = []
      if (mode === 'pencil' || mode === 'eraser') {
        recordHistory(true)
      } else if (mode === 'magic-remover') {
        void finishMagicRemoval()
      } else if (mode === 'lasso') {
        lassoPointsRef.current = points
        setNotice(
          points.length >= 3
            ? 'Selection ready. Click Delete Selection.'
            : 'Draw a larger selection.',
        )
      }
    }

    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:move', onMouseMove)
    canvas.on('mouse:up', onMouseUp)
    return () => {
      canvas.off('mouse:down', onMouseDown)
      canvas.off('mouse:move', onMouseMove)
      canvas.off('mouse:up', onMouseUp)
      flushPendingDrawing()
    }
  }, [activeToolRef, canvas, finishMagicRemoval, flushPendingDrawing, imageObjectRef, paintMagicRemoval, queueDrawingPoint, recordHistory, setNotice, startMagicRemoval, tableEditing])

  const clearSelection = () => {
    lassoPointsRef.current = []
    removeLassoPreview()
    setNotice('Selection cleared.')
  }

  const deleteSelection = async () => {
    const points = lassoPointsRef.current
    if (points.length < 3) {
      setNotice('Use Freehand Selection to outline an area first.')
      return
    }
    lassoPointsRef.current = []
    removeLassoPreview()
    await applyPixelEdit(points, 'lasso')
    recordHistory(true)
  }

  const reset = () => {
    drawingLayerCanvasRef.current = null
    drawingLayerImageRef.current = null
    if (drawingFrameRef.current !== null) cancelAnimationFrame(drawingFrameRef.current)
    drawingFrameRef.current = null
    pendingDrawingPointsRef.current = []
    pendingDrawingModeRef.current = null
    lastDrawnPointRef.current = null
    gesturePointsRef.current = []
    lassoPointsRef.current = []
    lassoPreviewObjectsRef.current = []
    isGestureDrawingRef.current = false
  }

  return { clearSelection, deleteSelection, reset }
}
