import type { Dispatch, SetStateAction } from 'react'
import type { Canvas, FabricObject, IText } from 'fabric'

export type EditorTool = 'upload' | 'select' | 'crop' | 'resize' | 'text' | 'shapes' | 'adjust' | 'music' | 'filters' | 'background' | 'draw-remove' | 'stickers'
export type DrawingMode = 'pencil' | 'eraser' | 'magic-remover' | 'lasso'
export type ShapeKind = 'rect' | 'roundRect' | 'circle' | 'ellipse' | 'line' | 'arrow' | 'triangle' | 'star' | 'pentagon'

export type ExportFormat = 'png' | 'jpeg'


export type VideoPreviewData = {
  imageUrl: string

  // Background music
  audioUrl: string
  audioTrackLabel?: 'Music' | 'Voice-over'
  startTime: number
  endTime: number
  volume: number

  // Optional voice-over support
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

export interface EditorContextValue {
  /** Actual Fabric.js Canvas instance used for image editing. */
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
    addRow: () => void
    addColumn: () => void
    removeRow: () => void
    removeColumn: () => void
    selectRow: (row: number) => void
    selectColumn: (column: number) => void
    setBorderColor: (color: string) => void
  }

  draggingFile: boolean

  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void
}