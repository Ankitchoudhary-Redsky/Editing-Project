import type { Dispatch, SetStateAction } from 'react'
import type { Canvas, FabricObject } from 'fabric'

export type EditorTool = 'upload' | 'select' | 'adjust'
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
    setNotice: Dispatch<SetStateAction<string>>
    deleteImage: () => void
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