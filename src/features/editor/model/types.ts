import type { FabricObject, IText, Canvas, FabricImage, Rect  } from 'fabric'
import type { Dispatch, SetStateAction, MutableRefObject } from 'react'
import type { useEditorCanvasCore } from '../hooks/useEditorCanvasCore'
import type { useEditorDocumentActions } from '../hooks/useEditorDocumentActions'
import type { useEditorFeatureControllers } from '../hooks/useEditorFeatureControllers'
import type { useEditorSettingsState } from '../hooks/useEditorSettingsState'
import type { useEditorSnapshotController } from '../hooks/useEditorSnapshotController'
import type { useEditorToolActions } from '../hooks/useEditorToolActions'
import type { Pencil } from 'lucide-react'
import type { useEditorCanvasRuntime } from '../hooks/useEditorCanvasRuntime'
import type { useEditorUiState } from '../hooks/useEditorUiState'
import type { useEditorDesignSettingsState } from '../hooks/useEditorDesignSettingsState'
import type { useEditorProjectSettingsState } from '../hooks/useEditorProjectSettingsState'

export type EditorTool = 'upload' | 'select' | 'crop' | 'resize' | 'text' | 'shapes' | 'adjust' | 'music' | 'filters' | 'background' | 'draw-remove' | 'stickers' | 'layers'
export type DrawingMode = 'pencil' | 'eraser' | 'magic-remover' | 'lasso'
export type ShapeKind = 'rect' | 'roundRect' | 'circle' | 'ellipse' | 'line' | 'arrow' | 'triangle' | 'star' | 'pentagon'

export type ExportFormat = 'png' | 'jpeg'

export type EditorUiState = ReturnType<typeof useEditorUiState>

export type EditorContextUiState = {
  dimensions: { width: number; height: number }
  hasDocument: boolean
  hasImage: boolean
  selectedObject: FabricObject | null
  objects: FabricObject[]
  selectedIsImage: boolean
  imageThumbnail: string
  draggingFile: boolean
  setDraggingFile: Dispatch<SetStateAction<boolean>>
  notice: string
  setNotice: Dispatch<SetStateAction<string>>
}

export type CreateEditorContextValueOptions = {
  settings: ReturnType<typeof useEditorSettingsState>
  canvasCore: ReturnType<typeof useEditorCanvasCore>
  documentActions: ReturnType<typeof useEditorDocumentActions>
  features: ReturnType<typeof useEditorFeatureControllers>
  snapshot: ReturnType<typeof useEditorSnapshotController>
  toolActions: ReturnType<typeof useEditorToolActions>
  ui: EditorContextUiState
}

export type EditorEmptyStateProps = {
  onUpload: () => void
  buttonType?: 'button'
}

export type EditorShellProps = {
  historyVersion: number
  setUploadInputElement: (element: HTMLInputElement | null) => void
  setCanvasElement: (element: HTMLCanvasElement | null) => void
  setStageElement: (element: HTMLDivElement | null) => void
}

export type CanvasSurfaceProps = {
  scale: number
  setCanvasElement: EditorWorkspaceProps['setCanvasElement']
  showDrawingCursor: boolean
  brushSize: number
  cursorIcon?: typeof Pencil
  isResizeCursor: boolean
}

export type VideoPreviewData = {
  imageUrl: string
  audioUrl: string
  audioTrackLabel?: 'Music' | 'Voice-over'
  startTime: number
  endTime: number
  volume: number
  voiceOverUrl?: string
  voiceOverVolume?: number
  voiceOverStartTime?: number
}

export type AudioTrackDraft = {
  file: File | null
  url: string
  duration: number
}

export type VideoAudioDraft = {
  music: AudioTrackDraft
  voice: AudioTrackDraft
  startTime: number
  endTime: number
  musicVolume: number
  voiceVolume: number
}

export type EditorCanvas = Canvas
export type FilterId = 'original' | 'grayscale' | 'blackWhite' | 'sepia' | 'vintage' |'retro' | 'warm' | 'cool' | 'vivid' | 'cinematic' | 'dramatic' | 'fade' | 'pastel' | 'noir' | 'dreamy'
export type FilterSettings = { id: FilterId; intensity: number }
export type Dimensions = { width: number; height: number }
export type TextProperty = 'text' | 'fontFamily' | 'fontSize' | 'fill' | 'backgroundColor' | 'opacity' | 'fontWeight' | 'fontStyle' | 'textAlign' | 'stroke' | 'strokeWidth' | 'shadow'

export type ImageBackgroundState = {
  removed: boolean
  isRemoving: boolean
  progress: string
  color: string
}

export type UseImageBackgroundOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  imageSourceRef: MutableRefObject<string>
  backgroundRemovedRef: MutableRefObject<boolean>
  backgroundColorRef: MutableRefObject<string>
  backgroundRemoved: boolean
  isRemovingBackground: boolean
  backgroundProgress: string
  backgroundColor: string
  setBackgroundRemoved: (removed: boolean) => void
  setIsRemovingBackground: (removing: boolean) => void
  setBackgroundProgress: (progress: string) => void
  setBackgroundColor: (color: string) => void
  recordHistory: (immediate?: boolean) => void
  syncObjects: () => void
  setNotice: (notice: string) => void
}

export type CachedLayerThumbnail = { key: string; source: string }

export type UseShapeDrawingOptions = {
  canvas: Canvas | null
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  activeTool: EditorTool
  hasDocument: boolean
  shapeKind: ShapeKind
  fillColor: string
  transparentFill: boolean
  strokeColor: string
  strokeWidth: number
  shapeOpacity: number
  suppressHistoryRef: MutableRefObject<boolean>
  recordHistory: (immediate?: boolean) => void
  syncObjects: () => void
}

export type TrimDrag = {
  pointerId: number
  part: 'move' | 'start' | 'end'
  startX: number
  startTime: number
  endTime: number
}

export type UseAudioTrimOptions = {
  sourceDuration: number
  busy: boolean
  startTime: number
  endTime: number
  setStartTime: (value: number) => void
  setEndTime: (value: number) => void
  stopPreview: () => void
  setError: (message: string) => void
}

export type UseCanvasTransformsOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  cropObjectRef: MutableRefObject<Rect | null>
  cropOriginalSnapshotRef: MutableRefObject<string | null>
  serializeSnapshot: () => string
  restoreSnapshot: (snapshot: string) => Promise<void>
  hasDocument: boolean
  dimensions: { width: number; height: number }
  setDimensions: (dimensions: { width: number; height: number }) => void
  cropActive: boolean
  cropRotation: number
  setCropActive: (active: boolean) => void
  setCropRotation: (rotation: number) => void
  setActiveTool: (tool: EditorTool) => void
  suppressHistoryRef: MutableRefObject<boolean>
  recordHistory: (immediate?: boolean) => void
  syncObjects: () => void
  resizeDisplay: () => void
}

export interface EditorContextValue {
  fabricCanvas: EditorCanvas | null
  canvas: {
    dimensions: Dimensions
    hasDocument: boolean
    hasImage: boolean
    imageThumbnail: string
    selected: FabricObject | null
    objects: FabricObject[]
    selectedIsImage: boolean
    zoom: number
    setZoom: Dispatch<SetStateAction<number>>
    fitScale: number
    fitToScreen: () => void
  }

  history: {
    canUndo: boolean
    canRedo: boolean
    undo: () => void
    redo: () => void
  }

  project: {
    name: string
    setName: Dispatch<SetStateAction<string>>
    isRenaming: boolean
    setIsRenaming: Dispatch<SetStateAction<boolean>>
  }

  tools: {
    active: EditorTool
    setActive: (tool: EditorTool) => void
    openFilePicker: () => void
    uploadFile: (file?: File) => Promise<void>
    setDraggingFile: Dispatch<SetStateAction<boolean>>
    notice: string
    beginCrop: () => void
    setNotice: Dispatch<SetStateAction<string>>
    deleteImage: () => void
  }
  crop: {
    active: boolean
    ratio: string
    rotation: number
    setRatio: Dispatch<SetStateAction<string>>
    changeRatio: (ratio: string) => void
    flipHorizontal: () => void
    flipVertical: () => void
    setRotation: (rotation: number) => void
    apply: () => void
    reset: () => Promise<void>
  }
  resize: {
    width: number
    height: number
    setWidth: (value: number) => void
    setHeight: (value: number) => void
    keepRatio: boolean
    setKeepRatio: Dispatch<SetStateAction<boolean>>
    scaleArtwork: boolean
    setScaleArtwork: Dispatch<SetStateAction<boolean>>
    apply: () => void
  }
    text: {
    selected: IText | null
    value: string
    fontFamily: string
    setFontFamily: Dispatch<SetStateAction<string>>
    fontSize: number
    setFontSize: Dispatch<SetStateAction<number>>
    color: string
    setColor: Dispatch<SetStateAction<string>>
    background: string
    setBackground: Dispatch<SetStateAction<string>>
    opacity: number
    setOpacity: Dispatch<SetStateAction<number>>
    outline: string
    setOutline: Dispatch<SetStateAction<string>>
    outlineWidth: number
    setOutlineWidth: Dispatch<SetStateAction<number>>
    shadow: string
    setShadow: Dispatch<SetStateAction<string>>
    add: () => void
    update: (property: TextProperty, value: string | number) => void
  }
  shapes: {
    selected: FabricObject | null
    isSelectedShape: boolean
    kind: ShapeKind
    setKind: Dispatch<SetStateAction<ShapeKind>>
    fill: string
    setFill: Dispatch<SetStateAction<string>>
    transparentFill: boolean
    setTransparentFill: Dispatch<SetStateAction<boolean>>
    stroke: string
    setStroke: Dispatch<SetStateAction<string>>
    strokeWidth: number
    setStrokeWidth: Dispatch<SetStateAction<number>>
    opacity: number
    setOpacity: Dispatch<SetStateAction<number>>
    add: () => void
    duplicate: () => Promise<void>
    delete: () => void
    updateAppearance: (property: 'fill' | 'stroke' | 'strokeWidth' | 'opacity', value: string | number) => void
    moveLayer: (object: FabricObject, direction: 'forward' | 'backward') => void
    selectLayer: (object: FabricObject) => void
  }
  adjustments: {
    brightness: number
    setBrightness: Dispatch<SetStateAction<number>>
    contrast: number
    setContrast: Dispatch<SetStateAction<number>>
    saturation: number
    setSaturation: Dispatch<SetStateAction<number>>
    apply: (
      brightness?: number,
      contrast?: number,
      saturation?: number,
    ) => void
    reset: () => void
  }

  preview: {
    open: boolean
    imageUrl: string
    mode: 'image' | 'video'
    video: VideoPreviewData | null
    setVideo: Dispatch<SetStateAction<VideoPreviewData | null>>
    show: () => void
    close: () => void
  }
  videoAudio: VideoAudioDraft
  setVideoAudio: Dispatch<SetStateAction<VideoAudioDraft>>
  filters: {
    selected: FilterId
    intensity: number
    setFilter: (id: FilterId) => void
    setIntensity: (value: number) => void
    reset: () => void
  }
  background: {
    removed: boolean
    isRemoving: boolean
    progress: string
    color: string
    setColor: (color: string) => void
    remove: () => Promise<void>
    uploadBackground: (file?: File) => Promise<void>
    clearBackground: () => void
    reset: () => Promise<void>
  }
  drawing: {
    activeMode: DrawingMode
    setActiveMode: (mode: DrawingMode) => void
    color: string
    setColor: (color: string) => void
    brushSize: number
    setBrushSize: (size: number) => void
    clearSelection: () => void
    deleteSelection: () => void
  }
  table: {
    tables: Array<{ id: number; rows: number; columns: number }>
    activeId: number | null
    rows: number
    columns: number
    selectedRow: number
    selectedColumn: number
    borderColor: string
    editing: boolean
    resizeHover: 'row' | 'column' | null
    create: () => void
    select: (id: number) => void
    beginEditing: () => void
    finishEditing: () => void
    deleteTable: () => void
    moveLayer: (id: number, direction: 'forward' | 'backward') => void
    addRow: () => void
    addColumn: () => void
    removeRow: () => void
    removeColumn: () => void
    selectRow: (row: number) => void
    selectColumn: (column: number) => void
    setBorderColor: (color: string) => void
  }
  export: {
    open: boolean
    setOpen: Dispatch<SetStateAction<boolean>>
    format: ExportFormat
    setFormat: Dispatch<SetStateAction<ExportFormat>>
    scale: number
    setScale: Dispatch<SetStateAction<number>>
    watermark: boolean
    setWatermark: Dispatch<SetStateAction<boolean>>
    busy: boolean
    download: () => Promise<void>
  }

  draggingFile: boolean

  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void
}

export type EditorSnapshot = {
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

export type PersistedEditorDraft = EditorSnapshot & {
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

export type EditorSettings = ReturnType<typeof useEditorSettingsState>
export type EditorRuntime = ReturnType<typeof useEditorCanvasRuntime>

export type ProjectSettings = ReturnType<typeof useEditorProjectSettingsState>
export type DesignSettings = ReturnType<typeof useEditorDesignSettingsState>
export type EditorDraftSettings = Omit<
  PersistedEditorDraft,
  'width' | 'height' | 'scene' | 'resizeWidth' | 'resizeHeight' | 'keepRatio' | 'scaleArtwork'
>
export type DraftSettings = Omit<
  PersistedEditorDraft,
  'width' | 'height' | 'scene' | 'resizeWidth' | 'resizeHeight' | 'keepRatio' | 'scaleArtwork'
>

export type EditorWorkspaceProps = {
  setCanvasElement: (element: HTMLCanvasElement | null) => void
  setStageElement: (element: HTMLDivElement | null) => void
}

export type ImageMusicVideoExportProps = {
  fabricCanvas: Canvas
  hasImage: boolean
  imagePreviewUrl: string
  imageDimensions: Dimensions
  isActive?: boolean
  onBack: () => void
}

export type StickerPreset = {
  name: string
  emoji: string
  motion: 'bounce' | 'pulse' | 'spin' | 'wiggle'
  tone: string
}

export type CanvasTable = {
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

export type TableGesture = {
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

export type EditPoint = { x: number; y: number }
export type PixelEditMode = 'brush' | 'lasso'

export type NewShapeOptions = {
  kind: ShapeKind
  fill: string
  transparentFill: boolean
  stroke: string
  strokeWidth: number
  opacity: number
  name: string
}

export type ShapeBounds = {
  left: number
  top: number
  width: number
  height: number
  directionX?: -1 | 1
  directionY?: -1 | 1
}

export type NewTextOptions = {
  value: string
  fontFamily: string
  fontSize: number
  color: string
  opacity: number
  outline: string
  outlineWidth: number
  shadow: string
}

export type LoadedLocalImage = {
  image: FabricImage
  source: string
  dimensions: Dimensions
  thumbnail: string
}

export type GifFrame = {
  dims: { left: number; top: number; width: number; height: number }
  patch: Uint8ClampedArray
  delay: number
  disposalType?: number
}

export type GifData = { lsd: { width: number; height: number } }

export type AnimatedStickerFrames = {
  frameCanvases: HTMLCanvasElement[]
  delays: number[]
  width: number
  height: number
}

export type StickerAnimationAsset =
  | { kind: 'gif'; source: Blob }
  | { kind: 'emoji'; emoji: string; motion: StickerPreset['motion'] }

export type ImageEditingTransform = {
  inverse: [number, number, number, number, number, number]
  width: number
  height: number
  brushScale: number
}

export type OriginalImageState = {
  element: ReturnType<FabricImage['getElement']>
  originalElement: FabricImage['_originalElement']
  width: number
  height: number
  cropX: number
  cropY: number
  filters: FabricImage['filters']
}

export type UseEditorCanvasCoreOptions = {
  activeTool: EditorTool
  setZoom: (zoom: number) => void
  setHasDocument: (hasDocument: boolean) => void
  setHasImage: (hasImage: boolean) => void
  setSelectedObject: (object: FabricObject | null) => void
  setObjects: (objects: FabricObject[]) => void
  setSelectedIsImage: (isImage: boolean) => void
  setImageThumbnail: (thumbnail: string) => void
  setCropRotation: (rotation: number) => void
}

export type UseEditorDocumentActionsOptions = {
  uploadOptions: Omit<UseImageUploadOptions, 'resetTables' | 'resetDrawing'>
  resetTables: () => void
  resetDrawing: () => void
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  cropObjectRef: MutableRefObject<Rect | null>
  cropOriginalSnapshotRef: MutableRefObject<string | null>
  suppressHistoryRef: MutableRefObject<boolean>
  setHasImage: (hasImage: boolean) => void
  setHasDocument: (hasDocument: boolean) => void
  setImageThumbnail: (thumbnail: string) => void
  setCropActive: (active: boolean) => void
  setDimensions: (dimensions: Dimensions) => void
  restoreResize: (settings: ResizeSettings) => void
  restoreBackground: (removed: boolean, color: string) => void
  setIsRemovingBackground: (removing: boolean) => void
  setBackgroundProgress: (progress: string) => void
  recordHistory: (immediate?: boolean) => void
  syncObjects: () => void
  resizeDisplay: () => void
  setNotice: (notice: string) => void
  setDraggingFile: (dragging: boolean) => void
}

export type UseEditorDrawingModeOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  activeTool: EditorTool
  activeDrawingMode: DrawingMode
  hasImage: boolean
}

export type EditorFeatureRefs = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  imageSourceRef: MutableRefObject<string>
  backgroundRemovedRef: MutableRefObject<boolean>
  backgroundColorRef: MutableRefObject<string>
  activeToolRef: MutableRefObject<EditorTool>
  cropObjectRef: MutableRefObject<Rect | null>
  suppressHistoryRef: MutableRefObject<boolean>
}

export type EditorFeatureState = {
  activeTool: EditorTool
  hasDocument: boolean
  hasImage: boolean
  selectedObject: FabricObject | null
  selectedIsImage: boolean
  cropActive: boolean
  activeDrawingMode: DrawingMode
  drawingColor: string
  brushSize: number
  backgroundRemoved: boolean
  isRemovingBackground: boolean
  backgroundProgress: string
  backgroundColor: string
  textValue: string
  fontFamily: string
  fontSize: number
  textColor: string
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
}

export type EditorFeatureActions = {
  setActiveTool: (tool: EditorTool) => void
  setActiveDrawingMode: (mode: DrawingMode) => void
  setTextValue: (value: string) => void
  setBackgroundRemoved: (removed: boolean) => void
  setIsRemovingBackground: (removing: boolean) => void
  setBackgroundProgress: (progress: string) => void
  setBackgroundColor: (color: string) => void
  recordHistory: (immediate?: boolean) => void
  syncObjects: () => void
  setNotice: (notice: string) => void
}

export type UseEditorFeatureControllersOptions = {
  canvas: Canvas | null
  refs: EditorFeatureRefs
  state: EditorFeatureState
  actions: EditorFeatureActions
}

export type UseEditorHistoryActionsOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  suppressHistoryRef: MutableRefObject<boolean>
  historyRef: MutableRefObject<string[]>
  historyIndexRef: MutableRefObject<number>
  historyTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  backgroundRemovedRef: MutableRefObject<boolean>
  backgroundColorRef: MutableRefObject<string>
  selectedFilterRef: MutableRefObject<FilterId>
  filterIntensityRef: MutableRefObject<number>
  restoreScene: (snapshot: EditorSnapshot) => EditorSnapshot['scene']
  restoreTables: (canvas: Canvas) => void
  recordHistory: (immediate?: boolean) => void
  resizeDisplay: () => void
  syncObjects: () => void
  syncHistoryControls: () => void
  touchHistory: () => void
  setDimensions: (dimensions: Dimensions) => void
  setBackgroundRemoved: (removed: boolean) => void
  setBackgroundColor: (color: string) => void
  setSelectedFilter: (filter: FilterId) => void
  setFilterIntensity: (intensity: number) => void
  setImageThumbnail: (thumbnail: string) => void
  setHasDocument: (hasDocument: boolean) => void
}

export type UseEditorKeyboardShortcutsOptions = {
  undo: () => Promise<void>
  redo: () => Promise<void>
  deleteSelected: () => void
  handleTableKeyboardInput: (event: KeyboardEvent) => boolean
}

export type ResizeSettings = {
  width: number
  height: number
  keepRatio: boolean
  scaleArtwork: boolean
}

export type UseEditorDraftRestorationOptions = {
  projectSettings: ProjectSettings
  designSettings: DesignSettings
}

export type UseEditorProjectPersistenceOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  fabricCanvas: Canvas | null
  suppressHistoryRef: MutableRefObject<boolean>
  userEditedBeforeDraftLoadRef: MutableRefObject<boolean>
  draftReady: boolean
  setDraftReady: (ready: boolean) => void
  hasDocument: boolean
  historyVersion: number
  draftSettings: DraftSettings
  resizeSettings: ResizeSettings
  restoreCanvasSnapshot: (snapshot: EditorSnapshot) => Promise<void>
  restoreDraftSettings: (
    draft: PersistedEditorDraft,
    restoreResize: (settings: ResizeSettings) => void,
  ) => void
  restoreResize: (settings: ResizeSettings) => void
  initializeHistory: (canvas: Canvas) => void
  touchHistory: () => void
  setNotice: (notice: string) => void
}

export type UseEditorSnapshotControllerOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  imageSourceRef: MutableRefObject<string>
  cropObjectRef: MutableRefObject<Rect | null>
  cropOriginalSnapshotRef: MutableRefObject<string | null>
  suppressHistoryRef: MutableRefObject<boolean>
  historyRef: MutableRefObject<string[]>
  historyIndexRef: MutableRefObject<number>
  historyTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
  backgroundRemovedRef: MutableRefObject<boolean>
  backgroundColorRef: MutableRefObject<string>
  selectedFilterRef: MutableRefObject<FilterId>
  filterIntensityRef: MutableRefObject<number>
  serializeEditorSnapshot: (canvas: Canvas) => string
  restoreTables: (canvas: Canvas) => void
  restoreBackground: (removed: boolean, color: string) => void
  recordHistory: (immediate?: boolean) => void
  resizeDisplay: () => void
  syncObjects: () => void
  syncHistoryControls: () => void
  touchHistory: () => void
  setDimensions: (dimensions: Dimensions) => void
  setHasDocument: (hasDocument: boolean) => void
  setImageThumbnail: (thumbnail: string) => void
  setBackgroundRemoved: (removed: boolean) => void
  setBackgroundColor: (color: string) => void
  setSelectedFilter: (filter: FilterId) => void
  setFilterIntensity: (intensity: number) => void
  hasDocument: boolean
  dimensions: Dimensions
  cropActive: boolean
  cropRotation: number
  setCropActive: (active: boolean) => void
  setCropRotation: (rotation: number) => void
  setActiveTool: (tool: EditorTool) => void
}

export type UseEditorToolActionsOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  selectedFilterRef: MutableRefObject<FilterId>
  filterIntensityRef: MutableRefObject<number>
  activeTool: EditorTool
  brightness: number
  contrast: number
  saturation: number
  projectName: string
  exportFormat: ExportFormat
  exportScale: number
  exportWatermark: boolean
  videoPreview: VideoPreviewData | null
  cancelCrop: (nextTool?: EditorTool) => void
  setActiveTool: (tool: EditorTool) => void
  recordHistory: (immediate?: boolean) => void
  setBrightness: (value: number) => void
  setContrast: (value: number) => void
  setSaturation: (value: number) => void
  setSelectedFilter: (filter: FilterId) => void
  setFilterIntensity: (intensity: number) => void
  setPreviewUrl: (url: string) => void
  setPreviewMode: (mode: 'image' | 'video') => void
  setPreviewOpen: (open: boolean) => void
  setExportOpen: (open: boolean) => void
  setExportBusy: (busy: boolean) => void
  setNotice: (notice: string) => void
}

export type UseImageUploadOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  imageSourceRef: MutableRefObject<string>
  suppressHistoryRef: MutableRefObject<boolean>
  selectedFilterRef: MutableRefObject<FilterId>
  filterIntensityRef: MutableRefObject<number>
  backgroundRemovedRef: MutableRefObject<boolean>
  backgroundColorRef: MutableRefObject<string>
  resetTables: () => void
  resetDrawing: () => void
  setBackgroundRemoved: (removed: boolean) => void
  setBackgroundColor: (color: string) => void
  setIsRemovingBackground: (removing: boolean) => void
  setBackgroundProgress: (progress: string) => void
  setSelectedFilter: (filter: FilterId) => void
  setFilterIntensity: (intensity: number) => void
  setDimensions: (dimensions: Dimensions) => void
  setHasDocument: (hasDocument: boolean) => void
  setImageThumbnail: (thumbnail: string) => void
  setBrightness: (value: number) => void
  setContrast: (value: number) => void
  setSaturation: (value: number) => void
  setZoom: (zoom: number) => void
  resizeDisplay: () => void
  initializeHistory: (canvas: Canvas) => void
  syncObjects: () => void
  setNotice: (notice: string) => void
  setDraggingFile: (dragging: boolean) => void
  markUserInteractionBeforeDraftLoad: () => void
}

export type UseMagicImageRemovalOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  brushSizeRef: MutableRefObject<number>
  recordHistory: (immediate?: boolean) => void
  syncObjects: () => void
  setNotice: (notice: string) => void
}

export type UseObjectEditingOptions = {
  canvas: Canvas | null
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  cropObjectRef: MutableRefObject<Rect | null>
  selectedObject: FabricObject | null
  selectedIsImage: boolean
  cropActive: boolean
  textValue: string
  fontFamily: string
  fontSize: number
  textColor: string
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
  setActiveTool: (tool: EditorTool) => void
  setTextValue: (value: string) => void
  recordHistory: (immediate?: boolean) => void
}

export type UsePixelDrawingOptions = {
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

export type UseTableEditorOptions = {
  canvas: Canvas | null
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  activeToolRef: MutableRefObject<EditorTool>
  setActiveTool: (tool: EditorTool) => void
  setActiveDrawingMode: (mode: DrawingMode) => void
  recordHistory: (immediate?: boolean) => void
  setNotice: (notice: string) => void
}

export type UseTableInteractionsOptions = {
  canvas: Canvas | null
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  activeToolRef: MutableRefObject<EditorTool>
  activeTableRef: MutableRefObject<CanvasTable | null>
  tableGestureRef: MutableRefObject<TableGesture | null>
  tableEditing: boolean
  tableSelectedRow: number
  tableSelectedColumn: number
  tableSelectedText: string
  setTableRows: (rows: number) => void
  setTableColumns: (columns: number) => void
  setTableSelectedText: (text: string) => void
  setTableResizeHover: Dispatch<SetStateAction<'row' | 'column' | null>>
  recordHistory: (immediate?: boolean) => void
  setNotice: (notice: string) => void
  syncTableLayout: (canvas: Canvas, table: CanvasTable) => void
  selectTableCell: (row: number, column: number) => void
}

export type UseTableStructureActionsOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  tablesRef: MutableRefObject<CanvasTable[]>
  activeTableRef: MutableRefObject<CanvasTable | null>
  nextTableIdRef: MutableRefObject<number>
  tableBorderColor: string
  tableSelectedRow: number
  tableSelectedColumn: number
  setActiveTableId: (id: number | null) => void
  setTableBorderColor: (color: string) => void
  setTableRows: (rows: number) => void
  setTableColumns: (columns: number) => void
  setTableSelectedRow: (row: number) => void
  setTableSelectedColumn: (column: number) => void
  setTableSelectedText: (text: string) => void
  setTableEditing: (editing: boolean) => void
  updateTableList: (tables: CanvasTable[]) => void
  syncTableLayout: (canvas: Canvas, table: CanvasTable) => void
  selectTableCell: (row: number, column: number) => void
  setActiveTool: (tool: EditorTool) => void
  setActiveDrawingMode: (mode: DrawingMode) => void
  recordHistory: (immediate?: boolean) => void
  setNotice: (notice: string) => void
}