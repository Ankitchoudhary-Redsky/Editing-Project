import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Canvas,
  FabricImage,
  IText,
  Rect,
  Shadow,
  type FabricObject,
  type TPointerEvent,
} from 'fabric'
import { EditorContext } from './features/editor/EditorContext'
import { EditorNotice, PreviewDialog } from './features/editor/components/EditorDialogs'
import { EditorHeader } from './features/editor/components/EditorHeader'
import { ToolPanel } from './features/editor/components/ToolPanel'
import { ToolRail } from './features/editor/components/ToolRail'
import { EditorWorkspace } from './features/editor/components/EditorWorkspace'
import { IMAGE_SOURCE_TOKEN, serializeCanvas, shapeNames } from './features/editor/model/constants'
import { applyImageAdjustments } from './features/editor/operations/imageAdjustments'
import { applyCanvasCrop, createCropFrame, updateCropRatio } from './features/editor/operations/cropCanvas'
import { loadLocalImage } from './features/editor/operations/loadLocalImage'
import type { EditorContextValue, EditorTool, ShapeKind, TextProperty } from './features/editor/model/types'
import './App.css'
import { buildShapeObject, createShapeObject } from './features/editor/operations/shapeObjects'
import { createTextObject } from './features/editor/operations/textObjects'
import { objectName } from './features/editor/model/objectName'

type EditorSnapshot = {
  width: number
  height: number
  scene: Parameters<Canvas['loadFromJSON']>[0]
}

function App() {
  const canvasElementRef = useRef<HTMLCanvasElement>(null)
  const stageElementRef = useRef<HTMLDivElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<Canvas | null>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressHistoryRef = useRef(false)
  const cropObjectRef = useRef<Rect | null>(null)
  const imageObjectRef = useRef<FabricImage | null>(null)
  const imageSourceRef = useRef('')
  const cropTransformChangedRef = useRef(false)
  const shapeDrawingRef = useRef<{ start: { x: number; y: number }; preview: FabricObject | null } | null>(null)

  const setCanvasElement = useCallback((element: HTMLCanvasElement | null) => {
    canvasElementRef.current = element
  }, [])
  const setStageElement = useCallback((element: HTMLDivElement | null) => {
    stageElementRef.current = element
  }, [])
  const setUploadInputElement = useCallback((element: HTMLInputElement | null) => {
    uploadInputRef.current = element
  }, [])

  const [activeTool, setActiveTool] = useState<EditorTool>('upload')
  const [projectName, setProjectName] = useState('Untitled design')
  const [isRenaming, setIsRenaming] = useState(false)
  const [hasDocument, setHasDocument] = useState(false)
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null)
  const [objects, setObjects] = useState<FabricObject[]>([])
  const [historyVersion, setHistoryVersion] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [hasImage, setHasImage] = useState(false)
  const [selectedIsImage, setSelectedIsImage] = useState(false)
  const [imageThumbnail, setImageThumbnail] = useState('')
  const [zoom, setZoom] = useState(1)
  const [fitScale, setFitScale] = useState(1)
  const [draggingFile, setDraggingFile] = useState(false)
  const [notice, setNotice] = useState('')
  const [scaleArtwork, setScaleArtwork] = useState(false)
  const [cropActive, setCropActive] = useState(false)
  const [cropRatio, setCropRatio] = useState('Free')
  const [cropRotation, setCropRotation] = useState(0)
  const [resizeWidth, setResizeWidth] = useState(1200)
  const [resizeHeight, setResizeHeight] = useState(800)
  const [keepRatio, setKeepRatio] = useState(true)
  const [textValue, setTextValue] = useState('Your text here')
  const [fontFamily, setFontFamily] = useState('Georgia')
  const [fontSize, setFontSize] = useState(72)
  const [textColor, setTextColor] = useState('#273a32')
  const [textBackground, setTextBackground] = useState('#ffffff')
  const [textOpacity, setTextOpacity] = useState(100)
  const [textOutline, setTextOutline] = useState('#ffffff')
  const [textOutlineWidth, setTextOutlineWidth] = useState(0)
  const [textShadow, setTextShadow] = useState('none')
  const [shapeKind, setShapeKind] = useState<ShapeKind>('rect')
  const [fillColor, setFillColor] = useState('#b9e4d1')
  const [transparentFill, setTransparentFill] = useState(false)
  const [strokeColor, setStrokeColor] = useState('#27332f')
  const [strokeWidth, setStrokeWidth] = useState(2)
  const [shapeOpacity, setShapeOpacity] = useState(90)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [saturation, setSaturation] = useState(0)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [dimensions, setDimensions] = useState({ width: 1200, height: 800 })

  const syncObjects = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const canvasObjects = canvas.getObjects()
    const image = canvasObjects.find((item) => item instanceof FabricImage)
    image?.set({ selectable: false, evented: false, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true })
    imageObjectRef.current = image instanceof FabricImage ? image : null
    setCropRotation(image instanceof FabricImage ? Math.round(image.angle || 0) : 0)
    setHasImage(Boolean(image))
    setObjects(canvasObjects.filter((item) => item !== cropObjectRef.current))
    const active = canvas.getActiveObject() ?? null
    setSelectedObject(active)
    setSelectedIsImage(active === imageObjectRef.current)
  }, [])

  const syncHistoryControls = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  const recordHistory = useCallback((immediate = false) => {
    const canvas = canvasRef.current
    if (!canvas || suppressHistoryRef.current) return
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current)
    const saveSnapshot = () => {
      const current = serializeCanvas(canvas)
      const history = historyRef.current.slice(0, historyIndexRef.current + 1)
      if (history.at(-1) === current) return
      history.push(current)
      if (history.length > 60) history.shift()
      historyRef.current = history
      historyIndexRef.current = history.length - 1
      syncHistoryControls()
      setHistoryVersion((value) => value + 1)
      syncObjects()
    }
    if (immediate) saveSnapshot()
    else historyTimerRef.current = setTimeout(saveSnapshot, 220)
  }, [syncHistoryControls, syncObjects])

  useEffect(() => {
    const element = canvasElementRef.current
    if (!element) return
    const canvas = new Canvas(element, {
      width: 1200,
      height: 800,
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: 'rgba(0,0,0,0)',
    })
    canvasRef.current = canvas
    historyRef.current = [serializeCanvas(canvas)]
    historyIndexRef.current = 0
    syncHistoryControls()

    const changed = () => {
      syncObjects()
      recordHistory()
    }
    canvas.on('selection:created', syncObjects)
    canvas.on('selection:updated', syncObjects)
    canvas.on('selection:cleared', syncObjects)
    canvas.on('object:added', changed)
    canvas.on('object:modified', changed)
    canvas.on('object:removed', changed)
    canvas.on('text:changed', changed)

    const fitCanvas = () => {
      const stage = stageElementRef.current
      if (!stage) return
      const bounds = stage.getBoundingClientRect()
      const scale = Math.min((bounds.width - 96) / canvas.getWidth(), (bounds.height - 96) / canvas.getHeight(), 1.5)
      setFitScale(Math.max(0.08, scale))
    }
    const resizeObserver = new ResizeObserver(fitCanvas)
    fitCanvas()
    if (stageElementRef.current) resizeObserver.observe(stageElementRef.current)

    return () => {
      resizeObserver.disconnect()
      if (historyTimerRef.current) clearTimeout(historyTimerRef.current)
      void canvas.dispose()
      canvasRef.current = null
    }
  }, [recordHistory, syncHistoryControls, syncObjects])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const drawing = activeTool === 'shapes'
    canvas.selection = !drawing
    canvas.skipTargetFind = false
    canvas.defaultCursor = drawing ? 'crosshair' : 'default'
    canvas.hoverCursor = 'move'

    const handlePointerDown = (event: { e: TPointerEvent }) => {
      if (!drawing || !hasDocument) return
      if (canvas.findTarget(event.e)) return
      const start = canvas.getPointer(event.e)
      shapeDrawingRef.current = { start, preview: null }
      suppressHistoryRef.current = true
      const preview = buildShapeObject({ kind: shapeKind, fill: fillColor, transparentFill, stroke: strokeColor, strokeWidth, opacity: shapeOpacity, name: shapeNames[shapeKind] }, { left: start.x, top: start.y, width: 1, height: 1 })
      shapeDrawingRef.current.preview = preview
      canvas.add(preview)
      canvas.requestRenderAll()
    }
    const handlePointerMove = (event: { e: TPointerEvent }) => {
      const drawingState = shapeDrawingRef.current
      if (!drawing || !drawingState) return
      const point = canvas.getPointer(event.e)
      const left = Math.min(drawingState.start.x, point.x)
      const top = Math.min(drawingState.start.y, point.y)
      const width = Math.max(1, Math.abs(point.x - drawingState.start.x))
      const height = Math.max(1, Math.abs(point.y - drawingState.start.y))
      if (drawingState.preview) canvas.remove(drawingState.preview)
      const preview = buildShapeObject({ kind: shapeKind, fill: fillColor, transparentFill, stroke: strokeColor, strokeWidth, opacity: shapeOpacity, name: shapeNames[shapeKind] }, { left, top, width, height })
      drawingState.preview = preview
      canvas.add(preview)
      canvas.requestRenderAll()
    }
    const handlePointerUp = () => {
      const drawingState = shapeDrawingRef.current
      if (!drawing || !drawingState) return
      shapeDrawingRef.current = null
      const preview = drawingState.preview
      if (!preview || (preview.getScaledWidth() < 4 && preview.getScaledHeight() < 4)) {
        if (preview) canvas.remove(preview)
        suppressHistoryRef.current = false
        canvas.requestRenderAll()
        return
      }
      preview.set({ selectable: true, evented: true })
      canvas.setActiveObject(preview)
      canvas.requestRenderAll()
      suppressHistoryRef.current = false
      recordHistory(true)
      syncObjects()
    }

    canvas.on('mouse:down', handlePointerDown)
    canvas.on('mouse:move', handlePointerMove)
    canvas.on('mouse:up', handlePointerUp)
    return () => {
      canvas.off('mouse:down', handlePointerDown)
      canvas.off('mouse:move', handlePointerMove)
      canvas.off('mouse:up', handlePointerUp)
      if (shapeDrawingRef.current?.preview) canvas.remove(shapeDrawingRef.current.preview)
      shapeDrawingRef.current = null
      suppressHistoryRef.current = false
      canvas.skipTargetFind = false
      canvas.selection = true
    }
  }, [activeTool, fillColor, hasDocument, recordHistory, shapeKind, shapeOpacity, strokeColor, strokeWidth, syncObjects, transparentFill])

  useEffect(() => {
    const timer = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(timer)
  }, [notice])

  const resizeDisplay = useCallback(() => {
    const canvas = canvasRef.current
    const stage = stageElementRef.current
    if (!canvas || !stage) return
    const bounds = stage.getBoundingClientRect()
    const scale = Math.max(0.08, Math.min((bounds.width - 96) / canvas.getWidth(), (bounds.height - 96) / canvas.getHeight(), 1.5))
    setFitScale(scale)
  }, [])

  const fitToScreen = () => {
    setZoom(1)
    resizeDisplay()
  }

  const restoreScene = (snapshot: EditorSnapshot) => {
    const scene = snapshot.scene as { objects?: Array<{ src?: string }> }
    scene.objects?.forEach((object) => {
      if (object.src === IMAGE_SOURCE_TOKEN) object.src = imageSourceRef.current
    })
    return scene
  }

  const deleteImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const image = imageObjectRef.current
    if (!image) return
    canvas.remove(image)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    imageObjectRef.current = null
    setHasImage(false)
    recordHistory(true)
  } 

  const undo = useCallback(async () => {
    if (historyIndexRef.current <= 0) return
    historyIndexRef.current -= 1
    const canvas = canvasRef.current
    if (!canvas) return
    suppressHistoryRef.current = true
    const snapshot = JSON.parse(historyRef.current[historyIndexRef.current]) as EditorSnapshot
    canvas.setDimensions({ width: snapshot.width, height: snapshot.height })
    await canvas.loadFromJSON(restoreScene(snapshot))
    canvas.requestRenderAll()
    suppressHistoryRef.current = false
    setDimensions({ width: snapshot.width, height: snapshot.height })
    resizeDisplay()
    syncObjects()
    syncHistoryControls()
    setHistoryVersion((value) => value + 1)
  }, [resizeDisplay, syncHistoryControls, syncObjects])

  const redo = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return
    historyIndexRef.current += 1
    const canvas = canvasRef.current
    if (!canvas) return
    suppressHistoryRef.current = true
    const snapshot = JSON.parse(historyRef.current[historyIndexRef.current]) as EditorSnapshot
    canvas.setDimensions({ width: snapshot.width, height: snapshot.height })
    await canvas.loadFromJSON(restoreScene(snapshot))
    canvas.requestRenderAll()
    suppressHistoryRef.current = false
    setDimensions({ width: snapshot.width, height: snapshot.height })
    resizeDisplay()
    syncObjects()
    syncHistoryControls()
    setHistoryVersion((value) => value + 1)
  }, [resizeDisplay, syncHistoryControls, syncObjects])

  const uploadFile = async (file?: File) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setNotice('Choose a PNG, JPG, or WebP image.')
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      setNotice('Images must be smaller than 30 MB.')
      return
    }
    try {
      const { image, source, dimensions: imageDimensions, thumbnail } = await loadLocalImage(file)
      const { width, height } = imageDimensions
      const canvas = canvasRef.current
      if (!canvas) return
      imageSourceRef.current = source
      suppressHistoryRef.current = true
      canvas.clear()
      cropObjectRef.current = null
      imageObjectRef.current = image
      canvas.setDimensions({ width, height })
      canvas.backgroundColor = 'rgba(0,0,0,0)'
      image.set({ left: 0, top: 0, originX: 'left', originY: 'top', selectable: false, evented: false, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true })
      image.set('name', file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Image')
      canvas.add(image)
      canvas.sendObjectToBack(image)
      canvas.discardActiveObject()
      canvas.requestRenderAll()
      setDimensions({ width, height })
      setHasDocument(true)
      setImageThumbnail(thumbnail)
      setBrightness(0)
      setContrast(0)
      setSaturation(0)
      setZoom(1)
      resizeDisplay()
      suppressHistoryRef.current = false
      historyRef.current = [serializeCanvas(canvas)]
      historyIndexRef.current = 0
      syncHistoryControls()
      setHistoryVersion((value) => value + 1)
      syncObjects()
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The image could not be opened. Try another file.')
    } finally {
      setDraggingFile(false)
    }
  }

  const createText = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    createTextObject(canvas, { value: textValue, fontFamily, fontSize, color: textColor, opacity: textOpacity, outline: textOutline, outlineWidth: textOutlineWidth, shadow: textShadow })
    recordHistory(true)
    setActiveTool('text')
  }

  const addShape = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    createShapeObject(canvas, { kind: shapeKind, fill: fillColor, transparentFill, stroke: strokeColor, strokeWidth, opacity: shapeOpacity, name: shapeNames[shapeKind] })
    recordHistory(true)
  }


  const beginCrop = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDocument || cropObjectRef.current) return
    const cropFrame = createCropFrame(canvas)
    cropTransformChangedRef.current = false
    cropObjectRef.current = cropFrame
    setCropActive(true)
    suppressHistoryRef.current = true
    canvas.add(cropFrame)
    suppressHistoryRef.current = false
    canvas.setActiveObject(cropFrame)
    canvas.requestRenderAll()
    setActiveTool('crop')
  }

  const changeCropRatio = (ratioName: string) => {
    setCropRatio(ratioName)
    const cropFrame = cropObjectRef.current
    const canvas = canvasRef.current
    if (!cropFrame || !canvas) return
    updateCropRatio(canvas, cropFrame, ratioName)
  }

  const flipImage = (axis: 'horizontal' | 'vertical') => {
    const image = imageObjectRef.current
    const canvas = canvasRef.current
    if (!image || !canvas) return
    const property = axis === 'horizontal' ? 'flipX' : 'flipY'
    image.set(property, !image[property])
    image.setCoords()
    canvas.requestRenderAll()
    cropTransformChangedRef.current = true
  }

  const setImageRotation = (angle: number) => {
    const image = imageObjectRef.current
    const canvas = canvasRef.current
    if (!image || !canvas) return
    const nextAngle = Math.max(-180, Math.min(180, Math.round(angle)))
    const center = image.getCenterPoint()
    image.set('angle', nextAngle)
    image.setPositionByOrigin(center, 'center', 'center')
    image.setCoords()
    setCropRotation(nextAngle)
    canvas.requestRenderAll()
    cropTransformChangedRef.current = true
  }

  const applyCrop = () => {
    const canvas = canvasRef.current
    const cropFrame = cropObjectRef.current
    if (!canvas || !cropFrame) return
    suppressHistoryRef.current = true
    const cropDimensions = applyCanvasCrop(canvas, cropFrame, imageObjectRef.current)
    if (!cropDimensions) {
      suppressHistoryRef.current = false
      return
    }
    cropObjectRef.current = null
    setCropActive(false)
    setDimensions(cropDimensions)
    setResizeWidth(cropDimensions.width)
    setResizeHeight(cropDimensions.height)
    setActiveTool('select')
    suppressHistoryRef.current = false
    cropTransformChangedRef.current = false
    recordHistory(true)
    syncObjects()
    resizeDisplay()
  }

  const cancelCrop = useCallback(() => {
    const canvas = canvasRef.current
    const cropFrame = cropObjectRef.current
    if (!canvas || !cropFrame) return
    suppressHistoryRef.current = true
    canvas.remove(cropFrame)
    cropObjectRef.current = null
    setCropActive(false)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    suppressHistoryRef.current = false
    setActiveTool('select')
    if (cropTransformChangedRef.current) recordHistory(true)
    cropTransformChangedRef.current = false
  }, [recordHistory])

  const applyResize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = Math.min(12000, Math.max(1, Math.round(resizeWidth)))
    const height = Math.min(12000, Math.max(1, Math.round(resizeHeight)))
    const scaleX = width / canvas.getWidth()
    const scaleY = height / canvas.getHeight()
    if (scaleArtwork) {
      canvas.getObjects().forEach((object) => {
        object.set({ left: (object.left ?? 0) * scaleX, top: (object.top ?? 0) * scaleY, scaleX: (object.scaleX ?? 1) * scaleX, scaleY: (object.scaleY ?? 1) * scaleY })
        object.setCoords()
      })
    }
    canvas.setDimensions({ width, height })
    canvas.requestRenderAll()
    setDimensions({ width, height })
    setResizeWidth(width)
    setResizeHeight(height)
    recordHistory(true)
    resizeDisplay()
  }


  // resize 
  const updateResizeWidth = (value: number) => {
    setResizeWidth(value)
    if (keepRatio && dimensions.width) setResizeHeight(Math.round(value * dimensions.height / dimensions.width))
  }

  const updateResizeHeight = (value: number) => {
    setResizeHeight(value)
    if (keepRatio && dimensions.height) setResizeWidth(Math.round(value * dimensions.width / dimensions.height))
  }

  const updateText = (property: TextProperty, value: string | number) => {
    const active = canvasRef.current?.getActiveObject()
    if (!(active instanceof IText)) return
    if (property === 'shadow') {
      const shadow = value === 'none' ? null : new Shadow({ color: 'rgba(12, 20, 17, 0.48)', blur: value === 'soft' ? 12 : 3, offsetX: 2, offsetY: value === 'soft' ? 5 : 3 })
      active.set('shadow', shadow)
    } else active.set(property, value)
    active.setCoords()
    canvasRef.current?.requestRenderAll()
    recordHistory()
    if (property === 'text') setTextValue(String(value))
  }

  const applyAdjustments = (nextBrightness = brightness, nextContrast = contrast, nextSaturation = saturation) => {
    const image = imageObjectRef.current
    if (!image) return
    applyImageAdjustments(image, nextBrightness, nextContrast, nextSaturation)
    canvasRef.current?.requestRenderAll()
    recordHistory()
  }

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()
    if (!canvas || !active) return
    if (active === imageObjectRef.current) imageObjectRef.current = null
    canvas.remove(active)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    recordHistory(true)
  }, [recordHistory])

    const duplicateSelected = async () => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()
    if (!canvas || !active) return
    const clone = await active.clone()
    clone.set({ left: (active.left ?? 0) + 24, top: (active.top ?? 0) + 24 })
    clone.set('name', `${objectName(active, 0)} copy`)
    canvas.add(clone)
    canvas.setActiveObject(clone)
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const selectLayer = (object: FabricObject) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setActiveObject(object)
    canvas.requestRenderAll()
  }

  const moveLayer = (object: FabricObject, direction: 'forward' | 'backward') => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (direction === 'forward') canvas.bringObjectForward(object)
    else if (object !== imageObjectRef.current) canvas.sendObjectBackwards(object)
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const updateShapeAppearance = (property: 'fill' | 'stroke' | 'strokeWidth' | 'opacity', value: string | number) => {
    if (!selectedObject || selectedIsImage || selectedObject instanceof IText || selectedObject === cropObjectRef.current) return
    selectedObject.set(property, value)
    canvasRef.current?.requestRenderAll()
    recordHistory()
  }

  const resetAdjustments = () => {
    setBrightness(0)
    setContrast(0)
    setSaturation(0)
    applyAdjustments(0, 0, 0)
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      if (target.matches('input, textarea, select') || target.isContentEditable) return
      const command = event.metaKey || event.ctrlKey
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) void redo()
        else void undo()
      } else if (command && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        void redo()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        deleteSelected()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo, deleteSelected])

  const openPreview = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setPreviewUrl(canvas.toDataURL({ format: 'png', multiplier: 1 }))
    setPreviewOpen(true)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDraggingFile(false)
    void uploadFile(event.dataTransfer.files[0])
  }


  const openFilePicker = () => uploadInputRef.current?.click()
  const selectedText = selectedObject instanceof IText ? selectedObject : null
  const selectedIsShape = Boolean(selectedObject && !selectedIsImage && !(selectedObject instanceof IText) && !cropActive)

  const contextValue: EditorContextValue = {
    canvas: {
      dimensions,
      hasDocument,
      hasImage,
      imageThumbnail,
      selected: selectedObject,
      objects,
      selectedIsImage,
      zoom,
      setZoom,
      fitScale,
      fitToScreen,
    },
    history: { canUndo, canRedo, undo: () => void undo(), redo: () => void redo() },
    project: { name: projectName, setName: setProjectName, isRenaming, setIsRenaming },
    tools: { active: activeTool, setActive: setActiveTool, openFilePicker, uploadFile, beginCrop, setDraggingFile, notice, setNotice,deleteImage },
    crop: {
      active: cropActive,
      ratio: cropRatio,
      rotation: cropRotation,
      setRatio: setCropRatio,
      changeRatio: changeCropRatio,
      flipHorizontal: () => flipImage('horizontal'),
      flipVertical: () => flipImage('vertical'),
      setRotation: setImageRotation,
      apply: applyCrop,
      cancel: cancelCrop,
    },
    resize: { width: resizeWidth, height: resizeHeight, setWidth: updateResizeWidth, setHeight: updateResizeHeight, keepRatio, setKeepRatio, scaleArtwork, setScaleArtwork, apply: applyResize },
    text: { selected: selectedText, value: textValue, fontFamily, setFontFamily, fontSize, setFontSize, color: textColor, setColor: setTextColor, background: textBackground, setBackground: setTextBackground, opacity: textOpacity, setOpacity: setTextOpacity, outline: textOutline, setOutline: setTextOutline, outlineWidth: textOutlineWidth, setOutlineWidth: setTextOutlineWidth, shadow: textShadow, setShadow: setTextShadow, add: createText, update: updateText },
    shapes: { selected: selectedObject, isSelectedShape: selectedIsShape, kind: shapeKind, setKind: setShapeKind, fill: fillColor, setFill: setFillColor, transparentFill, setTransparentFill, stroke: strokeColor, setStroke: setStrokeColor, strokeWidth, setStrokeWidth, opacity: shapeOpacity, setOpacity: setShapeOpacity, add: addShape, duplicate: duplicateSelected, delete: deleteSelected, updateAppearance: updateShapeAppearance, moveLayer, selectLayer },
    adjustments: { brightness, setBrightness, contrast, setContrast, saturation, setSaturation, apply: applyAdjustments, reset: resetAdjustments },
    preview: { open: previewOpen, imageUrl: previewUrl, show: openPreview, close: () => setPreviewOpen(false) },
    draggingFile,
    handleDrop,
  }

  return (
    <EditorContext.Provider value={contextValue}>
      <main className="editor-app" onDragOver={(event) => { event.preventDefault(); setDraggingFile(true) }} onDragLeave={(event) => { if (event.currentTarget === event.target) setDraggingFile(false) }} onDrop={handleDrop}>
        <EditorHeader />
        <input ref={setUploadInputElement} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(event) => { void uploadFile(event.target.files?.[0]); event.currentTarget.value = '' }} />
        <section className="editor-body"><ToolRail /><ToolPanel /><EditorWorkspace setCanvasElement={setCanvasElement} setStageElement={setStageElement} /></section>
        <EditorNotice />
        <PreviewDialog />
        <span className="visually-hidden" aria-live="polite">{historyVersion > 0 ? 'Document updated' : ''}</span>
      </main>
    </EditorContext.Provider>
  )
}

export default App