
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Canvas,
  FabricImage,
  Rect,
  PencilBrush,
  type FabricObject,
} from 'fabric'

import { EditorContext } from './features/editor/EditorContext'
import {
  EditorNotice,
  PreviewDialog,
} from './features/editor/components/EditorDialogs'
import { EditorHeader } from './features/editor/components/EditorHeader'
import { ToolPanel } from './features/editor/components/ToolPanel'
import { ToolRail } from './features/editor/components/ToolRail'
import { EditorWorkspace } from './features/editor/components/EditorWorkspace'
import { BACKGROUND_IMAGE_NAME,
  IMAGE_SOURCE_TOKEN, resolveImageSourceToken,
  serializeCanvas,
} from './features/editor/model/constants'
import { applyImageAdjustments } from './features/editor/operations/imageAdjustments'
import { applyCanvasCrop, createCropFrame, updateCropRatio } from './features/editor/operations/cropCanvas'
import { loadLocalImage } from './features/editor/operations/loadLocalImage'
import type { DrawingMode,
  EditorContextValue,
  EditorTool, FilterId,
  VideoAudioDraft, VideoPreviewData,
} from './features/editor/model/types'
import { hasTransparentPixels, removeImageBackground } from './features/editor/operations/removeImageBackground'
import { editImagePixels, type EditPoint } from './features/editor/operations/editImagePixels'
import { restartAnimatedStickers } from './features/editor/operations/animatedSticker'

import './App.css'

type EditorSnapshot = {
  width: number
  height: number
  scene: Parameters<Canvas['loadFromJSON']>[0]
  editor?: {
    filterId: FilterId
    filterIntensity: number
    backgroundRemoved?: boolean
    backgroundColor?: string
  }
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
  const drawingLayerCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const drawingLayerImageRef = useRef<FabricImage | null>(null)
  const imageSourceRef = useRef('')
  const cropTransformChangedRef = useRef(false)
  const selectedFilterRef = useRef<FilterId>('original')
  const filterIntensityRef = useRef(100)
  const backgroundRemovedRef = useRef(false)
  const backgroundColorRef = useRef('#ffffff')
  const activeToolRef = useRef<EditorTool>('upload')
  const activeDrawingModeRef = useRef<DrawingMode>('pencil')
  const drawingColorRef = useRef('#222222')
  const brushSizeRef = useRef(12)
  const gesturePointsRef = useRef<EditPoint[]>([])
  const lassoPointsRef = useRef<EditPoint[]>([])
  const lassoPreviewObjectsRef = useRef<FabricObject[]>([])
  const isGestureDrawingRef = useRef(false)
  const magicCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const magicContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const magicImageRef = useRef<FabricImage | null>(null)
  
  

  // Actual Fabric.js canvas exposed through EditorContext.
  const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null)

  const setCanvasElement = useCallback(
    (element: HTMLCanvasElement | null) => {
      canvasElementRef.current = element
    },
    [],
  )

  const setStageElement = useCallback(
    (element: HTMLDivElement | null) => {
      stageElementRef.current = element
    },
    [],
  )

  const setUploadInputElement = useCallback(
    (element: HTMLInputElement | null) => {
      uploadInputRef.current = element
    },
    [],
  )

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
  const [previewMode, setPreviewMode] = useState<'image' | 'video'>('image')
  const [videoPreview, setVideoPreview] = useState<VideoPreviewData | null>(null)
  const [videoAudio, setVideoAudio] = useState<VideoAudioDraft>({
    music: { file: null, url: '', duration: 0 },
    voice: { file: null, url: '', duration: 0 },
    startTime: 0,
    endTime: 0,
    musicVolume: 80,
    voiceVolume: 100,
  })
  const [dimensions, setDimensions] = useState({
    width: 1200,
    height: 800,
  })
  const [selectedFilter, setSelectedFilter] = useState<FilterId>('original')
  const [filterIntensity, setFilterIntensity] = useState(100)
  const [backgroundRemoved, setBackgroundRemoved] = useState(false)
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [backgroundProgress, setBackgroundProgress] = useState('')
  const [backgroundColor, setBackgroundColorState] = useState('#ffffff')
  const [drawingColor, setDrawingColor] = useState('#222222')
  const [brushSize, setBrushSize] = useState(12)
  const [activeDrawingMode, setActiveDrawingMode] = useState<DrawingMode>('pencil')
  

  const syncObjects = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const canvasObjects = canvas.getObjects()
    const image = canvasObjects.find((item) => item instanceof FabricImage && item.get('name') !== BACKGROUND_IMAGE_NAME)

    imageObjectRef.current = image instanceof FabricImage ? image : null
    setCropRotation(image instanceof FabricImage ? Math.round(image.angle || 0) : 0)

    setHasImage(Boolean(image))
    setObjects(
      canvasObjects.filter((item) => item !== cropObjectRef.current),
    )

    const active = canvas.getActiveObject() ?? null
    setSelectedObject(active)
    setSelectedIsImage(active === imageObjectRef.current)
  }, [])

  const serializeEditorSnapshot = useCallback((canvas: Canvas) => {
    const base = JSON.parse(serializeCanvas(canvas))

    return JSON.stringify({
      ...base,
      editor: {
        filterId: selectedFilterRef.current,
        filterIntensity: filterIntensityRef.current,
        backgroundRemoved: backgroundRemovedRef.current,
        backgroundColor: backgroundColorRef.current,
      },
    })
  }, [])

  const syncHistoryControls = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  const recordHistory = useCallback(
    (immediate = false) => {
      const canvas = canvasRef.current
      if (!canvas || suppressHistoryRef.current) return

      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current)
      }

      const saveSnapshot = () => {
        const current = serializeEditorSnapshot(canvas)
        const history = historyRef.current.slice(
          0,
          historyIndexRef.current + 1,
        )

        if (history.at(-1) === current) return

        history.push(current)

        if (history.length > 60) {
          history.shift()
        }

        historyRef.current = history
        historyIndexRef.current = history.length - 1

        syncHistoryControls()
        setHistoryVersion((value) => value + 1)
        syncObjects()
      }

      if (immediate) {
        saveSnapshot()
      } else {
        historyTimerRef.current = setTimeout(saveSnapshot, 220)
      }
    },
    [syncHistoryControls, syncObjects],
  )

  useEffect(() => {
    activeToolRef.current = activeTool
    activeDrawingModeRef.current = activeDrawingMode
    drawingColorRef.current = drawingColor
    brushSizeRef.current = brushSize
  }, [activeTool, activeDrawingMode, drawingColor, brushSize])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const isDrawingMode = activeTool === 'draw-remove' && hasImage && activeDrawingMode === 'lasso'
    if (activeTool === 'draw-remove') {
      canvas.discardActiveObject()
      canvas.requestRenderAll()
    }
    canvas.isDrawingMode = isDrawingMode
    canvas.selection = activeTool !== 'draw-remove'
    canvas.skipTargetFind = activeTool === 'draw-remove'
    if (isDrawingMode) {
      const brush = new PencilBrush(canvas)

      brush.color = '#3984ff'

      brush.width = 2
      canvas.freeDrawingBrush = brush
    }
    return () => {
      canvas.isDrawingMode = false
      canvas.selection = true
      canvas.skipTargetFind = false
    }
  }, [activeTool, activeDrawingMode, drawingColor, brushSize, hasDocument, hasImage])

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
    setFabricCanvas(canvas)

    historyRef.current = [serializeEditorSnapshot(canvas)]
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
    canvas.on('path:created', (event) => {
      if (activeToolRef.current !== 'draw-remove') return

      if (activeDrawingModeRef.current === 'lasso') {
        event.path.set('name', '__pixel_studio_lasso_preview__')
        lassoPreviewObjectsRef.current.push(event.path)
      }
    })

    const fitCanvas = () => {
      const stage = stageElementRef.current
      if (!stage) return

      const bounds = stage.getBoundingClientRect()
      const scale = Math.min(
        (bounds.width - 96) / canvas.getWidth(),
        (bounds.height - 96) / canvas.getHeight(),
        1.5,
      )

      setFitScale(Math.max(0.08, scale))
    }

    const resizeObserver = new ResizeObserver(fitCanvas)

    fitCanvas()

    if (stageElementRef.current) {
      resizeObserver.observe(stageElementRef.current)
    }

    return () => {
      resizeObserver.disconnect()

      if (historyTimerRef.current) {
        clearTimeout(historyTimerRef.current)
      }

      void canvas.dispose()

      if (canvasRef.current === canvas) {
        canvasRef.current = null
        setFabricCanvas(null)
      }
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
    const scale = Math.max(
      0.08,
      Math.min(
        (bounds.width - 96) / canvas.getWidth(),
        (bounds.height - 96) / canvas.getHeight(),
        1.5,
      ),
    )

    setFitScale(scale)
  }, [])

  const fitToScreen = () => {
    setZoom(1)
    resizeDisplay()
  }

  const restoreScene = (snapshot: EditorSnapshot) => {
    const scene = snapshot.scene as { objects?: Array<{ src?: string }> }

    scene.objects?.forEach((object) => {
      if (object.src === IMAGE_SOURCE_TOKEN) {
        object.src = imageSourceRef.current
      }
      else if (typeof object.src === 'string') { object.src = resolveImageSourceToken(object.src) ?? object.src }
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

    try {
      const snapshot = JSON.parse(
        historyRef.current[historyIndexRef.current],
      ) as EditorSnapshot

      canvas.setDimensions({
        width: snapshot.width,
        height: snapshot.height,
      })

      await canvas.loadFromJSON(restoreScene(snapshot))
      restartAnimatedStickers(canvas)
      canvas.requestRenderAll()

      setDimensions({
        width: snapshot.width,
        height: snapshot.height,
      })
    const restoredBackgroundRemoved = snapshot.editor?.backgroundRemoved ?? false
    const restoredBackgroundColor = snapshot.editor?.backgroundColor ?? '#ffffff'
    backgroundRemovedRef.current = restoredBackgroundRemoved
    backgroundColorRef.current = restoredBackgroundColor
    setBackgroundRemoved(restoredBackgroundRemoved)
    setBackgroundColorState(restoredBackgroundColor)
    const restoredFilter = snapshot.editor?.filterId ?? 'original'
    const restoredIntensity = snapshot.editor?.filterIntensity ?? 100
    selectedFilterRef.current = restoredFilter
    filterIntensityRef.current = restoredIntensity
    setSelectedFilter(restoredFilter)
    setFilterIntensity(restoredIntensity)

      resizeDisplay()
      syncObjects()
      syncHistoryControls()
      setHistoryVersion((value) => value + 1)
    } finally {
      suppressHistoryRef.current = false
    }
  }, [resizeDisplay, syncHistoryControls, syncObjects])

  const redo = useCallback(async () => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return

    historyIndexRef.current += 1

    const canvas = canvasRef.current
    if (!canvas) return

    suppressHistoryRef.current = true

    try {
      const snapshot = JSON.parse(
        historyRef.current[historyIndexRef.current],
      ) as EditorSnapshot

      canvas.setDimensions({
        width: snapshot.width,
        height: snapshot.height,
      })

      await canvas.loadFromJSON(restoreScene(snapshot))
      restartAnimatedStickers(canvas)
      canvas.requestRenderAll()

      setDimensions({
        width: snapshot.width,
        height: snapshot.height,
      })
    const restoredBackgroundRemoved = snapshot.editor?.backgroundRemoved ?? false
    const restoredBackgroundColor = snapshot.editor?.backgroundColor ?? '#ffffff'
    backgroundRemovedRef.current = restoredBackgroundRemoved
    backgroundColorRef.current = restoredBackgroundColor
    setBackgroundRemoved(restoredBackgroundRemoved)
    setBackgroundColorState(restoredBackgroundColor)
    const restoredFilter = snapshot.editor?.filterId ?? 'original'
    const restoredIntensity = snapshot.editor?.filterIntensity ?? 100
    selectedFilterRef.current = restoredFilter
    filterIntensityRef.current = restoredIntensity
    setSelectedFilter(restoredFilter)
    setFilterIntensity(restoredIntensity)

      resizeDisplay()
      syncObjects()
      syncHistoryControls()
      setHistoryVersion((value) => value + 1)
    } finally {
      suppressHistoryRef.current = false
    }
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
      const {
        image,
        source,
        dimensions: imageDimensions,
        thumbnail,
      } = await loadLocalImage(file)

      const alreadyTransparent = await hasTransparentPixels(source)
      backgroundRemovedRef.current = alreadyTransparent
      backgroundColorRef.current = '#ffffff'
      setBackgroundRemoved(alreadyTransparent)
      setBackgroundColorState('#ffffff')
      setIsRemovingBackground(false)
      setBackgroundProgress('')
      const { width, height } = imageDimensions
      const canvas = canvasRef.current

      if (!canvas) return

      imageSourceRef.current = source
      suppressHistoryRef.current = true

      canvas.clear()
      cropObjectRef.current = null
      imageObjectRef.current = image
      drawingLayerCanvasRef.current = null
      drawingLayerImageRef.current = null
      lassoPreviewObjectsRef.current = []

      canvas.setDimensions({ width, height })
      canvas.backgroundColor = 'rgba(0,0,0,0)'

      image.set({
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
        selectable: true,
        evented: true,
      })

      image.set(
        'name',
        file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Image',
      )

      canvas.add(image)
      canvas.sendObjectToBack(image)
      canvas.setActiveObject(image)
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

      historyRef.current = [serializeEditorSnapshot(canvas)]
      historyIndexRef.current = 0

      syncHistoryControls()
      setHistoryVersion((value) => value + 1)
      syncObjects()
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : 'The image could not be opened. Try another file.',
      )
    } finally {
      suppressHistoryRef.current = false
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

  const cancelCrop = useCallback((nextTool: EditorTool = 'select') => {
    const canvas = canvasRef.current
    const cropFrame = cropObjectRef.current
    if (!canvas || !cropFrame) {
      setActiveTool(nextTool)
      return
    }
    suppressHistoryRef.current = true
    canvas.remove(cropFrame)
    cropObjectRef.current = null
    setCropActive(false)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    suppressHistoryRef.current = false
    setActiveTool(nextTool)
    if (cropTransformChangedRef.current) recordHistory(true)
    cropTransformChangedRef.current = false
  }, [recordHistory])

  const setActiveEditorTool = useCallback((tool: EditorTool) => {
    if (activeTool === 'crop' && tool !== 'crop') {
      cancelCrop(tool)
      return
    }
    setActiveTool(tool)
  }, [activeTool, cancelCrop])
  const applyAdjustments = (
    nextBrightness = brightness,
    nextContrast = contrast,
    nextSaturation = saturation,
  ) => {
    const image = imageObjectRef.current
    if (!image) return
    applyImageAdjustments(image, nextBrightness, nextContrast, nextSaturation, selectedFilterRef.current, filterIntensityRef.current,)
    canvasRef.current?.requestRenderAll()
    recordHistory()
  }

  const removeBackgroundFromImage = async () => {
  const canvas = canvasRef.current
  const image = imageObjectRef.current

  if (
    !canvas ||
    !image ||
    isRemovingBackground ||
    backgroundRemovedRef.current
  ) {
    return
  }

  setIsRemovingBackground(true)
  setBackgroundProgress('Preparing AI model...')

  try {
    const source = imageSourceRef.current

    if (!source) {
      throw new Error('The original image source is unavailable.')
    }

    const resultSource = await removeImageBackground(
      source,
      setBackgroundProgress,
    )

    // Replace the image source without replacing the Fabric object.
    await image.setSrc(resultSource)
    image.applyFilters()

    // Remove any previous custom background image.
    canvas
      .getObjects()
      .filter(
        (item) => item.get('name') === BACKGROUND_IMAGE_NAME,
      )
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
    setNotice(
      error instanceof Error
        ? error.message
        : 'Background removal failed. Please try again.',
    )
  } finally {
    setIsRemovingBackground(false)
    setBackgroundProgress('')
  }
}

const changeBackgroundColor = (color: string) => {
  backgroundColorRef.current = color
  setBackgroundColorState(color)

  const canvas = canvasRef.current

  if (!canvas || !backgroundRemovedRef.current) return

  // A solid color replaces a custom image background.
  canvas
    .getObjects()
    .filter(
      (item) => item.get('name') === BACKGROUND_IMAGE_NAME,
    )
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

    // Replace any existing custom background image.
    canvas
      .getObjects()
      .filter(
        (item) => item.get('name') === BACKGROUND_IMAGE_NAME,
      )
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

    // Keep transparency behind the subject.
    canvas.backgroundColor = 'rgba(0,0,0,0)'
    canvas.add(image)
    canvas.sendObjectToBack(image)

    // Ensure the subject stays above the background.
    const subject = imageObjectRef.current

    if (subject) {
      canvas.bringObjectToFront(subject)
    }

    canvas.requestRenderAll()

    recordHistory(true)
    syncObjects()

    setNotice('Custom background applied.')
  } catch (error) {
    setNotice(
      error instanceof Error
        ? error.message
        : 'Could not load the background image.',
    )
  }
}

const clearBackground = () => {
  const canvas = canvasRef.current

  if (!canvas || !backgroundRemovedRef.current) return

  canvas
    .getObjects()
    .filter(
      (item) => item.get('name') === BACKGROUND_IMAGE_NAME,
    )
    .forEach((item) => canvas.remove(item))

  canvas.backgroundColor = 'rgba(0,0,0,0)'
  canvas.requestRenderAll()

  recordHistory(true)
  syncObjects()

  setNotice('Background is now transparent.')
}

  const changeFilter = (id: FilterId) => {
    selectedFilterRef.current = id
    setSelectedFilter(id)

    applyAdjustments()
    recordHistory(true)
  }

  const changeFilterIntensity = (value: number) => {
    const next = Math.max(0, Math.min(100, value))

    filterIntensityRef.current = next
    setFilterIntensity(next)

    applyAdjustments()
    recordHistory(true)
  }

  const resetFilter = () => {
    selectedFilterRef.current = 'original'
    filterIntensityRef.current = 100

    setSelectedFilter('original')
    setFilterIntensity(100)

    applyAdjustments()
    recordHistory(true)
  }

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()

    if (!canvas || !active) return

    if (active === imageObjectRef.current) {
      imageObjectRef.current = null
    }

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

      if (
        target.matches('input, textarea, select') ||
        target.isContentEditable
      ) {
        return
      }

      const command = event.metaKey || event.ctrlKey

      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault()

        if (event.shiftKey) {
          void redo()
        } else {
          void undo()
        }
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


    const lassoPreviews = canvas.getObjects().filter(
      (object) => object.get('name') === '__pixel_studio_lasso_preview__',
    )
    const previousVisibility = lassoPreviews.map((object) => object.visible)

    lassoPreviews.forEach((object) => {
      object.visible = false
    })

    const previewUrl = (() => {
      try {
        return canvas.toDataURL({ format: 'png', multiplier: 1 })
      } finally {
        lassoPreviews.forEach((object, index) => {
          object.visible = previousVisibility[index]
        })
        canvas.requestRenderAll()
      }
    })()

    setPreviewUrl(previewUrl)
    setPreviewMode(videoPreview?.audioUrl ? 'video' : 'image')
    setPreviewOpen(true)
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

  const createVisibleImageCanvas = (image: FabricImage) => {
    const source = image.getElement()
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
  const canvas = canvasRef.current
  if (!canvas) return null

  const layer = canvas.getObjects().find(
    (object) => object.get('name') === '__pixel_studio_drawing_layer__',
  )
  let layerImage = layer instanceof FabricImage ? layer : null
  let layerCanvas = drawingLayerCanvasRef.current

  if (!layerImage) {
    layerCanvas = document.createElement('canvas')
    layerCanvas.width = canvas.getWidth()
    layerCanvas.height = canvas.getHeight()
    layerImage = new FabricImage(layerCanvas, {
      left: 0,
      top: 0,
      originX: 'left',
      originY: 'top',
      selectable: false,
      evented: false,
    })
    layerImage.set('name', '__pixel_studio_drawing_layer__')
    canvas.add(layerImage)
    canvas.bringObjectToFront(layerImage)
  } else {
    const element = layerImage.getElement()
    if (element instanceof HTMLCanvasElement) {
      layerCanvas = element
    } else if (!layerCanvas || layerImage !== drawingLayerImageRef.current) {
      layerCanvas = document.createElement('canvas')
      layerCanvas.width = canvas.getWidth()
      layerCanvas.height = canvas.getHeight()
      const context = layerCanvas.getContext('2d')
      if (context) context.drawImage(element, 0, 0, layerCanvas.width, layerCanvas.height)
      layerImage.setElement(layerCanvas)
    }
  }

  drawingLayerCanvasRef.current = layerCanvas
  drawingLayerImageRef.current = layerImage
  return { canvas: layerCanvas, image: layerImage }
}, [])

const drawOnDrawingLayer = useCallback((points: EditPoint[], mode: 'pencil' | 'eraser') => {
  const layer = getDrawingLayer()
  const canvas = canvasRef.current
  const context = layer?.canvas.getContext('2d')
  if (!layer || !canvas || !context || points.length === 0) return

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
  canvas.requestRenderAll()
}, [getDrawingLayer])

const paintMagicRemoval = useCallback((from: EditPoint, to: EditPoint) => {
  const preview = magicCanvasRef.current
  const context = magicContextRef.current
  const image = magicImageRef.current
  const canvas = canvasRef.current
  if (!preview || !context || !image || !canvas) return

  const scaleX = preview.width / canvas.getWidth()
  const scaleY = preview.height / canvas.getHeight()
  const fromX = from.x * scaleX
  const fromY = from.y * scaleY
  const toX = to.x * scaleX
  const toY = to.y * scaleY

  context.save()
  context.globalCompositeOperation = 'destination-out'
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = brushSizeRef.current * ((scaleX + scaleY) / 2)
  context.beginPath()
  context.moveTo(fromX, fromY)
  context.lineTo(toX, toY)
  context.stroke()
  if (from.x === to.x && from.y === to.y) {
    context.beginPath()
    context.arc(fromX, fromY, context.lineWidth / 2, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()

  image.dirty = true
  canvas.requestRenderAll()
}, [])

const startMagicRemoval = useCallback((point: EditPoint) => {
  const canvas = canvasRef.current
  const image = imageObjectRef.current
  if (!canvas || !image) {
    setNotice('Upload an image before editing pixels.')
    return false
  }

  const preview = createVisibleImageCanvas(image)
  const context = preview.getContext('2d')
  if (!context) {
    setNotice('Could not edit this image.')
    return false
  }

  magicCanvasRef.current = preview
  magicContextRef.current = context
  magicImageRef.current = image
  image.setElement(preview)
  image.set({ cropX: 0, cropY: 0, width: preview.width, height: preview.height })
  image.dirty = true
  paintMagicRemoval(point, point)
  return true
}, [paintMagicRemoval])

const finishMagicRemoval = useCallback(async () => {
  const preview = magicCanvasRef.current
  const image = magicImageRef.current
  const canvas = canvasRef.current
  magicCanvasRef.current = null
  magicContextRef.current = null
  magicImageRef.current = null
  if (!preview || !image || !canvas) return

  try {
    await image.setSrc(preview.toDataURL('image/png'), {})
    image.setCoords()
    canvas.requestRenderAll()
    recordHistory(true)
    syncObjects()
    setNotice('Image area removed.')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Could not edit this image.')
  }
}, [recordHistory, syncObjects])

const applyPixelEdit = async (
  points: EditPoint[],
  mode: 'brush' | 'lasso',
) => {
  const canvas = canvasRef.current
  const image = imageObjectRef.current

  if (!canvas || !image) {
    setNotice('Upload an image before editing pixels.')
    return
  }

  try {
    const source = createVisibleImageCanvas(image).toDataURL('image/png')

    const editedSource = await editImagePixels(
      source,
      canvas.getWidth(),
      canvas.getHeight(),
      points,
      brushSizeRef.current,
      mode,
    )

    await image.setSrc(editedSource, {})
    image.set({ cropX: 0, cropY: 0 })
    image.setCoords()
    canvas.requestRenderAll()

    if (mode === 'brush') {
      recordHistory(true)
    } 
    syncObjects()

    setNotice(
      mode === 'brush'
        ? 'Image area erased.'
        : 'Selected image area removed.',
    )
  } catch (error) {
    setNotice(
      error instanceof Error
        ? error.message
        : 'Could not edit this image.',
    )
  }
}

const removeLassoPreview = () => {
  const canvas = canvasRef.current
  if (!canvas) return

  const previews = new Set([
    ...lassoPreviewObjectsRef.current,
    ...canvas.getObjects().filter(
      (object) => object.get('name') === '__pixel_studio_lasso_preview__',
    ),
  ])

  previews.forEach((object) => canvas.remove(object))
  lassoPreviewObjectsRef.current = []

  canvas.requestRenderAll()
}

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

 useEffect(() => {
  const canvas = canvasRef.current
  if (!canvas) return

  const onMouseDown = (event: {
    scenePoint?: { x: number; y: number }
  }) => {
    const point = event.scenePoint
    if (!point) return
    if (activeToolRef.current !== 'draw-remove') return
    if (!imageObjectRef.current) {
      setNotice('Upload an image before using drawing tools.')
      return
    }

    const mode = activeDrawingModeRef.current

    if (mode === 'pencil' || mode === 'eraser') {
      isGestureDrawingRef.current = true
      gesturePointsRef.current = [{ x: point.x, y: point.y }]
      drawOnDrawingLayer(gesturePointsRef.current, mode)
      return
    }

    if (mode === 'magic-remover') {
      if (!startMagicRemoval(point)) return
      isGestureDrawingRef.current = true
      gesturePointsRef.current = [{ x: point.x, y: point.y }]
      return
    }

    if (mode !== 'lasso') return

    isGestureDrawingRef.current = true
    gesturePointsRef.current = [{ x: point.x, y: point.y }]
  }

  const onMouseMove = (event: {
    scenePoint?: { x: number; y: number }
  }) => {
    const point = event.scenePoint
    if (!point || !isGestureDrawingRef.current) return

    const mode = activeDrawingModeRef.current

    if (mode === 'pencil' || mode === 'eraser') {
      const previousPoint = gesturePointsRef.current.at(-1)
      gesturePointsRef.current.push({ x: point.x, y: point.y })
      if (previousPoint) drawOnDrawingLayer([previousPoint, point], mode)
      return
    }

    if (mode === 'magic-remover') {
      const previousPoint = gesturePointsRef.current.at(-1)
      gesturePointsRef.current.push({ x: point.x, y: point.y })
      if (previousPoint) paintMagicRemoval(previousPoint, point)
    } else if (mode === 'lasso') {
      gesturePointsRef.current.push({
        x: point.x,
        y: point.y,
      })
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
}, [activeTool, drawOnDrawingLayer, finishMagicRemoval, hasDocument, paintMagicRemoval, recordHistory, startMagicRemoval])

  const contextValue: EditorContextValue = {
    fabricCanvas,

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

    history: {
      canUndo,
      canRedo,
      undo: () => void undo(),
      redo: () => void redo(),
    },

    project: {
      name: projectName,
      setName: setProjectName,
      isRenaming,
      setIsRenaming,
    },

    tools: {
      active: activeTool,
      setActive: setActiveEditorTool,
      openFilePicker,
      uploadFile, beginCrop,
      setDraggingFile,
      notice,
      setNotice,
      deleteImage,
    },
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

    adjustments: {
      brightness,
      setBrightness,
      contrast,
      setContrast,
      saturation,
      setSaturation,
      apply: applyAdjustments,
      reset: resetAdjustments,
    },

    preview: {
      open: previewOpen,
      imageUrl: previewUrl,
      mode: previewMode,
      video: videoPreview,
      setVideo: setVideoPreview,
      show: openPreview,
      close: () => setPreviewOpen(false),
    },
    videoAudio,
    setVideoAudio,

    draggingFile,
    handleDrop,
    filters: {
      selected: selectedFilter,
      intensity: filterIntensity,
      setFilter: changeFilter,
      setIntensity: changeFilterIntensity,
      reset: resetFilter,
    },
    background: {
      removed: backgroundRemoved,
      isRemoving: isRemovingBackground,
      progress: backgroundProgress,
      color: backgroundColor,
      setColor: changeBackgroundColor,
      remove: removeBackgroundFromImage,
      uploadBackground,
      clearBackground,
    },
    drawing: {
      activeMode: activeDrawingMode,
      setActiveMode: setActiveDrawingMode,
      color: drawingColor,
      setColor: setDrawingColor,
      brushSize,
      setBrushSize,
      clearSelection,
      deleteSelection,
    },
  }

  return (
    <EditorContext.Provider value={contextValue}>
      <main
        className="editor-app"
        onDragOver={(event) => {
          event.preventDefault()
          setDraggingFile(true)
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) {
            setDraggingFile(false)
          }
        }}
        onDrop={handleDrop}
      >
        <EditorHeader />

        <input
          ref={setUploadInputElement}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            void uploadFile(event.target.files?.[0])
            event.currentTarget.value = ''
          }}
        />

        <section className="editor-body">
          <ToolRail />
          <ToolPanel />
          <EditorWorkspace
            setCanvasElement={setCanvasElement}
            setStageElement={setStageElement}
          />
        </section>

        <EditorNotice />
        <PreviewDialog />

        <span className="visually-hidden" aria-live="polite">
          {historyVersion > 0 ? 'Document updated' : ''}
        </span>
      </main>
    </EditorContext.Provider>
  )
}

export default App
