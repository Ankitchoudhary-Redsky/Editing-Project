import { useCallback, useEffect, useRef } from 'react'
import { Canvas, FabricImage, Point, util, type FabricObject } from 'fabric'
import type { MutableRefObject } from 'react'
import type { DrawingMode, EditorTool } from '../model/types'
import { editImagePixels, type EditPoint } from '../operations/editImagePixels'

const LASSO_PREVIEW_NAME = '__pixel_studio_lasso_preview__'

type UsePixelDrawingOptions = {
  canvas: Canvas | null
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  activeTool: EditorTool
  activeToolRef: MutableRefObject<EditorTool>
  activeDrawingMode: DrawingMode
  drawingColor: string
  brushSize: number
  tableEditing: boolean
  recordHistory: (immediate?: boolean) => void
  syncObjects: () => void
  setNotice: (notice: string) => void
}

function toImagePoint(image: FabricImage, point: EditPoint): EditPoint {
  const inverse = util.invertTransform(image.calcTransformMatrix())
  const localPoint = util.transformPoint(new Point(point.x, point.y), inverse)
  return {
    x: localPoint.x + image.width / 2,
    y: localPoint.y + image.height / 2,
  }
}

function getImageBrushScale(image: FabricImage) {
  const inverse = util.invertTransform(image.calcTransformMatrix())
  const scaleX = Math.hypot(inverse[0], inverse[1])
  const scaleY = Math.hypot(inverse[2], inverse[3])
  return (scaleX + scaleY) / 2
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
  const drawingLayerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingLayerImageRef = useRef<FabricImage | null>(null)
  const activeDrawingModeRef = useRef(activeDrawingMode)
  const drawingColorRef = useRef(drawingColor)
  const brushSizeRef = useRef(brushSize)
  const gesturePointsRef = useRef<EditPoint[]>([])
  const lassoPointsRef = useRef<EditPoint[]>([])
  const lassoPreviewObjectsRef = useRef<FabricObject[]>([])
  const isGestureDrawingRef = useRef(false)
  const magicCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const magicContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const magicImageRef = useRef<FabricImage | null>(null)
  const magicRemovalInProgressRef = useRef(false)
  const magicDisplayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const magicDisplayContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const magicFiltersRef = useRef<FabricImage['filters'] | null>(null)

  useEffect(() => {
    activeDrawingModeRef.current = activeDrawingMode
    drawingColorRef.current = drawingColor
    brushSizeRef.current = brushSize
  }, [activeDrawingMode, brushSize, drawingColor])

  const createVisibleImageCanvas = (image: FabricImage) => {
    const source = image._originalElement
    const width = Math.max(1, Math.round(image.width))
    const height = Math.max(1, Math.round(image.height))
    const output = document.createElement('canvas')
    output.width = width
    output.height = height
    const context = output.getContext('2d')

    if (!context) throw new Error('Could not edit this image.')

    context.drawImage(
      source,
      image.cropX || 0,
      image.cropY || 0,
      image.width,
      image.height,
      0,
      0,
      width,
      height,
    )
    return output
  }

  const getDrawingLayer = useCallback(() => {
    const targetCanvas = canvasRef.current
    if (!targetCanvas) return null

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
      for (const point of points.slice(1)) {
        context.lineTo(point.x, point.y)
      }
      context.stroke()
    }

    context.restore()
    layer.image.dirty = true
    targetCanvas.requestRenderAll()
  }, [canvasRef, getDrawingLayer])

  const paintMagicRemoval = useCallback((from: EditPoint, to: EditPoint) => {
    const preview = magicCanvasRef.current
    const context = magicContextRef.current
    const displayContext = magicDisplayContextRef.current
    const image = magicImageRef.current
    const targetCanvas = canvasRef.current
    if (!preview || !context || !displayContext || !image || !targetCanvas) return

    const fromPoint = toImagePoint(image, from)
    const toPoint = toImagePoint(image, to)
    const scaleX = preview.width / image.width
    const scaleY = preview.height / image.height
    const fromX = fromPoint.x * scaleX
    const fromY = fromPoint.y * scaleY
    const toX = toPoint.x * scaleX
    const toY = toPoint.y * scaleY

    context.save()
    context.globalCompositeOperation = 'destination-out'
    context.lineCap = 'round'
    context.lineJoin = 'round'
    const lineWidth = brushSizeRef.current * getImageBrushScale(image) * ((scaleX + scaleY) / 2)
    const isDot = fromPoint.x === toPoint.x && fromPoint.y === toPoint.y

    context.lineWidth = lineWidth
    context.beginPath()
    context.moveTo(fromX, fromY)
    context.lineTo(toX, toY)
    context.stroke()
    if (isDot) {
      context.beginPath()
      context.arc(fromX, fromY, context.lineWidth / 2, 0, Math.PI * 2)
      context.fill()
    }
    context.restore()

    displayContext.save()
    displayContext.globalCompositeOperation = 'destination-out'
    displayContext.lineCap = 'round'
    displayContext.lineJoin = 'round'
    displayContext.lineWidth = lineWidth
    displayContext.beginPath()
    displayContext.moveTo(fromX, fromY)
    displayContext.lineTo(toX, toY)
    displayContext.stroke()
    if (isDot) {
      displayContext.beginPath()
      displayContext.arc(fromX, fromY, lineWidth / 2, 0, Math.PI * 2)
      displayContext.fill()
    }
    displayContext.restore()

    image.dirty = true
    targetCanvas.renderAll()
  }, [canvasRef])

  const startMagicRemoval = useCallback((point: EditPoint) => {
    const targetCanvas = canvasRef.current
    const image = imageObjectRef.current
    if (magicRemovalInProgressRef.current) return false
    if (!targetCanvas || !image) {
      setNotice('Upload an image before editing pixels.')
      return false
    }

    const preview = createVisibleImageCanvas(image)
    const context = preview.getContext('2d')
    const displayPreview = document.createElement('canvas')
    displayPreview.width = preview.width
    displayPreview.height = preview.height
    const displayContext = displayPreview.getContext('2d')
    if (!context || !displayContext) {
      setNotice('Could not edit this image.')
      return false
    }

    magicRemovalInProgressRef.current = true
    displayContext.drawImage(
      image.getElement(),
      image.cropX || 0,
      image.cropY || 0,
      image.width,
      image.height,
      0,
      0,
      displayPreview.width,
      displayPreview.height,
    )
    magicFiltersRef.current = image.filters
    image.filters = []
    image.setElement(displayPreview)
    image.set({ cropX: 0, cropY: 0, width: displayPreview.width, height: displayPreview.height })
    magicCanvasRef.current = preview
    magicContextRef.current = context
    magicDisplayCanvasRef.current = displayPreview
    magicDisplayContextRef.current = displayContext
    magicImageRef.current = image
    image.dirty = true
    paintMagicRemoval(point, point)
    return true
  }, [canvasRef, imageObjectRef, paintMagicRemoval, setNotice])

  const finishMagicRemoval = useCallback(async () => {
    const preview = magicCanvasRef.current
    const image = magicImageRef.current
    const targetCanvas = canvasRef.current
    const filters = magicFiltersRef.current
    magicCanvasRef.current = null
    magicContextRef.current = null
    magicDisplayCanvasRef.current = null
    magicDisplayContextRef.current = null
    magicImageRef.current = null
    magicFiltersRef.current = null
    if (!preview || !image || !targetCanvas) {
      magicRemovalInProgressRef.current = false
      return
    }

    try {
      image.filters = filters || []
      await image.setSrc(preview.toDataURL('image/png'), {})
      image.setCoords()
      targetCanvas.requestRenderAll()
      recordHistory(true)
      syncObjects()
      setNotice('Image area removed.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not edit this image.')
    } finally {
      magicRemovalInProgressRef.current = false
    }
  }, [canvasRef, recordHistory, setNotice, syncObjects])

  const applyPixelEdit = async (points: EditPoint[], mode: 'brush' | 'lasso') => {
    const targetCanvas = canvasRef.current
    const image = imageObjectRef.current
    if (!targetCanvas || !image) {
      setNotice('Upload an image before editing pixels.')
      return
    }

    try {
      const source = createVisibleImageCanvas(image).toDataURL('image/png')
      const localPoints = points.map((point) => toImagePoint(image, point))
      const editedSource = await editImagePixels(
        source,
        image.width,
        image.height,
        localPoints,
        brushSizeRef.current * getImageBrushScale(image),
        mode,
      )
      await image.setSrc(editedSource, {})
      image.set({ cropX: 0, cropY: 0 })
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
        drawOnDrawingLayer(gesturePointsRef.current, mode)
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
        const previousPoint = gesturePointsRef.current.at(-1)
        gesturePointsRef.current.push({ x: point.x, y: point.y })
        if (previousPoint) drawOnDrawingLayer([previousPoint, point], mode)
      } else if (mode === 'magic-remover') {
        const previousPoint = gesturePointsRef.current.at(-1)
        gesturePointsRef.current.push({ x: point.x, y: point.y })
        if (previousPoint) paintMagicRemoval(previousPoint, point)
      } else if (mode === 'lasso') {
        gesturePointsRef.current.push({ x: point.x, y: point.y })
      }
    }

    const onMouseUp = () => {
      if (!isGestureDrawingRef.current) return
      isGestureDrawingRef.current = false
      if (activeToolRef.current !== 'draw-remove') {
        gesturePointsRef.current = []
        return
      }

      const mode = activeDrawingModeRef.current
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
    }
  }, [activeToolRef, canvas, drawOnDrawingLayer, finishMagicRemoval, imageObjectRef, paintMagicRemoval, recordHistory, setNotice, startMagicRemoval, tableEditing])

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
    gesturePointsRef.current = []
    lassoPointsRef.current = []
    lassoPreviewObjectsRef.current = []
    isGestureDrawingRef.current = false
  }

  return { clearSelection, deleteSelection, reset }
}
