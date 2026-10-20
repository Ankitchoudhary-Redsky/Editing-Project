import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Canvas,
  FabricImage,
  Rect,
  type FabricObject,
} from 'fabric'
import { EditorContext } from './features/editor/EditorContext'
import { EditorNotice, PreviewDialog } from './features/editor/components/EditorDialogs'
import { EditorHeader } from './features/editor/components/EditorHeader'
import { ToolPanel } from './features/editor/components/ToolPanel'
import { ToolRail } from './features/editor/components/ToolRail'
import { EditorWorkspace } from './features/editor/components/EditorWorkspace'
import { IMAGE_SOURCE_TOKEN, serializeCanvas } from './features/editor/model/constants'
import { applyImageAdjustments } from './features/editor/operations/imageAdjustments'
import { applyCanvasCrop, createCropFrame, updateCropRatio } from './features/editor/operations/cropCanvas'
import { loadLocalImage } from './features/editor/operations/loadLocalImage'
import type { EditorContextValue, EditorTool } from './features/editor/model/types'
import './App.css'

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
  const [cropActive, setCropActive] = useState(false)
  const [cropRatio, setCropRatio] = useState('Free')
  const [cropRotation, setCropRotation] = useState(0)
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
      image.set({ left: 0, top: 0, originX: 'left', originY: 'top', selectable: true, evented: true })
      image.set('name', file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Image')
      canvas.add(image)
      canvas.sendObjectToBack(image)
      canvas.setActiveObject(image)
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