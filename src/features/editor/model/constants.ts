import {
  MousePointer2,
  Shapes,
  SlidersHorizontal,
  Upload,
  WandSparkles,
  Pencil,
  Layers3,
} from 'lucide-react'
import { Canvas } from 'fabric'
import type { DrawingMode, EditorTool, ShapeKind } from './types'

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
  { id: 'elements', label: 'Elements', icon: Shapes, defaultTool: 'text', tools: [{ id: 'text', label: 'Text' }, { id: 'shapes', label: 'Shapes' }, { id: 'stickers', label: 'Stickers' }] },
  { id: 'retouch', label: 'Retouch', icon: Pencil, defaultTool: 'draw-remove', tools: [{ id: 'draw-remove', label: 'Retouch' }] },
  { id: 'layers', label: 'Layers', icon: Layers3, defaultTool: 'layers', tools: [{ id: 'layers', label: 'Layers' }] },
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

export const resizePresets = [
  { label: 'Square', width: 1080, height: 1080 },
  { label: 'Portrait', width: 1080, height: 1350 },
  { label: 'Landscape', width: 1600, height: 900 },
  { label: 'Story', width: 1080, height: 1920 },
]

export const textFontFamilies = ['Georgia', 'Arial', 'Verdana', 'Trebuchet MS', 'Courier New', 'Times New Roman']

export const drawingModeDescriptions: Record<DrawingMode, string> = {
  pencil: 'Draw freehand strokes on your image.',
  eraser: 'Erase pencil strokes from your design.',
  'magic-remover': 'Brush over image areas to make them transparent.',
  lasso: 'Draw around an image area to select it.',
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
  const scene = canvas.toObject(['name']) as Record<string, unknown>
  const replaceImageSources = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(replaceImageSources)
      return
    }
    if (!value || typeof value !== 'object') return

    for (const [key, child] of Object.entries(value)) {
      if (key === 'src' && typeof child === 'string' && child.startsWith('data:image/')) {
        ;(value as Record<string, unknown>)[key] = getImageSourceToken(child)
      } else {
        replaceImageSources(child)
      }
    }
  }
  replaceImageSources(scene)

  return {
    width: canvas.getWidth(),
    height: canvas.getHeight(),
    scene,
  }
}