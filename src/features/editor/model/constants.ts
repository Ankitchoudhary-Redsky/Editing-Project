import {
  MousePointer2,
  Shapes,
  SlidersHorizontal,
  Upload,
  WandSparkles,
  Pencil,
  Layers3,
  PanelsTopLeft,
} from 'lucide-react'
import { Canvas } from 'fabric'
import type { EditorTool, ShapeKind } from './types'

export const BACKGROUND_IMAGE_NAME = '__pixel_studio_background_image__'

export const editorToolCategories: {
  id: string
  label: string
  icon: typeof Upload
  defaultTool: EditorTool
  tools: { id: EditorTool; label: string }[]
}[] = [
  { id: 'upload', label: 'Upload', icon: Upload, defaultTool: 'upload', tools: [{ id: 'upload', label: 'Images' }] },
  { id: 'transform', label: 'Transform', icon: MousePointer2, defaultTool: 'crop', tools: [{ id: 'crop', label: 'Crop' }, { id: 'resize', label: 'Resize' }] },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal, defaultTool: 'adjust', tools: [{ id: 'adjust', label: 'Adjustments' }] },
  { id: 'effects', label: 'Effects', icon: WandSparkles, defaultTool: 'filters', tools: [{ id: 'filters', label: 'Filters' }, { id: 'background', label: 'Background' }] },
  { id: 'elements', label: 'Elements', icon: Shapes, defaultTool: 'text', tools: [{ id: 'text', label: 'Text' }, { id: 'shapes', label: 'Shapes' }, { id: 'stickers', label: 'Stickers' }, { id: 'signature', label: 'Signature' }, { id: 'sticky-note', label: 'Sticky note' }] },
  { id: 'retouch', label: 'Retouch', icon: Pencil, defaultTool: 'draw-remove', tools: [{ id: 'draw-remove', label: 'Retouch' }] },
  { id: 'layers', label: 'Layers', icon: Layers3, defaultTool: 'layers', tools: [{ id: 'layers', label: 'Layers' }] },
  { id: 'frames-layout', label: 'Frames & layout', icon: PanelsTopLeft, defaultTool: 'frames-layout', tools: [{ id: 'frames-layout', label: 'Frames & layout' }] },
]

export const cropRatios: Record<string, number | null> = {
  Free: null,
  '1:1': 1,
  '4:3': 4 / 3,
  '16:9': 16 / 9,
  '3:2': 3 / 2,
}

export const shapeNames: Record<ShapeKind, string> = {
  rect: 'Rectangle',
  roundRect: 'Rounded rectangle',
  circle: 'Circle',
  ellipse: 'Ellipse',
  line: 'Line',
  arrow: 'Arrow',
  triangle: 'Triangle',
  star: 'Star',
  pentagon: 'Pentagon',
}


export const IMAGE_SOURCE_TOKEN = '__pixel_studio_image_source__'
let nextSourceId = 1

const sourceToToken = new Map<string, string>()
const tokenToSource = new Map<string, string>()

function getImageSourceToken(source: string) {
  const existing = sourceToToken.get(source)
  if (existing) return existing

  const token = `__pixel_studio_image_source_${nextSourceId++}__`

  sourceToToken.set(source, token)
  tokenToSource.set(token, source)

  return token
}

export function resolveImageSourceToken(token: string) {
  return tokenToSource.get(token)
}

export function serializeCanvas(canvas: Canvas) {
  return JSON.stringify(
    {
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      scene: canvas.toObject(['name', 'frameTarget', 'frameStyle', 'framePadding', 'frameId', 'frameSlot', 'frameColor', 'gridCellId', 'gridCellIndex', 'gridSlot']),
    },
    (key, value: unknown) => {
      if (
        key === 'src' &&
        typeof value === 'string' &&
        value.startsWith('data:image/')
      ) {
        return getImageSourceToken(value)
      }

      return value
    },
  )
}