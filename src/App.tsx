
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Canvas,
  FabricImage,
  IText,
  Rect,
  PencilBrush,
  Shadow,
  type FabricObject,
  type TPointerEvent,
} from 'fabric'

import { EditorContext } from './features/editor/EditorContext'
import {
  EditorNotice,
  ExportDialog,
  PreviewDialog,
} from './features/editor/components/EditorDialogs'
import { EditorHeader } from './features/editor/components/EditorHeader'
import { ToolPanel } from './features/editor/components/ToolPanel'
import { ToolRail } from './features/editor/components/ToolRail'
import { EditorWorkspace } from './features/editor/components/EditorWorkspace'
import { BACKGROUND_IMAGE_NAME,
  IMAGE_SOURCE_TOKEN, resolveImageSourceToken,
  serializeCanvas, shapeNames,
} from './features/editor/model/constants'
import { applyImageAdjustments } from './features/editor/operations/imageAdjustments'
import { applyCanvasCrop, createCropFrame, updateCropRatio } from './features/editor/operations/cropCanvas'
import { loadLocalImage } from './features/editor/operations/loadLocalImage'
import type { DrawingMode,
  EditorContextValue,
  EditorTool, ShapeKind, TextProperty, FilterId,
  VideoAudioDraft, VideoPreviewData,
  ExportFormat,
} from './features/editor/model/types'
import { hasTransparentPixels, removeImageBackground } from './features/editor/operations/removeImageBackground'
import { editImagePixels, type EditPoint } from './features/editor/operations/editImagePixels'
import { restartAnimatedStickers } from './features/editor/operations/animatedSticker'

import './App.css'
import { buildShapeObject, createShapeObject } from './features/editor/operations/shapeObjects'
import { createTextObject } from './features/editor/operations/textObjects'
import { objectName } from './features/editor/model/objectName'
import { loadProjectDraft, saveProjectDraft } from './features/editor/operations/projectStorage'
import { drawProjectWatermark } from './features/editor/operations/projectWatermark'

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

type PersistedEditorDraft = EditorSnapshot & {
  projectName: string
  activeTool: EditorTool
  zoom: number
  selectedFilter: FilterId
  filterIntensity: number
  backgroundRemoved: boolean
  backgroundColor: string
  drawingColor: string
  brushSize: number
  activeDrawingMode: DrawingMode
  brightness: number
  contrast: number
  saturation: number
  videoAudio: VideoAudioDraft
  resizeWidth: number
  resizeHeight: number
  keepRatio: boolean
  scaleArtwork: boolean
  textValue: string
  fontFamily: string
  fontSize: number
  textColor: string
  textBackground: string
  textOpacity: number
  textOutline: string
  textOutlineWidth: number
  textShadow: string
  shapeKind: ShapeKind
  fillColor: string
  transparentFill: boolean
  strokeColor: string
  strokeWidth: number
  shapeOpacity: number
  exportFormat: ExportFormat
  exportScale: number
  exportWatermark: boolean
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
  const shapeDrawingRef = useRef<{ start: { x: number; y: number }; preview: FabricObject | null } | null>(null)
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
  const userEditedBeforeDraftLoadRef = useRef(false)
  
  

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
  const [resizeWidth, setResizeWidth] = useState(1200)
  const [resizeHeight, setResizeHeight] = useState(800)
  const [keepRatio, setKeepRatio] = useState(true)
  const [scaleArtwork, setScaleArtwork] = useState(true)
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
  const [draftReady, setDraftReady] = useState(false)

  //export
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
  const [exportScale, setExportScale] = useState(1)
  const [exportWatermark, setExportWatermark] = useState(true)
  const [exportBusy, setExportBusy] = useState(false)

  

  const syncObjects = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const canvasObjects = canvas.getObjects()
    const image = canvasObjects.find((item) => item instanceof FabricImage && item.get('name') !== BACKGROUND_IMAGE_NAME)
    image?.set({ selectable: false, evented: false, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true })
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
    [serializeEditorSnapshot, syncHistoryControls, syncObjects],
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

    let disposed = false
    void loadProjectDraft<PersistedEditorDraft>()
      .then(async (draft) => {
        if (disposed || !draft || userEditedBeforeDraftLoadRef.current) return

        suppressHistoryRef.current = true
        canvas.setDimensions({ width: draft.width, height: draft.height })
        await canvas.loadFromJSON(draft.scene)
        if (disposed) return

        restartAnimatedStickers(canvas)
        canvas.requestRenderAll()
        fitCanvas()
        const mainImage = canvas.getObjects().find(
          (item) => item instanceof FabricImage && item.get('name') !== BACKGROUND_IMAGE_NAME,
        )
        imageObjectRef.current = mainImage instanceof FabricImage ? mainImage : null
        imageSourceRef.current = imageObjectRef.current?.getSrc() ?? ''
        setDimensions({ width: draft.width, height: draft.height })
        setHasDocument(Boolean(draft.scene))
        setImageThumbnail(canvas.toDataURL({ format: 'png', multiplier: 0.12 }))
        setProjectName(draft.projectName)
        setActiveTool(draft.activeTool)
        setZoom(draft.zoom)
        setSelectedFilter(draft.selectedFilter)
        selectedFilterRef.current = draft.selectedFilter
        setFilterIntensity(draft.filterIntensity)
        filterIntensityRef.current = draft.filterIntensity
        setBackgroundRemoved(draft.backgroundRemoved)
        backgroundRemovedRef.current = draft.backgroundRemoved
        setBackgroundColorState(draft.backgroundColor)
        backgroundColorRef.current = draft.backgroundColor
        setDrawingColor(draft.drawingColor)
        setBrushSize(draft.brushSize)
        setActiveDrawingMode(draft.activeDrawingMode)
        setBrightness(draft.brightness)
        setContrast(draft.contrast)
        setSaturation(draft.saturation)
        setResizeWidth(draft.resizeWidth)
        setResizeHeight(draft.resizeHeight)
        setKeepRatio(draft.keepRatio)
        setScaleArtwork(draft.scaleArtwork)
        setTextValue(draft.textValue)
        setFontFamily(draft.fontFamily)
        setFontSize(draft.fontSize)
        setTextColor(draft.textColor)
        setTextBackground(draft.textBackground)
        setTextOpacity(draft.textOpacity)
        setTextOutline(draft.textOutline)
        setTextOutlineWidth(draft.textOutlineWidth)
        setTextShadow(draft.textShadow)
        setShapeKind(draft.shapeKind)
        setFillColor(draft.fillColor)
        setTransparentFill(draft.transparentFill)
        setStrokeColor(draft.strokeColor)
        setStrokeWidth(draft.strokeWidth)
        setShapeOpacity(draft.shapeOpacity)
        setExportFormat(draft.exportFormat)
        setExportScale(draft.exportScale)
        setExportWatermark(draft.exportWatermark)
        setVideoAudio({
          ...draft.videoAudio,
          music: {
            ...draft.videoAudio.music,
            url: draft.videoAudio.music.file ? URL.createObjectURL(draft.videoAudio.music.file) : '',
          },
          voice: {
            ...draft.videoAudio.voice,
            url: draft.videoAudio.voice.file ? URL.createObjectURL(draft.videoAudio.voice.file) : '',
          },
        })
        syncObjects()
        historyRef.current = [serializeEditorSnapshot(canvas)]
        historyIndexRef.current = 0
        syncHistoryControls()
      })
      .catch(() => {
        if (!disposed) setNotice('Saved project data could not be restored.')
      })
      .finally(() => {
        if (!disposed) {
          suppressHistoryRef.current = false
          setDraftReady(true)
          setHistoryVersion((value) => value + 1)
        }
      })

    const changed = () => {
      if (!suppressHistoryRef.current) userEditedBeforeDraftLoadRef.current = true
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
      disposed = true
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
  }, [recordHistory, serializeEditorSnapshot, syncHistoryControls, syncObjects])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!draftReady || !canvas || !hasDocument) return

    const timer = window.setTimeout(() => {
      const draft: PersistedEditorDraft = {
        width: canvas.getWidth(),
        height: canvas.getHeight(),
        scene: canvas.toJSON(),
        projectName,
        activeTool,
        zoom,
        selectedFilter,
        filterIntensity,
        backgroundRemoved,
        backgroundColor,
        drawingColor,
        brushSize,
        activeDrawingMode,
        brightness,
        contrast,
        saturation,
        videoAudio: {
          ...videoAudio,
          music: { ...videoAudio.music, url: '' },
          voice: { ...videoAudio.voice, url: '' },
        },
        resizeWidth,
        resizeHeight,
        keepRatio,
        scaleArtwork,
        textValue,
        fontFamily,
        fontSize,
        textColor,
        textBackground,
        textOpacity,
        textOutline,
        textOutlineWidth,
        textShadow,
        shapeKind,
        fillColor,
        transparentFill,
        strokeColor,
        strokeWidth,
        shapeOpacity,
        exportFormat,
        exportScale,
        exportWatermark,
      }

      void saveProjectDraft(draft).catch(() => {
        setNotice('This project could not be saved in browser storage.')
      })
    }, 350)

    return () => window.clearTimeout(timer)
  }, [
    activeDrawingMode,
    activeTool,
    backgroundColor,
    backgroundRemoved,
    brightness,
    brushSize,
    contrast,
    draftReady,
    drawingColor,
    filterIntensity,
    fillColor,
    fontFamily,
    fontSize,
    exportFormat,
    exportScale,
    exportWatermark,
    hasDocument,
    historyVersion,
    keepRatio,
    projectName,
    resizeHeight,
    resizeWidth,
    scaleArtwork,
    shapeKind,
    saturation,
    selectedFilter,
    shapeOpacity,
    strokeColor,
    strokeWidth,
    textBackground,
    textColor,
    textOpacity,
    textOutline,
    textOutlineWidth,
    textShadow,
    textValue,
    transparentFill,
    videoAudio,
    zoom,
  ])

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
      image.set({ left: 0, top: 0, originX: 'left', originY: 'top', selectable: false, evented: false, lockMovementX: true, lockMovementY: true, lockScalingX: true, lockScalingY: true, lockRotation: true })
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

  const downloadDesign = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setExportBusy(true)
    try {
      const output = canvas.toCanvasElement(exportScale)
      const context = output.getContext('2d')
      if (!context) throw new Error('Could not prepare the export image.')
      if (exportFormat === 'jpeg') {
        context.globalCompositeOperation = 'destination-over'
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, output.width, output.height)
        context.globalCompositeOperation = 'source-over'
      }
      // if (exportWatermark) drawProjectWatermark(output, projectName)
      if (exportWatermark) drawProjectWatermark(output)
      const data = output.toDataURL(exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png', exportFormat === 'jpeg' ? 0.94 : 1)
      const link = document.createElement('a')
      const safeName = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'pixel-studio-design'
      link.href = data
      link.download = `${safeName}.${exportFormat === 'jpeg' ? 'jpg' : 'png'}`
      link.click()
      setExportOpen(false)
    } catch {
      setNotice('Export failed. Try a smaller output size or PNG format.')
    } finally {
      setExportBusy(false)
    }
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
  
  const selectedText = selectedObject instanceof IText ? selectedObject : null
  const selectedIsShape = Boolean(selectedObject && !selectedIsImage && !(selectedObject instanceof IText) && !cropActive)

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
    resize: { width: resizeWidth, height: resizeHeight, setWidth: updateResizeWidth, setHeight: updateResizeHeight, keepRatio, setKeepRatio, scaleArtwork, setScaleArtwork, apply: applyResize },
    text: { selected: selectedText, value: textValue, fontFamily, setFontFamily, fontSize, setFontSize, color: textColor, setColor: setTextColor, background: textBackground, setBackground: setTextBackground, opacity: textOpacity, setOpacity: setTextOpacity, outline: textOutline, setOutline: setTextOutline, outlineWidth: textOutlineWidth, setOutlineWidth: setTextOutlineWidth, shadow: textShadow, setShadow: setTextShadow, add: createText, update: updateText },
    shapes: { selected: selectedObject, isSelectedShape: selectedIsShape, kind: shapeKind, setKind: setShapeKind, fill: fillColor, setFill: setFillColor, transparentFill, setTransparentFill, stroke: strokeColor, setStroke: setStrokeColor, strokeWidth, setStrokeWidth, opacity: shapeOpacity, setOpacity: setShapeOpacity, add: addShape, duplicate: duplicateSelected, delete: deleteSelected, updateAppearance: updateShapeAppearance, moveLayer, selectLayer },
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
    export: { open: exportOpen, setOpen: setExportOpen, format: exportFormat, setFormat: setExportFormat, scale: exportScale, setScale: setExportScale, watermark: exportWatermark, setWatermark: setExportWatermark, busy: exportBusy, download: downloadDesign },

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
        <ExportDialog />
        <PreviewDialog />
        <span className="visually-hidden" aria-live="polite">
          {historyVersion > 0 ? 'Document updated' : ''}
        </span>
      </main>
    </EditorContext.Provider>
  )
}

export default App
