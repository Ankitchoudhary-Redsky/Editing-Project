import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Canvas,
  FabricImage,
  Point,
  IText,
  Rect,
  Textbox,
  PencilBrush,
  util,
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
import { STICKY_NOTE_MIN_HEIGHT } from './features/editor/operations/overlayObjects'
import { objectName } from './features/editor/model/objectName'
import { deleteProjectDraft, loadProjectDraft, saveProjectDraft } from './features/editor/operations/projectStorage'
import { drawProjectWatermark } from './features/editor/operations/projectWatermark'
import { cropImageToCell, getGridCells, loadImageElement, type GridLayoutId } from './features/editor/operations/gridLayout'

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

type CanvasTable = {
  id: number
  left: number
  top: number
  cellWidth: number
  cellHeight: number
  columnWidths: number[]
  rowHeights: number[]
  rows: number
  columns: number
}

type TableGesture = {
  mode: 'move' | 'resize-row' | 'resize-column'
  startX: number
  startY: number
  left: number
  top: number
  resizeIndex: number
  columnWidths: number[]
  rowHeights: number[]
  moved: boolean
}


function getImageBounds(canvas: Canvas, image: FabricImage | null) {
  const bounds = image?.getBoundingRect() ?? {
    left: 0,
    top: 0,
    width: canvas.getWidth(),
    height: canvas.getHeight(),
  }
  const left = Math.max(0, bounds.left)
  const top = Math.max(0, bounds.top)
  const right = Math.min(canvas.getWidth(), bounds.left + bounds.width)
  const bottom = Math.min(canvas.getHeight(), bounds.top + bounds.height)
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  }
}

function isShapeObject(object: FabricObject) {
  const name = String(object.get('name') ?? '')
  return Object.values(shapeNames).some(
    (shapeName) => name === shapeName || name.startsWith(`${shapeName} copy`),
  )
}

function constrainShapeToImage(
  canvas: Canvas,
  image: FabricImage | null,
  object: FabricObject,
) {
  const bounds = getImageBounds(canvas, image)
  if (!bounds.width || !bounds.height) return

  object.setCoords()
  let objectBounds = object.getBoundingRect()
  const scale = Math.min(
    1,
    bounds.width / Math.max(1, objectBounds.width),
    bounds.height / Math.max(1, objectBounds.height),
  )

  if (scale < 1) {
    object.set({
      scaleX: (object.scaleX ?? 1) * scale,
      scaleY: (object.scaleY ?? 1) * scale,
    })
    object.setCoords()
    objectBounds = object.getBoundingRect()
  }

  const right = bounds.left + bounds.width
  const bottom = bounds.top + bounds.height
  const offsetX = objectBounds.left < bounds.left
    ? bounds.left - objectBounds.left
    : objectBounds.left + objectBounds.width > right
      ? right - objectBounds.left - objectBounds.width
      : 0
  const offsetY = objectBounds.top < bounds.top
    ? bounds.top - objectBounds.top
    : objectBounds.top + objectBounds.height > bottom
      ? bottom - objectBounds.top - objectBounds.height
      : 0

  object.set({
    left: (object.left ?? 0) + offsetX,
    top: (object.top ?? 0) + offsetY,
  })
  object.setCoords()
}

function tableCellName(tableId: number, row: number, column: number) {
  return `__pixel_studio_table_cell__${tableId}__${row}__${column}`
}

function tableTextName(tableId: number, row: number, column: number) {
  return `__pixel_studio_table_text__${tableId}__${row}__${column}`
}

function updateImageFrame(canvas: Canvas, image: FabricImage) {
  const frameId = String(image.get('frameId') ?? image.get('gridCellId') ?? image.get('name'))
  const frame = canvas.getObjects().find((object) => object.get('frameTarget') === frameId)
  if (!frame) return

  const inset = Number(frame.get('framePadding') ?? 0)
  const imageWidth = (image.width ?? 0) * (image.scaleX ?? 1)
  const imageHeight = (image.height ?? 0) * (image.scaleY ?? 1)
  frame.set({
    left: (image.left ?? 0) - inset,
    top: (image.top ?? 0) - inset,
    width: Math.max(1, imageWidth + inset * 2),
    height: Math.max(1, imageHeight + inset * 2),
    angle: image.angle,
    selectable: false,
    evented: false,
    objectCaching: false,
    dirty: true,
  })
  frame.setCoords()
}

function restoreImageFrames(canvas: Canvas) {
  ;[...canvas.getObjects()].forEach((object) => {
    if (object.get('name') !== 'Image frame') return
    const targetName = object.get('frameTarget')
    const image = canvas.getObjects().find(
      (candidate) => candidate instanceof FabricImage &&
        (candidate.get('frameId') ?? candidate.get('gridCellId') ?? candidate.get('name')) === targetName,
    )
    if (image instanceof FabricImage) {
      object.set({ selectable: false, evented: false, objectCaching: false })
      const imageIndex = canvas.getObjects().indexOf(image)
      const frameIndex = canvas.getObjects().indexOf(object)
      if (frameIndex > imageIndex) canvas.moveObjectTo(object, Math.max(0, imageIndex))
      updateImageFrame(canvas, image)
    }
    else canvas.remove(object)
  })
}

function hasDesignContent(canvas: Canvas) {
  return canvas.getObjects().some((object) =>
    (object instanceof FabricImage && object.get('name') !== BACKGROUND_IMAGE_NAME) ||
    object.get('gridSlot') === true ||
    object.get('frameSlot') === true,
  )
}

function tableColumnOffset(table: CanvasTable, column: number) {
  return table.columnWidths.slice(0, column).reduce((total, width) => total + width, 0)
}

function tableRowOffset(table: CanvasTable, row: number) {
  return table.rowHeights.slice(0, row).reduce((total, height) => total + height, 0)
}

function tableWidth(table: CanvasTable) {
  return table.columnWidths.reduce((total, width) => total + width, 0)
}

function tableHeight(table: CanvasTable) {
  return table.rowHeights.reduce((total, height) => total + height, 0)
}

function fitTableTextbox(textbox: Textbox, cellWidth: number, cellHeight: number) {
  textbox.set({ width: Math.max(8, cellWidth - 16), fontSize: 15 })
  textbox.initDimensions()
  textbox.setCoords()
  return Math.max(cellHeight, textbox.height + 12)
}

function syncTableGeometry(canvas: Canvas, table: CanvasTable, bounds: ReturnType<typeof getImageBounds>) {
  for (let row = 0; row < table.rows; row += 1) {
    const maxRowHeight = Math.max(
      28,
      bounds.top + bounds.height - table.top - tableRowOffset(table, row) -
        table.rowHeights.slice(row + 1).reduce((total, height) => total + height, 0),
    )
    let requiredRowHeight = Math.min(table.rowHeights[row] || table.cellHeight, maxRowHeight)
    for (let column = 0; column < table.columns; column += 1) {
      const text = canvas.getObjects().find(
        (object) => object.get('name') === tableTextName(table.id, row, column),
      )
      if (text instanceof Textbox) {
        requiredRowHeight = Math.max(
          requiredRowHeight,
          Math.min(
            maxRowHeight,
            fitTableTextbox(text, table.columnWidths[column], requiredRowHeight),
          ),
        )
      }
    }
    table.rowHeights[row] = requiredRowHeight
  }

  for (let row = 0; row < table.rows; row += 1) {
    for (let column = 0; column < table.columns; column += 1) {
      const left = table.left + tableColumnOffset(table, column)
      const top = table.top + tableRowOffset(table, row)
      const cell = canvas.getObjects().find(
        (object) => object.get('name') === tableCellName(table.id, row, column),
      )
      const text = canvas.getObjects().find(
        (object) => object.get('name') === tableTextName(table.id, row, column),
      )
      cell?.set({ left, top, width: table.columnWidths[column], height: table.rowHeights[row] })
      cell?.setCoords()
      if (text instanceof Textbox) {
        text.set({ left: left + 8, top: top + 7 })
        fitTableTextbox(text, table.columnWidths[column], table.rowHeights[row])
      }
    }
  }

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
  const pendingFrameSlotIdRef = useRef<string | null>(null)

  const canvasRef = useRef<Canvas | null>(null)
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressHistoryRef = useRef(false)
  const cropObjectRef = useRef<Rect | null>(null)
  const cropOriginalSnapshotRef = useRef<string | null>(null)
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
  const magicRemovalInProgressRef = useRef(false)
  const magicDisplayCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const magicDisplayContextRef = useRef<CanvasRenderingContext2D | null>(null)
  const magicFiltersRef = useRef<FabricImage['filters'] | null>(null)
  const activeTableRef = useRef<CanvasTable | null>(null)
  const tablesRef = useRef<CanvasTable[]>([])
  const nextTableIdRef = useRef(0)
  const tableGestureRef = useRef<TableGesture | null>(null)
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
  const [projectName, setProjectName] = useState('Untitled')
  const [isRenaming, setIsRenaming] = useState(false)
  const [hasDocument, setHasDocument] = useState(false)
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null)
  const [objects, setObjects] = useState<FabricObject[]>([])
  const [gridCells, setGridCells] = useState<Array<{ id: string; index: number; hasImage: boolean; thumbnail: string }>>([])
  const [selectedGridCellId, setSelectedGridCellId] = useState<string | null>(null)
  const [historyVersion, setHistoryVersion] = useState(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [hasImage, setHasImage] = useState(false)
  const [selectedIsImage, setSelectedIsImage] = useState(false)
  const [imageResizeLocked, setImageResizeLocked] = useState(false)
  const imageResizeLockedRef = useRef(false)
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
  const [tableList, setTableList] = useState<Array<{ id: number; rows: number; columns: number }>>([])
  const [activeTableId, setActiveTableId] = useState<number | null>(null)
  const [tableRows, setTableRows] = useState(0)
  const [tableColumns, setTableColumns] = useState(0)
  const [tableSelectedRow, setTableSelectedRow] = useState(0)
  const [tableSelectedColumn, setTableSelectedColumn] = useState(0)
  const [tableSelectedText, setTableSelectedText] = useState('')
  const [tableBorderColor, setTableBorderColorState] = useState('#537a67')
  const [tableEditing, setTableEditing] = useState(false)
  const [tableResizeHover, setTableResizeHover] = useState<'row' | 'column' | null>(null)

  const updateTableList = useCallback((tables: CanvasTable[]) => {
    setTableList(tables.map(({ id, rows, columns }) => ({ id, rows, columns })))
  }, [])

  const syncTableLayout = useCallback((canvas: Canvas, table: CanvasTable) => {
    syncTableGeometry(canvas, table, getImageBounds(canvas, imageObjectRef.current))
  }, [])
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
    const image = canvasObjects.find((item) => item instanceof FabricImage && item.get('name') !== BACKGROUND_IMAGE_NAME && !item.get('gridCellId'))
    const gridSlots = canvasObjects.filter((item) => item.get('gridSlot') === true)
    const frameSlots = canvasObjects.filter((item) => item.get('frameSlot') === true)
    const nextGridCells = gridSlots.map((slot) => {
      const id = String(slot.get('gridCellId'))
      const cellImage = canvasObjects.find((item) => item instanceof FabricImage && item.get('gridCellId') === id)
      return {
        id,
        index: Number(slot.get('gridCellIndex') ?? 0),
        hasImage: cellImage instanceof FabricImage,
        thumbnail: cellImage instanceof FabricImage ? cellImage.getSrc() : '',
      }
    })
    setGridCells(nextGridCells)
    image?.set({
      selectable: true,
      evented: true,
      lockMovementX: imageResizeLockedRef.current,
      lockMovementY: imageResizeLockedRef.current,
      lockScalingX: imageResizeLockedRef.current,
      lockScalingY: imageResizeLockedRef.current,
      lockUniScaling: true,
      lockRotation: imageResizeLockedRef.current,
      cornerStyle: 'circle',
      cornerColor: '#32745d',
      cornerStrokeColor: '#255843',
      cornerSize: 12,
      transparentCorners: false,
    })
    imageObjectRef.current = image instanceof FabricImage ? image : null
    setCropRotation(image instanceof FabricImage ? Math.round(image.angle || 0) : 0)

    setHasImage(Boolean(image))
    setHasDocument(Boolean(image) || gridSlots.length > 0 || frameSlots.length > 0)
    setObjects(
      canvasObjects.filter((item) => item !== cropObjectRef.current),
    )

    const active = canvas.getActiveObject() ?? null
    setSelectedObject(active)
    setSelectedIsImage(active instanceof FabricImage && active.get('name') !== BACKGROUND_IMAGE_NAME)
    const selectedCell = active?.get('gridCellId') ?? (active?.get('gridSlot') ? active.get('gridCellId') : null)
    setSelectedGridCellId(typeof selectedCell === 'string' ? selectedCell : null)
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
        historyTimerRef.current = null
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
        restoreImageFrames(canvas)

        let mainImage = canvas.getObjects().find(
          (item) => item instanceof FabricImage && item.get('name') !== BACKGROUND_IMAGE_NAME && !item.get('gridCellId'),
        )
        const hasSavedGrid = canvas.getObjects().some((item) => item.get('gridSlot') === true)
        const hasSavedFrameSlot = canvas.getObjects().some((item) => item.get('frameSlot') === true)
        if (!(mainImage instanceof FabricImage) && !hasSavedGrid && !hasSavedFrameSlot) {
          canvas.clear()
          canvas.setDimensions({ width: 1200, height: 800 })
          canvas.backgroundColor = 'rgba(0,0,0,0)'
          mainImage = undefined
          void deleteProjectDraft().catch(() => {
            setNotice('Saved project data could not be cleared from browser storage.')
          })
        }

        restartAnimatedStickers(canvas)
        canvas.requestRenderAll()
        fitCanvas()
        imageObjectRef.current = mainImage instanceof FabricImage ? mainImage : null
        imageSourceRef.current = imageObjectRef.current?.getSrc() ?? ''
        setDimensions(imageObjectRef.current
          ? { width: draft.width, height: draft.height }
          : { width: 1200, height: 800 })
        setHasDocument(Boolean(imageObjectRef.current) || hasSavedGrid || hasSavedFrameSlot)
        setImageThumbnail(imageObjectRef.current || hasSavedGrid
          ? canvas.toDataURL({ format: 'png', multiplier: 0.12 })
          : '')
        setProjectName(draft.projectName)
        setActiveTool(draft.activeTool === 'select' ? 'crop' : draft.activeTool)
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

    const enforceStickyNoteHeight = (event: { target?: FabricObject }) => {
      const target = event.target
      if (target?.get('name') !== 'Sticky note' || target.height >= STICKY_NOTE_MIN_HEIGHT) return
      target.set({ height: STICKY_NOTE_MIN_HEIGHT })
      target.setCoords()
      canvas.requestRenderAll()
    }

    canvas.on('selection:created', syncObjects)
    canvas.on('selection:updated', syncObjects)
    canvas.on('selection:cleared', syncObjects)
    canvas.on('object:added', changed)
    canvas.on('object:modified', changed)
    canvas.on('object:removed', changed)
    canvas.on('text:changed', enforceStickyNoteHeight)
    canvas.on('text:changed', changed)
    const constrainShape = (event: { target?: FabricObject }) => {
      const target = event.target
      if (target && isShapeObject(target)) {
        constrainShapeToImage(canvas, imageObjectRef.current, target)
      }
    }
    const syncImageFrame = (event: { target?: FabricObject }) => {
      const target = event.target
      if (!(target instanceof FabricImage)) return
      updateImageFrame(canvas, target)
    }
    const openFrameSlotOnClick = (event: { target?: FabricObject }) => {
      const target = event.target
      if (!target?.get('frameSlot')) return
      const slotId = target.get('frameId')
      if (typeof slotId !== 'string') return
      pendingFrameSlotIdRef.current = slotId
      uploadInputRef.current?.click()
    }
    canvas.on('object:moving', constrainShape)
    canvas.on('object:scaling', constrainShape)
    canvas.on('object:rotating', constrainShape)
    canvas.on('object:moving', syncImageFrame)
    canvas.on('object:scaling', syncImageFrame)
    canvas.on('object:rotating', syncImageFrame)
    canvas.on('object:modified', syncImageFrame)
    canvas.on('mouse:down', openFrameSlotOnClick)
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

    canvas.renderAll()

    if (stageElementRef.current) {
      resizeObserver.observe(stageElementRef.current)
    }

    return () => {
      disposed = true
      resizeObserver.disconnect()
      canvas.off('object:moving', constrainShape)
      canvas.off('object:scaling', constrainShape)
      canvas.off('object:rotating', constrainShape)
      canvas.off('object:moving', syncImageFrame)
      canvas.off('object:scaling', syncImageFrame)
      canvas.off('object:rotating', syncImageFrame)
      canvas.off('object:modified', syncImageFrame)
      canvas.off('mouse:down', openFrameSlotOnClick)
      canvas.off('text:changed', enforceStickyNoteHeight)

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
        scene: canvas.toObject(['name', 'frameTarget', 'frameStyle', 'framePadding', 'frameId', 'frameSlot', 'frameColor', 'gridCellId', 'gridCellIndex', 'gridSlot']),
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
    const drawingOnCanvas = drawing || activeTool === 'draw-remove'
    canvas.selection = !drawingOnCanvas
    canvas.skipTargetFind = activeTool === 'draw-remove'
    canvas.defaultCursor = drawing ? 'crosshair' : 'default'
    canvas.hoverCursor = 'move'

    const handlePointerDown = (event: { e: TPointerEvent }) => {
      if (!drawing || !hasDocument) return
      if (canvas.findTarget(event.e)) return
      const imageBounds = getImageBounds(canvas, imageObjectRef.current)
      const pointer = canvas.getPointer(event.e)
      const start = {
        x: Math.max(imageBounds.left, Math.min(imageBounds.left + imageBounds.width, pointer.x)),
        y: Math.max(imageBounds.top, Math.min(imageBounds.top + imageBounds.height, pointer.y)),
      }
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
      const imageBounds = getImageBounds(canvas, imageObjectRef.current)
      const pointer = canvas.getPointer(event.e)
      const point = {
        x: Math.max(imageBounds.left, Math.min(imageBounds.left + imageBounds.width, pointer.x)),
        y: Math.max(imageBounds.top, Math.min(imageBounds.top + imageBounds.height, pointer.y)),
      }
      const left = Math.min(drawingState.start.x, point.x)
      const top = Math.min(drawingState.start.y, point.y)
      const width = Math.max(1, Math.abs(point.x - drawingState.start.x))
      const height = Math.max(1, Math.abs(point.y - drawingState.start.y))
      if (drawingState.preview) canvas.remove(drawingState.preview)
      const preview = buildShapeObject({ kind: shapeKind, fill: fillColor, transparentFill, stroke: strokeColor, strokeWidth, opacity: shapeOpacity, name: shapeNames[shapeKind] }, {
        left,
        top,
        width,
        height,
        directionX: point.x < drawingState.start.x ? -1 : 1,
        directionY: point.y < drawingState.start.y ? -1 : 1,
      })
      constrainShapeToImage(canvas, imageObjectRef.current, preview)
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

  const restoreTableState = useCallback((canvas: Canvas) => {
    const cells = canvas.getObjects().flatMap((object) => {
      const name = object.get('name')
      const match = typeof name === 'string'
        ? /^__pixel_studio_table_cell__(\d+)__(\d+)__(\d+)$/.exec(name)
        : null
      return match
        ? [{ object, id: Number(match[1]), row: Number(match[2]), column: Number(match[3]) }]
        : []
    })

    if (cells.length === 0) {
      activeTableRef.current = null
      tablesRef.current = []
      setTableList([])
      setActiveTableId(null)
      setTableRows(0)
      setTableColumns(0)
      setTableSelectedRow(0)
      setTableSelectedColumn(0)
      setTableSelectedText('')
      setTableEditing(false)
      return
    }

    const previousActiveId = activeTableRef.current?.id
    const tableWasMissing = activeTableRef.current === null
    const tableIds = [...new Set(cells.map((cell) => cell.id))].sort((left, right) => left - right)
    const restoredTables = tableIds.flatMap((id) => {
      const tableCells = cells.filter((cell) => cell.id === id)
      const rows = Math.max(...tableCells.map((cell) => cell.row)) + 1
      const columns = Math.max(...tableCells.map((cell) => cell.column)) + 1
      const findCell = (row: number, column: number) =>
        tableCells.find((cell) => cell.row === row && cell.column === column)?.object
      const firstCell = findCell(0, 0)
      if (!firstCell) return []

      const cellWidth = firstCell.width || 1
      const cellHeight = firstCell.height || 1
      return [{
        id,
        left: firstCell.left ?? 0,
        top: firstCell.top ?? 0,
        cellWidth,
        cellHeight,
        columnWidths: Array.from({ length: columns }, (_, column) =>
          findCell(0, column)?.width || cellWidth,
        ),
        rowHeights: Array.from({ length: rows }, (_, row) =>
          findCell(row, 0)?.height || cellHeight,
        ),
        rows,
        columns,
      }]
    })
    tablesRef.current = restoredTables
    updateTableList(restoredTables)
    nextTableIdRef.current = Math.max(nextTableIdRef.current, ...tableIds)
    const table = restoredTables.find((candidate) => candidate.id === previousActiveId)
      ?? restoredTables.at(-1)
    activeTableRef.current = table ?? null
    setActiveTableId(table?.id ?? null)
    if (tableWasMissing) setTableEditing(Boolean(table))
    if (!table) return

    setTableRows(table.rows)
    setTableColumns(table.columns)

    const selectedRow = Math.min(tableSelectedRow, table.rows - 1)
    const selectedColumn = Math.min(tableSelectedColumn, table.columns - 1)
    setTableSelectedRow(selectedRow)
    setTableSelectedColumn(selectedColumn)
    const text = canvas.getObjects().find(
      (object) => object.get('name') === tableTextName(table.id, selectedRow, selectedColumn),
    )
    setTableSelectedText(text instanceof Textbox ? text.text : '')

    const firstCell = canvas.getObjects().find(
      (object) => object.get('name') === tableCellName(table.id, 0, 0),
    )
    if (typeof firstCell?.stroke === 'string') {
      setTableBorderColorState(firstCell.stroke)
    }
  }, [tableSelectedColumn, tableSelectedRow, updateTableList])

  const deleteImage = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const image = imageObjectRef.current
    if (!image) return

    suppressHistoryRef.current = true
    canvas.clear()
    canvas.setDimensions({ width: 1200, height: 800 })
    canvas.backgroundColor = 'rgba(0,0,0,0)'
    canvas.requestRenderAll()

    cropObjectRef.current = null
    cropOriginalSnapshotRef.current = null
    imageObjectRef.current = null
    setHasImage(false)
    setHasDocument(false)
    setImageThumbnail('')
    setCropActive(false)
    setDimensions({ width: 1200, height: 800 })
    setResizeWidth(1200)
    setResizeHeight(800)
    backgroundRemovedRef.current = false
    backgroundColorRef.current = '#ffffff'
    setBackgroundRemoved(false)
    setBackgroundColorState('#ffffff')
    setIsRemovingBackground(false)
    setBackgroundProgress('')
    drawingLayerCanvasRef.current = null
    drawingLayerImageRef.current = null
    lassoPreviewObjectsRef.current = []
    restoreTableState(canvas)
    setTableResizeHover(null)

    suppressHistoryRef.current = false
    syncObjects()
    recordHistory(true)
    resizeDisplay()
    void deleteProjectDraft().catch(() => {
      setNotice('Deleted project data could not be cleared from browser storage.')
    })
  }

  const applyModernFrame = (style: 'none' | 'clean' | 'matte' | 'soft-shadow' | 'bold', color: string) => {
    const canvas = canvasRef.current
    const image = canvas?.getActiveObject()
    if (!canvas || !(image instanceof FabricImage)) return

    const imageId = String(image.get('frameId') ?? image.get('gridCellId') ?? `frame-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
    const existing = canvas.getObjects().find((object) => object.get('frameTarget') === imageId)
    if (style === 'none') {
      if (existing) {
        image.set({
          left: existing.left,
          top: existing.top,
          scaleX: (existing.width ?? image.width ?? 1) / Math.max(1, image.width ?? 1),
          scaleY: (existing.height ?? image.height ?? 1) / Math.max(1, image.height ?? 1),
          angle: existing.angle ?? image.angle,
        })
        canvas.remove(existing)
      }
      image.set({ frameId: undefined, frameStyle: undefined, shadow: undefined })
    } else {
      const paddingByStyle = { clean: 8, matte: 28, 'soft-shadow': 14, bold: 18 }
      const padding = paddingByStyle[style]
      const outerLeft = existing?.left ?? image.left ?? 0
      const outerTop = existing?.top ?? image.top ?? 0
      const outerWidth = existing?.width ?? (image.width ?? 1) * (image.scaleX ?? 1)
      const outerHeight = existing?.height ?? (image.height ?? 1) * (image.scaleY ?? 1)
      const frame = existing ?? new Rect({
        name: 'Image frame',
        frameTarget: imageId,
        left: outerLeft,
        top: outerTop,
        width: outerWidth,
        height: outerHeight,
        selectable: false,
        evented: false,
        objectCaching: false,
      })
      frame.set({
        name: 'Image frame',
        frameTarget: imageId,
        frameStyle: style,
        framePadding: padding,
        left: outerLeft,
        top: outerTop,
        width: outerWidth,
        height: outerHeight,
        angle: image.angle,
        rx: style === 'matte' ? 3 : style === 'soft-shadow' ? 10 : 2,
        ry: style === 'matte' ? 3 : style === 'soft-shadow' ? 10 : 2,
        fill: color,
        stroke: 'rgba(0,0,0,0)',
        strokeWidth: 0,
        selectable: false,
        evented: false,
        objectCaching: false,
      })
      if (!existing) {
        canvas.add(frame)
        canvas.moveObjectTo(frame, Math.max(0, canvas.getObjects().indexOf(image)))
      }
      image.set({
        frameId: imageId,
        frameStyle: style,
        left: outerLeft + padding,
        top: outerTop + padding,
        scaleX: Math.max(1, outerWidth - padding * 2) / Math.max(1, image.width ?? 1),
        scaleY: Math.max(1, outerHeight - padding * 2) / Math.max(1, image.height ?? 1),
        shadow: style === 'soft-shadow'
          ? new Shadow({ color: `${color}88`, blur: 18, offsetX: 0, offsetY: 8 })
          : undefined,
      })
      updateImageFrame(canvas, image)
    }
    image.setCoords()
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const createCanvasFrame = (style: 'none' | 'clean' | 'matte' | 'soft-shadow' | 'bold', color: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = canvas.getWidth()
    const height = canvas.getHeight()
    const frameStyle = style === 'none' ? 'clean' : style
    const paddingByStyle = { clean: 8, matte: 28, 'soft-shadow': 14, bold: 18 }
    const padding = paddingByStyle[frameStyle]
    const outerWidth = Math.min(820, width * 0.82)
    const outerHeight = Math.min(620, height * 0.82)
    const frameId = `canvas-frame-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const slot = new Rect({
      name: 'Canvas photo frame slot',
      frameSlot: true,
      frameId,
      frameStyle,
      frameColor: color,
      framePadding: padding,
      left: (width - outerWidth) / 2,
      top: (height - outerHeight) / 2,
      width: outerWidth,
      height: outerHeight,
      fill: '#e5ebe7',
      stroke: color,
      strokeWidth: Math.max(12, padding),
      rx: 12,
      ry: 12,
      shadow: frameStyle === 'soft-shadow'
        ? new Shadow({ color: `${color}66`, blur: 26, offsetX: 0, offsetY: 12 })
        : undefined,
      selectable: false,
      evented: true,
      objectCaching: false,
    })
    canvas.add(slot)
    canvas.bringObjectToFront(slot)
    canvas.requestRenderAll()
    setDimensions({ width, height })
    setResizeWidth(width)
    setResizeHeight(height)
    setHasDocument(true)
    setImageThumbnail(canvas.toDataURL({ format: 'png', multiplier: 0.12 }))
    resizeDisplay()
    syncObjects()
    recordHistory(true)
    setNotice('Blank frame created. Click it to choose a photo, or drop an image onto it.')
  }

  const fillCanvasFrame = async (frameId: string, file?: File) => {
    const canvas = canvasRef.current
    const slot = canvas?.getObjects().find((object) => object.get('frameSlot') === true && object.get('frameId') === frameId)
    if (!canvas || !slot || !file) return
    try {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPG, or WebP image.')
      if (file.size > 30 * 1024 * 1024) throw new Error('Images must be smaller than 30 MB.')
      const loaded = await loadLocalImage(file)
      const padding = Number(slot.get('framePadding') ?? 12)
      const innerWidth = Math.max(1, (slot.width ?? 1) - padding * 2)
      const innerHeight = Math.max(1, (slot.height ?? 1) - padding * 2)
      const source = cropImageToCell(loaded.image.getElement(), loaded.dimensions.width, loaded.dimensions.height, innerWidth, innerHeight)
      const image = await FabricImage.fromURL(source)
      const left = (slot.left ?? 0) + padding
      const top = (slot.top ?? 0) + padding
      const frameStyle = slot.get('frameStyle')
      const frameColor = String(slot.get('frameColor') ?? '#ffffff')
      slot.set({
        name: 'Image frame',
        frameSlot: undefined,
        frameTarget: frameId,
        fill: frameColor,
        stroke: 'rgba(0,0,0,0)',
        strokeWidth: 0,
        selectable: false,
        evented: false,
      })
      image.set({
        name: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || 'Framed image',
        frameId,
        frameStyle,
        left,
        top,
        originX: 'left',
        originY: 'top',
        selectable: true,
        evented: true,
        lockUniScaling: true,
        shadow: frameStyle === 'soft-shadow'
          ? new Shadow({ color: `${frameColor}88`, blur: 18, offsetX: 0, offsetY: 8 })
          : undefined,
      })
      canvas.add(image)
      canvas.setActiveObject(image)
      updateImageFrame(canvas, image)
      canvas.requestRenderAll()
      imageObjectRef.current = image
      imageSourceRef.current = source
      setImageThumbnail(canvas.toDataURL({ format: 'png', multiplier: 0.12 }))
      setHasImage(true)
      setHasDocument(true)
      syncObjects()
      recordHistory(true)
      setNotice('Photo added to the frame. Drag it to reposition.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The image could not be added to this frame.')
    }
  }

  const applyGridLayout = (layout: GridLayoutId, gap: number, background: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = 1200
    const height = 900
    const cells = getGridCells(layout, width, height, gap)

    canvas.clear()
    canvas.setDimensions({ width, height })
    canvas.backgroundColor = background
    cells.forEach(({ id, index, left, top, width: cellWidth, height: cellHeight }) => {
      canvas.add(new Rect({
        name: `Grid cell ${index}`,
        gridSlot: true,
        gridCellId: id,
        gridCellIndex: index,
        left,
        top,
        width: cellWidth,
        height: cellHeight,
        fill: '#e8eeeb',
        stroke: 'rgba(0,0,0,0)',
        strokeWidth: 0,
        selectable: true,
        evented: true,
        objectCaching: false,
      }))
    })
    cropObjectRef.current = null
    cropOriginalSnapshotRef.current = null
    imageObjectRef.current = null
    imageSourceRef.current = ''
    setDimensions({ width, height })
    setResizeWidth(width)
    setResizeHeight(height)
    setHasImage(false)
    setHasDocument(true)
    setImageThumbnail(canvas.toDataURL({ format: 'png', multiplier: 0.12 }))
    setCropActive(false)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    resizeDisplay()
    syncObjects()
    recordHistory(true)
    setNotice('Grid layout added. Choose a cell, then add its photo.')
  }

  const addGridCellImage = async (cellId: string, file?: File, imageUrl?: string) => {
    const canvas = canvasRef.current
    const slot = canvas?.getObjects().find((object) => object.get('gridSlot') === true && object.get('gridCellId') === cellId)
    if (!canvas || !slot) return
    try {
      let sourceImage: CanvasImageSource
      let sourceWidth: number
      let sourceHeight: number
      if (file) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('Choose a PNG, JPG, or WebP image.')
        if (file.size > 30 * 1024 * 1024) throw new Error('Images must be smaller than 30 MB.')
        const loaded = await loadLocalImage(file)
        sourceImage = loaded.image.getElement()
        sourceWidth = loaded.dimensions.width
        sourceHeight = loaded.dimensions.height
      } else {
        if (!imageUrl) return
        const parsed = new URL(imageUrl)
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new Error('Use an HTTP or HTTPS image URL.')
        const loaded = await loadImageElement(parsed.href, true)
        sourceImage = loaded
        sourceWidth = loaded.naturalWidth
        sourceHeight = loaded.naturalHeight
      }

      const bounds = slot.getBoundingRect()
      const croppedSource = cropImageToCell(sourceImage, sourceWidth, sourceHeight, bounds.width, bounds.height)
      const image = await FabricImage.fromURL(croppedSource)
      canvas.getObjects().filter((object) => object instanceof FabricImage && object.get('gridCellId') === cellId).forEach((object) => canvas.remove(object))
      image.set({
        name: `Grid photo ${slot.get('gridCellIndex')}`,
        gridCellId: cellId,
        gridCellIndex: slot.get('gridCellIndex'),
        left: bounds.left,
        top: bounds.top,
        originX: 'left',
        originY: 'top',
        selectable: true,
        evented: true,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        hasControls: false,
        objectCaching: true,
      })
      canvas.add(image)
      canvas.setActiveObject(image)
      canvas.requestRenderAll()
      syncObjects()
      recordHistory(true)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The image could not be added to this cell.')
    }
  }

  const removeGridCellImage = (cellId: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.getObjects().filter((object) => object instanceof FabricImage && object.get('gridCellId') === cellId).forEach((object) => canvas.remove(object))
    canvas.getObjects().filter((object) => object.get('frameTarget') === cellId).forEach((object) => canvas.remove(object))
    const slot = canvas.getObjects().find((object) => object.get('gridSlot') === true && object.get('gridCellId') === cellId)
    if (slot) canvas.setActiveObject(slot)
    canvas.requestRenderAll()
    syncObjects()
    recordHistory(true)
  }

  const selectGridCell = (cellId: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const object = canvas.getObjects().find((item) => item instanceof FabricImage && item.get('gridCellId') === cellId)
      ?? canvas.getObjects().find((item) => item.get('gridSlot') === true && item.get('gridCellId') === cellId)
    if (object) {
      canvas.setActiveObject(object)
      canvas.requestRenderAll()
      syncObjects()
    }
  }

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
      restoreImageFrames(canvas)
      restoreTableState(canvas)
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
      setImageThumbnail(imageObjectRef.current
        ? canvas.toDataURL({ format: 'png', multiplier: 0.12 })
        : '')
      setHasDocument(hasDesignContent(canvas))
      syncHistoryControls()
      setHistoryVersion((value) => value + 1)
    } finally {
      suppressHistoryRef.current = false
    }
  }, [recordHistory, resizeDisplay, restoreTableState, syncHistoryControls, syncObjects])

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
      restoreImageFrames(canvas)
      restoreTableState(canvas)
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
      setImageThumbnail(imageObjectRef.current
        ? canvas.toDataURL({ format: 'png', multiplier: 0.12 })
        : '')
      setHasDocument(hasDesignContent(canvas))
      syncHistoryControls()
      setHistoryVersion((value) => value + 1)
    } finally {
      suppressHistoryRef.current = false
    }
  }, [recordHistory, resizeDisplay, restoreTableState, syncHistoryControls, syncObjects])

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
      cropOriginalSnapshotRef.current = null
      cropObjectRef.current = null
      imageObjectRef.current = image
      activeTableRef.current = null
      tablesRef.current = []
      setTableList([])
      setActiveTableId(null)
      setTableRows(0)
      setTableColumns(0)
      setTableSelectedRow(0)
      setTableSelectedColumn(0)
      setTableSelectedText('')
      setTableEditing(false)
      drawingLayerCanvasRef.current = null
      drawingLayerImageRef.current = null
      lassoPreviewObjectsRef.current = []

      canvas.setDimensions({ width, height })
      canvas.backgroundColor = 'rgba(0,0,0,0)'
      image.set({ left: 0, top: 0, originX: 'left', originY: 'top', selectable: true, evented: true, lockMovementX: false, lockMovementY: false, lockScalingX: false, lockScalingY: false, lockUniScaling: true, lockRotation: true, cornerStyle: 'circle', cornerColor: '#32745d', cornerStrokeColor: '#255843', cornerSize: 12, transparentCorners: false })
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

  const addSignatureImage = async (file: File) => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setNotice('Choose a PNG, JPG, or WebP signature image.')
      return
    }

    const source = URL.createObjectURL(file)
    try {
      const signature = await FabricImage.fromURL(source)
      const width = signature.width ?? 0
      const height = signature.height ?? 0
      if (!width || !height) throw new Error('The signature image has invalid dimensions.')

      const scale = Math.min(
        (canvas.getWidth() * 0.42) / width,
        (canvas.getHeight() * 0.22) / height,
        1,
      )
      signature.set({
        name: 'Signature',
        left: (canvas.getWidth() - width * scale) / 2,
        top: (canvas.getHeight() - height * scale) / 2,
        originX: 'left',
        originY: 'top',
        scaleX: scale,
        scaleY: scale,
        selectable: true,
        evented: true,
        lockUniScaling: true,
      })
      canvas.add(signature)
      canvas.setActiveObject(signature)
      canvas.requestRenderAll()
      recordHistory(true)
      setActiveTool('signature')
      setNotice('Signature image added. Drag it to position or resize it from a corner.')
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'The signature image could not be opened.')
    } finally {
      URL.revokeObjectURL(source)
    }
  }

  const addShape = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    createShapeObject(canvas, { kind: shapeKind, fill: fillColor, transparentFill, stroke: strokeColor, strokeWidth, opacity: shapeOpacity, name: shapeNames[shapeKind] })
    recordHistory(true)
  }


  const beginCrop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !hasImage || cropObjectRef.current) return
    cropOriginalSnapshotRef.current ??= serializeEditorSnapshot(canvas)
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
  }, [hasImage, serializeEditorSnapshot])

  useEffect(() => {
    if (activeTool === 'crop' && hasImage && !cropObjectRef.current) {
      beginCrop()
    }
  }, [activeTool, beginCrop, hasImage])

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
    if (!canvas) return
    if (!cropFrame) {
      beginCrop()
      return
    }
    suppressHistoryRef.current = true
    const cropDimensions = applyCanvasCrop(canvas, cropFrame, imageObjectRef.current)
    if (!cropDimensions) {
      suppressHistoryRef.current = false
      return
    }
    cropObjectRef.current = null
    setCropActive(false)
    setDimensions(cropDimensions)
    setActiveTool('crop')
    suppressHistoryRef.current = false
    cropTransformChangedRef.current = false
    recordHistory(true)
    syncObjects()
    resizeDisplay()
  }

  const cancelCrop = useCallback((nextTool: EditorTool = 'crop') => {
    const canvas = canvasRef.current
    const cropFrame = cropObjectRef.current
    if (!canvas || !cropFrame) {
      cropOriginalSnapshotRef.current = null
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
    cropOriginalSnapshotRef.current = null
  }, [recordHistory])

  const resetCrop = async () => {
    const canvas = canvasRef.current
    const originalSnapshot = cropOriginalSnapshotRef.current

    if (!canvas || !originalSnapshot) {
      cancelCrop()
      return
    }

    const snapshot = JSON.parse(originalSnapshot) as EditorSnapshot
    suppressHistoryRef.current = true

    try {
      canvas.setDimensions({ width: snapshot.width, height: snapshot.height })
      await canvas.loadFromJSON(restoreScene(snapshot))
      restoreImageFrames(canvas)
      restoreTableState(canvas)
      restartAnimatedStickers(canvas)
      canvas.requestRenderAll()

      cropObjectRef.current = null
      cropTransformChangedRef.current = false
      setCropActive(false)
      setCropRatio('Free')
      setActiveTool('crop')
      setDimensions({ width: snapshot.width, height: snapshot.height })

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
      setHasDocument(hasDesignContent(canvas))
      cropOriginalSnapshotRef.current = null
    } finally {
      suppressHistoryRef.current = false
    }

    recordHistory(true)
  }

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

  const updateSignatureStyle = (fontFamily: string, fontStyle: string, fontWeight: string) => {
    const active = canvasRef.current?.getActiveObject()
    if (!(active instanceof IText) || active.get('name') !== 'Signature') return
    active.set({ fontFamily, fontStyle, fontWeight })
    active.setCoords()
    canvasRef.current?.requestRenderAll()
    recordHistory()
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

const resetBackground = async () => {
  const canvas = canvasRef.current
  const image = imageObjectRef.current
  const source = imageSourceRef.current

  if (!canvas || !image || !source || !backgroundRemovedRef.current) return

  await image.setSrc(source)
  image.applyFilters()

  canvas
    .getObjects()
    .filter((item) => item.get('name') === BACKGROUND_IMAGE_NAME)
    .forEach((item) => canvas.remove(item))

  canvas.backgroundColor = 'rgba(0,0,0,0)'
  backgroundRemovedRef.current = false
  backgroundColorRef.current = '#ffffff'
  setBackgroundRemoved(false)
  setBackgroundColorState('#ffffff')
  canvas.setActiveObject(image)
  canvas.requestRenderAll()

  recordHistory(true)
  syncObjects()
  setNotice('Original image restored.')
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

      if (activeToolRef.current === 'draw-remove' && tableEditing && activeTableRef.current) {
        let nextText: string | null = null
        if (event.key === 'Backspace') {
          nextText = tableSelectedText.slice(0, -1)
        } else if (event.key === 'Delete') {
          nextText = ''
        } else if (event.key === 'Enter') {
          nextText = `${tableSelectedText}\n`
        } else if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
          nextText = `${tableSelectedText}${event.key}`
        }

        if (nextText !== null) {
          event.preventDefault()
          setTableSelectedText(nextText)
          const table = activeTableRef.current
          const canvas = canvasRef.current
          const textbox = canvas?.getObjects().find(
            (object) => object.get('name') === tableTextName(table.id, tableSelectedRow, tableSelectedColumn),
          )
          if (textbox instanceof Textbox && canvas) {
            textbox.set('text', nextText)
            table.rowHeights[tableSelectedRow] = fitTableTextbox(
              textbox,
              table.columnWidths[tableSelectedColumn],
              table.rowHeights[tableSelectedRow],
            )
            syncTableLayout(canvas, table)
            canvas.requestRenderAll()
            recordHistory()
          }
          return
        }
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
  }, [undo, redo, deleteSelected, recordHistory, syncTableLayout, tableEditing, tableSelectedColumn, tableSelectedRow, tableSelectedText])

  const openPreview = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const lassoPreviews = canvas.getObjects().filter(
      (object) => object.get('name') === '__pixel_studio_lasso_preview__',
    )
    const previousVisibility = lassoPreviews.map((object) => object.visible)

    lassoPreviews.forEach((object) => {
      object.visible = false
    })

    const output = (() => {
      try {
        return canvas.toCanvasElement(1)
      } finally {
        lassoPreviews.forEach((object, index) => {
          object.visible = previousVisibility[index]
        })
        canvas.requestRenderAll()
      }
    })()

    if (exportWatermark) await drawProjectWatermark(output)
    setPreviewUrl(output.toDataURL('image/png'))
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
      if (exportWatermark) await drawProjectWatermark(output)
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
    const file = event.dataTransfer.files[0]
    const canvas = canvasRef.current
    if (canvas && file) {
      const pointer = canvas.getPointer(event.nativeEvent)
      const targetSlot = canvas.getObjects().find((object) =>
        object.get('frameSlot') === true && object.containsPoint(new Point(pointer.x, pointer.y)),
      )
      const frameId = targetSlot?.get('frameId')
      if (typeof frameId === 'string') {
        void fillCanvasFrame(frameId, file)
        return
      }
    }
    void uploadFile(file)
  }

  const openFilePicker = () => {
    uploadInputRef.current?.click()
  }

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
  const displayContext = magicDisplayContextRef.current
  const image = magicImageRef.current
  const canvas = canvasRef.current
  if (!preview || !context || !displayContext || !image || !canvas) return

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
  canvas.renderAll()
}, [])

const startMagicRemoval = useCallback((point: EditPoint) => {
  const canvas = canvasRef.current
  const image = imageObjectRef.current
  if (magicRemovalInProgressRef.current) return false
  if (!canvas || !image) {
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
}, [paintMagicRemoval])

const finishMagicRemoval = useCallback(async () => {
  const preview = magicCanvasRef.current
  const image = magicImageRef.current
  const canvas = canvasRef.current
  const filters = magicFiltersRef.current
  magicCanvasRef.current = null
  magicContextRef.current = null
  magicDisplayCanvasRef.current = null
  magicDisplayContextRef.current = null
  magicImageRef.current = null
  magicFiltersRef.current = null
  if (!preview || !image || !canvas) {
    magicRemovalInProgressRef.current = false
    return
  }

  try {
    image.filters = filters || []
    await image.setSrc(preview.toDataURL('image/png'), {})
    image.setCoords()
    canvas.requestRenderAll()
    recordHistory(true)
    syncObjects()
    setNotice('Image area removed.')
  } catch (error) {
    setNotice(error instanceof Error ? error.message : 'Could not edit this image.')
  } finally {
    magicRemovalInProgressRef.current = false
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

const removeLassoPreview = useCallback(() => {
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
}, [])

useEffect(() => {
  if (activeTool === 'draw-remove' && activeDrawingMode === 'lasso') return

  lassoPointsRef.current = []
  removeLassoPreview()
}, [activeTool, activeDrawingMode, removeLassoPreview])

const clearSelection = () => {
  lassoPointsRef.current = []
  removeLassoPreview()
  setNotice('Selection cleared.')
}

const addTableCells = (
  table: CanvasTable,
  firstRow: number,
  lastRow: number,
  firstColumn: number,
  lastColumn: number,
  borderColor = tableBorderColor,
) => {
  const canvas = canvasRef.current
  if (!canvas) return

  const cells: Rect[] = []
  const texts: Textbox[] = []
  for (let row = firstRow; row < lastRow; row += 1) {
    for (let column = firstColumn; column < lastColumn; column += 1) {
      const left = table.left + tableColumnOffset(table, column)
      const top = table.top + tableRowOffset(table, row)
      cells.push(new Rect({
        left,
        top,
        width: table.columnWidths[column],
        height: table.rowHeights[row],
        fill: 'rgba(255,255,255,0)',
        stroke: borderColor,
        strokeWidth: 2,
        name: tableCellName(table.id, row, column),
      }))
      texts.push(new Textbox('', {
        left: left + 8,
        top: top + 7,
        width: table.columnWidths[column] - 16,
        fontFamily: 'Avenir Next',
        fontSize: 15,
        fill: '#28372f',
        splitByGrapheme: true,
        name: tableTextName(table.id, row, column),
      }))
    }
  }

  canvas.add(...cells, ...texts)
}

const selectTable = (id: number) => {
  const table = tablesRef.current.find((candidate) => candidate.id === id)
  if (!table) return

  activeTableRef.current = table
  setActiveTableId(table.id)
  setTableRows(table.rows)
  setTableColumns(table.columns)
  setTableSelectedRow(0)
  setTableSelectedColumn(0)
  
  const text = canvasRef.current?.getObjects().find(
    (object) => object.get('name') === tableTextName(table.id, 0, 0),
  )
  setTableSelectedText(text instanceof Textbox ? text.text : '')
  const cell = canvasRef.current?.getObjects().find(
    (object) => object.get('name') === tableCellName(table.id, 0, 0),
  )
  if (typeof cell?.stroke === 'string') setTableBorderColorState(cell.stroke)
  setActiveTool('draw-remove')
  setActiveDrawingMode('pencil')
  setTableEditing(true)
  canvasRef.current?.requestRenderAll()
}

const createTable = () => {
  const canvas = canvasRef.current
  if (!canvas) return

  const bounds = getImageBounds(canvas, imageObjectRef.current)
  const rows = 3
  const columns = 3
  const cellWidth = Math.min(150, (bounds.width - 32) / columns)
  const cellHeight = Math.min(54, bounds.height / rows)
  if (cellWidth < 32 || cellHeight < 28) {
    setNotice('The image is too small to fit a table.')
    return
  }
  const table: CanvasTable = {
    id: nextTableIdRef.current + 1,
    left: 0,
    top: 0,
    cellWidth,
    cellHeight,
    columnWidths: Array(columns).fill(cellWidth),
    rowHeights: Array(rows).fill(cellHeight),
    rows,
    columns,
  }
  const horizontalSlots = Math.max(1, Math.floor((bounds.width - 12) / (tableWidth(table) + 20)))
  const verticalSlots = Math.max(1, Math.floor((bounds.height - 12) / (tableHeight(table) + 20)))
  let position: { left: number; top: number } | null = null
  for (let slot = 0; slot < horizontalSlots * verticalSlots; slot += 1) {
    const candidate = {
      left: bounds.left + 16 + (slot % horizontalSlots) * (tableWidth(table) + 20),
      top: bounds.top + 16 + Math.floor(slot / horizontalSlots) * (tableHeight(table) + 20),
    }
    const overlaps = tablesRef.current.some((existing) =>
      candidate.left < existing.left + tableWidth(existing) &&
      candidate.left + tableWidth(table) > existing.left &&
      candidate.top < existing.top + tableHeight(existing) &&
      candidate.top + tableHeight(table) > existing.top,
    )
    if (!overlaps) {
      position = candidate
      break
    }
  }
  if (!position) {
    setNotice('There is no room for another table inside the image.')
    return
  }
  table.left = position.left
  table.top = position.top
  nextTableIdRef.current = table.id
  tablesRef.current = [...tablesRef.current, table]
  updateTableList(tablesRef.current)
  activeTableRef.current = table
  setActiveTableId(table.id)
  addTableCells(table, 0, rows, 0, columns)
  syncTableLayout(canvas, table)
  setTableEditing(true)
  setActiveDrawingMode('pencil')
  setTableRows(rows)
  setTableColumns(columns)
  setTableSelectedRow(0)
  setTableSelectedColumn(0)
  setTableSelectedText('')
  canvas.requestRenderAll()
  recordHistory(true)
}

const addTableRow = () => {
  const table = activeTableRef.current
  const canvas = canvasRef.current
  if (!table || !canvas) return
  const bounds = getImageBounds(canvas, imageObjectRef.current)
  if (table.top + tableHeight(table) + table.cellHeight > bounds.top + bounds.height) {
    setNotice('There is no room for another table row inside the image.')
    return
  }
  table.rowHeights.push(table.cellHeight)
  addTableCells(table, table.rows, table.rows + 1, 0, table.columns)
  table.rows += 1
  syncTableLayout(canvas, table)
  updateTableList(tablesRef.current)
  setTableRows(table.rows)
  setTableSelectedRow(table.rows - 1)
  setTableSelectedText('')
  canvasRef.current?.requestRenderAll()
  recordHistory(true)
}

const addTableColumn = () => {
  const table = activeTableRef.current
  const canvas = canvasRef.current
  if (!table || !canvas) return
  const bounds = getImageBounds(canvas, imageObjectRef.current)
  if (table.left + tableWidth(table) + table.cellWidth > bounds.left + bounds.width) {
    setNotice('There is no room for another table column inside the image.')
    return
  }
  table.columnWidths.push(table.cellWidth)
  addTableCells(table, 0, table.rows, table.columns, table.columns + 1)
  table.columns += 1
  syncTableLayout(canvas, table)
  updateTableList(tablesRef.current)
  setTableColumns(table.columns)
  setTableSelectedColumn(table.columns - 1)
  setTableSelectedText('')
  canvasRef.current?.requestRenderAll()
  recordHistory(true)
}

const removeTableRow = () => {
  const table = activeTableRef.current
  const canvas = canvasRef.current
  if (!table || !canvas || table.rows <= 1) return

  const removedRow = tableSelectedRow
  for (let column = 0; column < table.columns; column += 1) {
    const cell = canvas.getObjects().find(
      (object) => object.get('name') === tableCellName(table.id, removedRow, column),
    )
    const text = canvas.getObjects().find(
      (object) => object.get('name') === tableTextName(table.id, removedRow, column),
    )
    if (cell) canvas.remove(cell)
    if (text) canvas.remove(text)
  }

  for (let row = removedRow + 1; row < table.rows; row += 1) {
    for (let column = 0; column < table.columns; column += 1) {
      const cell = canvas.getObjects().find(
        (object) => object.get('name') === tableCellName(table.id, row, column),
      )
      const text = canvas.getObjects().find(
        (object) => object.get('name') === tableTextName(table.id, row, column),
      )
      cell?.set('name', tableCellName(table.id, row - 1, column))
      text?.set('name', tableTextName(table.id, row - 1, column))
    }
  }

  table.rowHeights.splice(removedRow, 1)
  table.rows -= 1
  syncTableLayout(canvas, table)
  updateTableList(tablesRef.current)
  const nextRow = Math.min(removedRow, table.rows - 1)
  setTableRows(table.rows)
  selectTableCell(nextRow, tableSelectedColumn)
  canvas.requestRenderAll()
  recordHistory(true)
}

const removeTableColumn = () => {
  const table = activeTableRef.current
  const canvas = canvasRef.current
  if (!table || !canvas || table.columns <= 1) return

  const removedColumn = tableSelectedColumn
  for (let row = 0; row < table.rows; row += 1) {
    const cell = canvas.getObjects().find(
      (object) => object.get('name') === tableCellName(table.id, row, removedColumn),
    )
    const text = canvas.getObjects().find(
      (object) => object.get('name') === tableTextName(table.id, row, removedColumn),
    )
    if (cell) canvas.remove(cell)
    if (text) canvas.remove(text)
  }

  for (let column = removedColumn + 1; column < table.columns; column += 1) {
    for (let row = 0; row < table.rows; row += 1) {
      const cell = canvas.getObjects().find(
        (object) => object.get('name') === tableCellName(table.id, row, column),
      )
      const text = canvas.getObjects().find(
        (object) => object.get('name') === tableTextName(table.id, row, column),
      )
      cell?.set('name', tableCellName(table.id, row, column - 1))
      text?.set('name', tableTextName(table.id, row, column - 1))
    }
  }

  table.columnWidths.splice(removedColumn, 1)
  table.columns -= 1
  syncTableLayout(canvas, table)
  updateTableList(tablesRef.current)
  const nextColumn = Math.min(removedColumn, table.columns - 1)
  setTableColumns(table.columns)
  selectTableCell(tableSelectedRow, nextColumn)
  canvas.requestRenderAll()
  recordHistory(true)
}

const deleteTable = () => {
  const table = activeTableRef.current
  const canvas = canvasRef.current
  if (!table || !canvas) return

  for (let row = 0; row < table.rows; row += 1) {
    for (let column = 0; column < table.columns; column += 1) {
      const cell = canvas.getObjects().find(
        (object) => object.get('name') === tableCellName(table.id, row, column),
      )
      const text = canvas.getObjects().find(
        (object) => object.get('name') === tableTextName(table.id, row, column),
      )
      if (cell) canvas.remove(cell)
      if (text) canvas.remove(text)
    }
  }

  tablesRef.current = tablesRef.current.filter((candidate) => candidate.id !== table.id)
  updateTableList(tablesRef.current)
  activeTableRef.current = null
  if (tablesRef.current.length > 0) {
    selectTable(tablesRef.current.at(-1)!.id)
  } else {
    setActiveTableId(null)
    setTableRows(0)
    setTableColumns(0)
    setTableSelectedText('')
    setTableEditing(false)
  }
  setActiveDrawingMode('pencil')
  canvas.requestRenderAll()
  recordHistory(true)
}

const beginTableEditing = () => {
  if (!activeTableRef.current) return
  setActiveTool('draw-remove')
  setTableEditing(true)
  canvasRef.current?.requestRenderAll()
  setActiveDrawingMode('pencil')
}

const finishTableEditing = () => {
  setTableEditing(false)
  canvasRef.current?.requestRenderAll()
  setActiveDrawingMode('pencil')
}

const selectTableRow = (row: number) => {
  setTableSelectedRow(row)
  const table = activeTableRef.current
  const text = canvasRef.current?.getObjects().find(
    (object) => object.get('name') === tableTextName(table?.id ?? -1, row, tableSelectedColumn),
  )
  setTableSelectedText(text instanceof Textbox ? text.text : '')
}

const selectTableColumn = (column: number) => {
  setTableSelectedColumn(column)
  const table = activeTableRef.current
  const text = canvasRef.current?.getObjects().find(
    (object) => object.get('name') === tableTextName(table?.id ?? -1, tableSelectedRow, column),
  )
  setTableSelectedText(text instanceof Textbox ? text.text : '')
}

const selectTableCell = (row: number, column: number) => {
  const table = activeTableRef.current
  const text = canvasRef.current?.getObjects().find(
    (object) => object.get('name') === tableTextName(table?.id ?? -1, row, column),
  )
  setTableSelectedRow(row)
  setTableSelectedColumn(column)
  setTableSelectedText(text instanceof Textbox ? text.text : '')
}

const updateTableBorderColor = (color: string) => {
  setTableBorderColorState(color)
  const table = activeTableRef.current
  const canvas = canvasRef.current
  if (!table || !canvas) return

  for (let row = 0; row < table.rows; row += 1) {
    for (let column = 0; column < table.columns; column += 1) {
      const cell = canvas.getObjects().find(
        (object) => object.get('name') === tableCellName(table.id, row, column),
      )
      cell?.set('stroke', color)
      cell?.setCoords()
    }
  }
  canvas.requestRenderAll()
  recordHistory()
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

    const table = activeTableRef.current
    if (table && tableEditing) {
      const relativeX = point.x - table.left
      const relativeY = point.y - table.top

      if (relativeY >= 0 && relativeY < tableHeight(table)) {
        for (let column = 0; column < table.columns; column += 1) {
          const dividerX = table.left + tableColumnOffset(table, column + 1)
          if (Math.abs(point.x - dividerX) <= 6) {
            tableGestureRef.current = {
              mode: 'resize-column',
              startX: point.x,
              startY: point.y,
              left: table.left,
              top: table.top,
              resizeIndex: column,
              columnWidths: [...table.columnWidths],
              rowHeights: [...table.rowHeights],
              moved: false,
            }
            return
          }
        }
      }

      if (relativeX >= 0 && relativeX < tableWidth(table)) {
        for (let row = 0; row < table.rows; row += 1) {
          const dividerY = table.top + tableRowOffset(table, row + 1)
          if (Math.abs(point.y - dividerY) <= 6) {
            tableGestureRef.current = {
              mode: 'resize-row',
              startX: point.x,
              startY: point.y,
              left: table.left,
              top: table.top,
              resizeIndex: row,
              columnWidths: [...table.columnWidths],
              rowHeights: [...table.rowHeights],
              moved: false,
            }
            return
          }
        }
      }

      if (relativeX >= 0 && relativeY >= 0 && relativeX < tableWidth(table) && relativeY < tableHeight(table)) {
        let row = 0
        while (row < table.rows - 1 && relativeY >= tableRowOffset(table, row + 1)) row += 1
        let column = 0
        while (column < table.columns - 1 && relativeX >= tableColumnOffset(table, column + 1)) column += 1
        selectTableCell(row, column)
        tableGestureRef.current = {
          mode: 'move',
          startX: point.x,
          startY: point.y,
          left: table.left,
          top: table.top,
          resizeIndex: -1,
          columnWidths: [...table.columnWidths],
          rowHeights: [...table.rowHeights],
          moved: false,
        }
      }
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
    const tableGesture = tableGestureRef.current
    const table = activeTableRef.current
    const canvas = canvasRef.current
    const bounds = canvas ? getImageBounds(canvas, imageObjectRef.current) : null
    if (point && table && tableEditing && !tableGesture) {
      const isOverColumnDivider = point.y >= table.top &&
        point.y < table.top + tableHeight(table) &&
        Array.from({ length: table.columns }, (_, column) =>
          Math.abs(point.x - (table.left + tableColumnOffset(table, column + 1))) <= 6,
        ).some(Boolean)
      const isOverRowDivider = point.x >= table.left &&
        point.x < table.left + tableWidth(table) &&
        Array.from({ length: table.rows }, (_, row) =>
          Math.abs(point.y - (table.top + tableRowOffset(table, row + 1))) <= 6,
        ).some(Boolean)
      const nextHover = isOverColumnDivider ? 'column' : isOverRowDivider ? 'row' : null
      setTableResizeHover((current) => current === nextHover ? current : nextHover)
    } else {
      setTableResizeHover((current) => current === null ? current : null)
    }

    if (point && tableGesture && table && canvas) {
      const deltaX = point.x - tableGesture.startX
      const deltaY = point.y - tableGesture.startY
      if (Math.abs(deltaX) + Math.abs(deltaY) > 2) tableGesture.moved = true
      if (tableGesture.moved) {
        if (tableGesture.mode === 'resize-row') {
          const row = tableGesture.resizeIndex
          const otherRowsHeight = tableGesture.rowHeights
            .filter((_, index) => index !== row)
            .reduce((total, height) => total + height, 0)
          const maxRowHeight = Math.max(
            28,
            (bounds?.top ?? 0) + (bounds?.height ?? 0) - table.top - otherRowsHeight,
          )
          table.rowHeights = [...tableGesture.rowHeights]
          table.rowHeights[row] = Math.max(
            28,
            Math.min(maxRowHeight, tableGesture.rowHeights[row] + deltaY),
          )
        } else if (tableGesture.mode === 'resize-column') {
          table.columnWidths = [...tableGesture.columnWidths]
          const otherColumnsWidth = tableGesture.columnWidths
            .filter((_, index) => index !== tableGesture.resizeIndex)
            .reduce((total, width) => total + width, 0)
          const maxColumnWidth = Math.max(
            32,
            (bounds?.left ?? 0) + (bounds?.width ?? 0) - table.left - otherColumnsWidth,
          )
          table.columnWidths[tableGesture.resizeIndex] = Math.max(
            32,
            Math.min(
              maxColumnWidth,
              tableGesture.columnWidths[tableGesture.resizeIndex] + deltaX,
            ),
          )
        } else {
          table.left = Math.max(bounds?.left ?? 0, Math.min(
            (bounds?.left ?? 0) + (bounds?.width ?? canvas.getWidth()) - tableWidth(table),
            tableGesture.left + deltaX,
          ))
          table.top = Math.max(bounds?.top ?? 0, Math.min(
            (bounds?.top ?? 0) + (bounds?.height ?? canvas.getHeight()) - tableHeight(table),
            tableGesture.top + deltaY,
          ))
        }
        syncTableLayout(canvas, table)
        canvas.requestRenderAll()
      }
      return
    }
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
      gesturePointsRef.current.push({ x: point.x, y: point.y })
    }
  }

  const onMouseUp = () => {
    const tableGesture = tableGestureRef.current
    if (tableGesture) {
      tableGestureRef.current = null
      if (tableGesture.moved) {
        const table = activeTableRef.current
        if (table) {
          setTableRows(table.rows)
          setTableColumns(table.columns)
        }
        recordHistory(true)
      }
      return
    }
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
}, [activeTool, drawOnDrawingLayer, finishMagicRemoval, hasDocument, paintMagicRemoval, recordHistory, startMagicRemoval, syncTableLayout, tableEditing])
  
  const selectedText = selectedObject instanceof IText ? selectedObject : null
  const selectedIsShape = Boolean(selectedObject && !selectedIsImage && !(selectedObject instanceof IText) && !cropActive)
  const toggleImageResizeLock = () => {
    const nextLocked = !imageResizeLockedRef.current
    imageResizeLockedRef.current = nextLocked
    setImageResizeLocked(nextLocked)
    imageObjectRef.current?.set({
      lockMovementX: nextLocked,
      lockMovementY: nextLocked,
      lockScalingX: nextLocked,
      lockScalingY: nextLocked,
      lockUniScaling: true,
    })
    fabricCanvas?.requestRenderAll()
  }

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
      imageResizeLocked,
      toggleImageResizeLock,
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
      addSignatureImage,
      setDraggingFile,
      notice,
      setNotice,
      deleteImage,
    },
    framesLayout: {
      applyFrame: applyModernFrame,
      createCanvasFrame,
      applyLayout: applyGridLayout,
      addCellImage: addGridCellImage,
      removeCellImage: removeGridCellImage,
      selectCell: selectGridCell,
      cells: gridCells,
      selectedCellId: selectedGridCellId,
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
      reset: resetCrop,
    },
    resize: { width: resizeWidth, height: resizeHeight, setWidth: updateResizeWidth, setHeight: updateResizeHeight, keepRatio, setKeepRatio, scaleArtwork, setScaleArtwork, apply: applyResize },
    text: { selected: selectedText, value: textValue, fontFamily, setFontFamily, fontSize, setFontSize, color: textColor, setColor: setTextColor, background: textBackground, setBackground: setTextBackground, opacity: textOpacity, setOpacity: setTextOpacity, outline: textOutline, setOutline: setTextOutline, outlineWidth: textOutlineWidth, setOutlineWidth: setTextOutlineWidth, shadow: textShadow, setShadow: setTextShadow, add: createText, update: updateText, updateSignatureStyle },
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
      reset: resetBackground,
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
    table: {
      tables: tableList,
      activeId: activeTableId,
      rows: tableRows,
      columns: tableColumns,
      selectedRow: tableSelectedRow,
      selectedColumn: tableSelectedColumn,
      borderColor: tableBorderColor,
      editing: tableEditing,
      resizeHover: tableResizeHover,
      create: createTable,
      select: selectTable,
      beginEditing: beginTableEditing,
      finishEditing: finishTableEditing,
      deleteTable,
      addRow: addTableRow,
      addColumn: addTableColumn,
      removeRow: removeTableRow,
      removeColumn: removeTableColumn,
      selectRow: selectTableRow,
      selectColumn: selectTableColumn,
      setBorderColor: updateTableBorderColor,
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
            const file = event.target.files?.[0]
            const frameId = pendingFrameSlotIdRef.current
            pendingFrameSlotIdRef.current = null
            if (frameId && file) void fillCanvasFrame(frameId, file)
            else void uploadFile(file)
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
