
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Canvas,
  FabricImage,
  IText,
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
import type { DrawingMode,
  EditorContextValue,
  EditorTool, ShapeKind, FilterId,
  VideoAudioDraft, VideoPreviewData,
} from './features/editor/model/types'
import { restartAnimatedStickers } from './features/editor/operations/animatedSticker'
import { useTableEditor } from './features/editor/hooks/useTableEditor'
import { usePixelDrawing } from './features/editor/hooks/usePixelDrawing'
import { useCanvasTransforms } from './features/editor/hooks/useCanvasTransforms'
import { useImageBackground } from './features/editor/hooks/useImageBackground'
import { useHistoryRecorder } from './features/editor/hooks/useHistoryRecorder'
import { useImageUpload } from './features/editor/hooks/useImageUpload'
import { useObjectEditing } from './features/editor/hooks/useObjectEditing'
import { useShapeDrawing } from './features/editor/hooks/useShapeDrawing'
import { useFabricCanvas } from './features/editor/hooks/useFabricCanvas'

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
  const uploadInputRef = useRef<HTMLInputElement>(null)

  const canvasRef = useRef<Canvas | null>(null)
  const suppressHistoryRef = useRef(false)
  const cropObjectRef = useRef<Rect | null>(null)
  const imageObjectRef = useRef<FabricImage | null>(null)
  const imageSourceRef = useRef('')
  const selectedFilterRef = useRef<FilterId>('original')
  const filterIntensityRef = useRef(100)
  const backgroundRemovedRef = useRef(false)
  const backgroundColorRef = useRef('#ffffff')
  const activeToolRef = useRef<EditorTool>('upload')
  
  

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
  const [hasImage, setHasImage] = useState(false)
  const [selectedIsImage, setSelectedIsImage] = useState(false)
  const [imageThumbnail, setImageThumbnail] = useState('')
  const [zoom, setZoom] = useState(1)
  const [draggingFile, setDraggingFile] = useState(false)
  const [notice, setNotice] = useState('')
  const [cropActive, setCropActive] = useState(false)
  const [cropRotation, setCropRotation] = useState(0)
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

  const history = useHistoryRecorder({
    canvasRef,
    suppressHistoryRef,
    serializeSnapshot: serializeEditorSnapshot,
    syncObjects,
  })
  const {
    historyRef,
    historyIndexRef,
    historyTimerRef,
    canUndo,
    canRedo,
    historyVersion,
    recordHistory,
    initialize: initializeHistory,
    syncHistoryControls,
    touch: touchHistory,
  } = history

  const fabric = useFabricCanvas({
    canvasRef,
    recordHistory,
    initializeHistory,
    syncObjects,
    setZoom,
  })
  const { fabricCanvas, fitScale, setCanvasElement, setStageElement, resizeDisplay, fitToScreen } = fabric

  const backgroundEditor = useImageBackground({
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
    setBackgroundColor: setBackgroundColorState,
    recordHistory,
    syncObjects,
    setNotice,
  })

  const table = useTableEditor({
    canvas: fabricCanvas,
    canvasRef,
    imageObjectRef,
    activeToolRef,
    setActiveTool,
    setActiveDrawingMode,
    recordHistory,
    setNotice,
  })

  const pixelDrawing = usePixelDrawing({
    canvas: fabricCanvas,
    canvasRef,
    imageObjectRef,
    activeTool,
    activeToolRef,
    activeDrawingMode,
    drawingColor,
    brushSize,
    tableEditing: table.isEditingTable,
    recordHistory,
    syncObjects,
    setNotice,
  })

  const objectEditing = useObjectEditing({
    canvasRef,
    imageObjectRef,
    cropObjectRef,
    selectedObject,
    selectedIsImage,
    cropActive,
    textValue,
    fontFamily,
    fontSize,
    textColor,
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
    setActiveTool,
    setTextValue,
    recordHistory,
  })
  const deleteSelected = objectEditing.deleteSelected
  const handleTableKeyboardInput = table.handleKeyboardInput

  useShapeDrawing({
    canvas: fabricCanvas,
    canvasRef,
    activeTool,
    hasDocument,
    shapeKind,
    fillColor,
    transparentFill,
    strokeColor,
    strokeWidth,
    shapeOpacity,
    suppressHistoryRef,
    recordHistory,
    syncObjects,
  })

  useEffect(() => {
    activeToolRef.current = activeTool
  }, [activeTool])

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
    const timer = setTimeout(() => setNotice(''), 3200)
    return () => clearTimeout(timer)
  }, [notice])

  const canvasTransforms = useCanvasTransforms({
    canvasRef,
    imageObjectRef,
    cropObjectRef,
    hasDocument,
    dimensions,
    setDimensions,
    cropActive,
    cropRotation,
    setCropActive,
    setCropRotation,
    setActiveTool,
    suppressHistoryRef,
    recordHistory,
    syncObjects,
    resizeDisplay,
  })

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

  const restoreTables = table.restore

  const undo = useCallback(async () => {
    if (historyTimerRef.current) recordHistory(true)
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
      restoreTables(canvas)
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
      touchHistory()
    } finally {
      suppressHistoryRef.current = false
    }
  }, [historyIndexRef, historyRef, historyTimerRef, recordHistory, resizeDisplay, restoreTables, syncHistoryControls, syncObjects, touchHistory])

  const redo = useCallback(async () => {
    if (historyTimerRef.current) recordHistory(true)
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
      restoreTables(canvas)
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
      touchHistory()
    } finally {
      suppressHistoryRef.current = false
    }
  }, [historyIndexRef, historyRef, historyTimerRef, recordHistory, resizeDisplay, restoreTables, syncHistoryControls, syncObjects, touchHistory])

  const uploadFile = useImageUpload({
    canvasRef,
    imageObjectRef,
    imageSourceRef,
    suppressHistoryRef,
    selectedFilterRef,
    filterIntensityRef,
    backgroundRemovedRef,
    backgroundColorRef,
    resetTables: table.reset,
    resetDrawing: pixelDrawing.reset,
    setBackgroundRemoved,
    setBackgroundColor: setBackgroundColorState,
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
  })

  const cancelCrop = canvasTransforms.cancelCrop
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

      if (handleTableKeyboardInput(event)) return

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
  }, [undo, redo, deleteSelected, handleTableKeyboardInput])

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

  const selectedText = selectedObject instanceof IText ? selectedObject : null
  const selectedIsShape = objectEditing.selectedIsShape

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
      uploadFile, beginCrop: canvasTransforms.crop.begin,
      setDraggingFile,
      notice,
      setNotice,
      deleteImage,
    },
    crop: canvasTransforms.crop,
    resize: canvasTransforms.resize,
    text: { selected: selectedText, value: textValue, fontFamily, setFontFamily, fontSize, setFontSize, color: textColor, setColor: setTextColor, background: textBackground, setBackground: setTextBackground, opacity: textOpacity, setOpacity: setTextOpacity, outline: textOutline, setOutline: setTextOutline, outlineWidth: textOutlineWidth, setOutlineWidth: setTextOutlineWidth, shadow: textShadow, setShadow: setTextShadow, add: objectEditing.createText, update: objectEditing.updateText },
    shapes: { selected: selectedObject, isSelectedShape: selectedIsShape, kind: shapeKind, setKind: setShapeKind, fill: fillColor, setFill: setFillColor, transparentFill, setTransparentFill, stroke: strokeColor, setStroke: setStrokeColor, strokeWidth, setStrokeWidth, opacity: shapeOpacity, setOpacity: setShapeOpacity, add: objectEditing.addShape, duplicate: objectEditing.duplicateSelected, delete: objectEditing.deleteSelected, updateAppearance: objectEditing.updateShapeAppearance, moveLayer: objectEditing.moveLayer, selectLayer: objectEditing.selectLayer },

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
    background: backgroundEditor,
    drawing: {
      activeMode: activeDrawingMode,
      setActiveMode: setActiveDrawingMode,
      color: drawingColor,
      setColor: setDrawingColor,
      brushSize,
      setBrushSize,
      clearSelection: pixelDrawing.clearSelection,
      deleteSelection: pixelDrawing.deleteSelection,
    },
    table,
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
