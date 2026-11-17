import { useCallback, useEffect, useRef } from 'react'
import { FabricImage, type FabricObject } from 'fabric'
import { DRAWING_LAYER_TOOL_NAMES, isDrawingLayerName } from '../model/constants'
import type { DrawingMode, EditPoint, UsePixelDrawingOptions } from '../model/types'
import { editImagePixelsInCanvas } from '../operations/editImagePixels'
import { createImageEditingTransform, createVisibleImageCanvas, getImageBrushScale, toImagePoint } from '../operations/pixelCanvas'
import { useMagicImageRemoval } from './useMagicImageRemoval'

const LASSO_PREVIEW_NAME = '__pixel_studio_lasso_preview__'
type PaintMode = Extract<DrawingMode, 'pencil' | 'sketch' | 'marker' | 'highlighter' | 'eraser'>

function isPaintMode(mode: DrawingMode): mode is PaintMode {
  return mode === 'pencil' || mode === 'sketch' || mode === 'marker' || mode === 'highlighter' || mode === 'eraser'
}

function updateDrawingLayerBounds(layer: { canvas: HTMLCanvasElement; image: FabricImage }) {
  const context = layer.canvas.getContext('2d', { willReadFrequently: true })
  if (!context) return

  const { width, height } = layer.canvas
  const pixels = context.getImageData(0, 0, width, height).data
  let left = width
  let top = height
  let right = -1
  let bottom = -1

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] === 0) continue
      left = Math.min(left, x)
      top = Math.min(top, y)
      right = Math.max(right, x)
      bottom = Math.max(bottom, y)
    }
  }

  if (right < left || bottom < top) {
    layer.image.set({ cropX: 0, cropY: 0, left: 0, top: 0, width: 1, height: 1 })
  } else {
    layer.image.set({
      cropX: left,
      cropY: top,
      left,
      top,
      width: right - left + 1,
      height: bottom - top + 1,
    })
  }
  layer.image.setCoords()
  layer.image.dirty = true
}

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
  const drawingLayersRef = useRef(new Map<string, { canvas: HTMLCanvasElement; image: FabricImage }>())
  const gestureBaseCanvasesRef = useRef(new Map<string, HTMLCanvasElement>())
  const pendingDrawingModeRef = useRef<PaintMode | null>(null)
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

  const getDrawingLayer = useCallback((mode: Exclude<PaintMode, 'eraser'>) => {
    const targetCanvas = canvasRef.current
    if (!targetCanvas) return null

    const name = DRAWING_LAYER_TOOL_NAMES[mode]
    const cached = drawingLayersRef.current.get(name)
    const cachedImage = cached?.image
    const cachedCanvas = cached?.canvas
    if (
      cachedImage &&
      targetCanvas.getObjects().includes(cachedImage) &&
      cachedImage.canvas === targetCanvas &&
      cachedCanvas &&
      cachedImage.getElement() === cachedCanvas
    ) {
      return { canvas: cachedCanvas, image: cachedImage }
    }

    const layer = targetCanvas.getObjects().find((object) => object.get('name') === name)
    let layerImage = layer instanceof FabricImage ? layer : null
    let layerCanvas = cachedCanvas

    if (!layerImage) {
      layerCanvas = document.createElement('canvas')
      layerCanvas.width = targetCanvas.getWidth()
      layerCanvas.height = targetCanvas.getHeight()
      layerImage = new FabricImage(layerCanvas, {
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        selectable: true,
        evented: true,
        perPixelTargetFind: true,
      })
      layerImage.set('name', name)
      targetCanvas.add(layerImage)
      targetCanvas.bringObjectToFront(layerImage)
    } else {
      const element = layerImage.getElement()
      if (element instanceof HTMLCanvasElement) {
        layerCanvas = element
      } else if (!layerCanvas || layerImage !== cachedImage) {
        layerCanvas = document.createElement('canvas')
        layerCanvas.width = targetCanvas.getWidth()
        layerCanvas.height = targetCanvas.getHeight()
        const context = layerCanvas.getContext('2d', { willReadFrequently: true })
        if (context) context.drawImage(element, 0, 0, layerCanvas.width, layerCanvas.height)
        layerImage.setElement(layerCanvas)
      }
    }

    drawingLayersRef.current.set(name, { canvas: layerCanvas, image: layerImage })
    return { canvas: layerCanvas, image: layerImage }
  }, [canvasRef])

  const getEraserLayers = useCallback(() => {
    const targetCanvas = canvasRef.current
    if (!targetCanvas) return []

    return targetCanvas.getObjects()
      .filter((object): object is FabricImage => isDrawingLayerName(object.get('name')) && object instanceof FabricImage)
      .filter((image) => image.get('layerLocked') !== true)
      .map((image) => {
        const name = String(image.get('name'))
        const element = image.getElement()
        let layerCanvas = element instanceof HTMLCanvasElement ? element : null
        if (!layerCanvas) {
          layerCanvas = document.createElement('canvas')
          layerCanvas.width = targetCanvas.getWidth()
          layerCanvas.height = targetCanvas.getHeight()
          layerCanvas.getContext('2d', { willReadFrequently: true })?.drawImage(element, 0, 0, layerCanvas.width, layerCanvas.height)
          image.setElement(layerCanvas)
        }
        drawingLayersRef.current.set(name, { canvas: layerCanvas, image })
        return { canvas: layerCanvas, image }
      })
  }, [canvasRef])

  const drawOnDrawingLayer = useCallback((points: EditPoint[], mode: PaintMode) => {
    const targetCanvas = canvasRef.current
    if (!targetCanvas || points.length === 0) return
    const layers: Array<{ canvas: HTMLCanvasElement; image: FabricImage }> = mode === 'eraser'
      ? getEraserLayers()
      : [getDrawingLayer(mode)].filter((layer): layer is NonNullable<typeof layer> => layer !== null)

    for (const layer of layers) {
      if (layer.image.get('layerLocked') === true) continue
      const context = layer.canvas.getContext('2d', { willReadFrequently: true })
      if (!context) continue
      const transform = createImageEditingTransform(layer.image)
      const localPoints = points.map((point) => {
        const localPoint = toImagePoint(layer.image, point, transform)
        return {
          x: localPoint.x + (layer.image.cropX || 0),
          y: localPoint.y + (layer.image.cropY || 0),
        }
      })
      const brushSize = brushSizeRef.current * transform.brushScale

      context.save()
      context.globalCompositeOperation = mode === 'eraser' ? 'destination-out' : 'source-over'
      context.globalAlpha = mode === 'sketch' ? 0.55 : mode === 'highlighter' ? 0.32 : mode === 'marker' ? 0.9 : 1
      context.strokeStyle = drawingColorRef.current
      context.fillStyle = drawingColorRef.current
      context.lineWidth = brushSize * (mode === 'sketch' ? 0.55 : mode === 'marker' ? 1.35 : mode === 'highlighter' ? 3 : 1)
      context.lineCap = 'round'
      context.lineJoin = 'round'
      context.beginPath()
      context.moveTo(localPoints[0].x, localPoints[0].y)

      if (localPoints.length === 1) {
        context.arc(localPoints[0].x, localPoints[0].y, brushSize / 2, 0, Math.PI * 2)
        context.fill()
      } else {
        for (let index = 1; index < localPoints.length; index += 1) {
          const point = localPoints[index]
          context.lineTo(point.x, point.y)
        }
        context.stroke()
      }

      context.restore()
      layer.image.dirty = true
    }
    targetCanvas.requestRenderAll()
  }, [brushSizeRef, canvasRef, drawingColorRef, getDrawingLayer, getEraserLayers])

  const flushPendingDrawing = useCallback(() => {
    if (drawingFrameRef.current !== null) {
      cancelAnimationFrame(drawingFrameRef.current)
      drawingFrameRef.current = null
    }

    const mode = pendingDrawingModeRef.current
    pendingDrawingModeRef.current = null
    const points = gesturePointsRef.current
    if (!mode || points.length === 0) return
    const layers = mode === 'eraser'
      ? getEraserLayers()
      : [getDrawingLayer(mode)].filter((layer): layer is NonNullable<typeof layer> => layer !== null)
    if (!layers.length) return

    for (const layer of layers) {
      const context = layer.canvas.getContext('2d')
      if (!context) continue
      context.clearRect(0, 0, layer.canvas.width, layer.canvas.height)
      const baseCanvas = gestureBaseCanvasesRef.current.get(String(layer.image.get('name')))
      if (baseCanvas) context.drawImage(baseCanvas, 0, 0)
    }
    drawOnDrawingLayer(points, mode)
  }, [drawOnDrawingLayer, getDrawingLayer, getEraserLayers])

  const queueDrawingPoint = useCallback((point: EditPoint, mode: PaintMode, startsGesture = false) => {
    if (startsGesture) {
      pendingDrawingModeRef.current = mode
      gesturePointsRef.current = [point]
      gestureBaseCanvasesRef.current.clear()
      const layers = mode === 'eraser'
        ? getEraserLayers()
        : [getDrawingLayer(mode)].filter((layer): layer is NonNullable<typeof layer> => layer !== null)
      for (const layer of layers) {
        const baseCanvas = document.createElement('canvas')
        baseCanvas.width = layer.canvas.width
        baseCanvas.height = layer.canvas.height
        baseCanvas.getContext('2d')?.drawImage(layer.canvas, 0, 0)
        gestureBaseCanvasesRef.current.set(String(layer.image.get('name')), baseCanvas)
      }
    } else {
      if (pendingDrawingModeRef.current && pendingDrawingModeRef.current !== mode) {
        flushPendingDrawing()
      }
      pendingDrawingModeRef.current = mode
      gesturePointsRef.current.push(point)
    }

    if (drawingFrameRef.current === null) {
      drawingFrameRef.current = requestAnimationFrame(flushPendingDrawing)
    }
  }, [flushPendingDrawing, getDrawingLayer, getEraserLayers])

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
      image.applyFilters()
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
      const mode = activeDrawingModeRef.current
      if ((mode === 'magic-remover' || mode === 'lasso') && !imageObjectRef.current) {
        setNotice('Add an image layer before using pixel removal or freehand selection.')
        return
      }
      if (isPaintMode(mode)) {
        isGestureDrawingRef.current = true
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
      if (isPaintMode(mode)) {
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
        gestureBaseCanvasesRef.current.clear()
        return
      }

      const mode = activeDrawingModeRef.current
      const releasePoint = event.scenePoint
      const lastGesturePoint = gesturePointsRef.current.at(-1)
      if (
        isPaintMode(mode) &&
        releasePoint &&
        (!lastGesturePoint || releasePoint.x !== lastGesturePoint.x || releasePoint.y !== lastGesturePoint.y)
      ) {
        queueDrawingPoint(releasePoint, mode)
      }
      if (isPaintMode(mode)) {
        flushPendingDrawing()
        const affectedLayers = mode === 'eraser'
          ? getEraserLayers()
          : [getDrawingLayer(mode)].filter((layer): layer is NonNullable<typeof layer> => layer !== null)
        affectedLayers.forEach(updateDrawingLayerBounds)
        gestureBaseCanvasesRef.current.clear()
        canvas.requestRenderAll()
      }
      const points = [...gesturePointsRef.current]
      gesturePointsRef.current = []
      if (isPaintMode(mode)) {
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
  }, [activeToolRef, canvas, finishMagicRemoval, flushPendingDrawing, getDrawingLayer, getEraserLayers, imageObjectRef, paintMagicRemoval, queueDrawingPoint, recordHistory, setNotice, startMagicRemoval, tableEditing])

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
    drawingLayersRef.current.clear()
    gestureBaseCanvasesRef.current.clear()
    if (drawingFrameRef.current !== null) cancelAnimationFrame(drawingFrameRef.current)
    drawingFrameRef.current = null
    pendingDrawingModeRef.current = null
    gesturePointsRef.current = []
    lassoPointsRef.current = []
    lassoPreviewObjectsRef.current = []
    isGestureDrawingRef.current = false
  }

  return { clearSelection, deleteSelection, reset }
}
