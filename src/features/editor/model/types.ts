import type { Dispatch, SetStateAction } from 'react'
import type { Canvas, FabricObject } from 'fabric'

export type EditorTool = 'upload' | 'select' | 'crop' | 'resize' | 'adjust'
export type ShapeKind = 'rect' | 'circle' | 'line' | 'arrow' | 'triangle'
export type ExportFormat = 'png' | 'jpeg'
export type Dimensions = { width: number; height: number }
export type TextProperty = 'text' | 'fontFamily' | 'fontSize' | 'fill' | 'backgroundColor' | 'opacity' | 'fontWeight' | 'fontStyle' | 'textAlign'

export interface EditorContextValue {
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
    setActive: Dispatch<SetStateAction<EditorTool>>
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
    cancel: () => void
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
  adjustments: {
    brightness: number
    setBrightness: Dispatch<SetStateAction<number>>
    contrast: number
    setContrast: Dispatch<SetStateAction<number>>
    saturation: number
    setSaturation: Dispatch<SetStateAction<number>>
    apply: (brightness?: number, contrast?: number, saturation?: number) => void
    reset: () => void
  }
  preview: {
    open: boolean
    imageUrl: string
    show: () => void
    close: () => void
  }
  draggingFile: boolean
  handleDrop: (event: React.DragEvent<HTMLDivElement>) => void
}

export type EditorCanvas = Canvas