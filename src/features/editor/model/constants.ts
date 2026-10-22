import {
  Music2,
  Crop,
  Eraser,
  MousePointer2,
  Shapes,
  SlidersHorizontal,
  Type,
  Upload,
  WandSparkles,
  Pencil,
  Sticker,
} from 'lucide-react'
import { Canvas } from 'fabric'
import type { EditorTool, ShapeKind } from './types'

export const BACKGROUND_IMAGE_NAME = '__pixel_studio_background_image__'

export const editorTools: { id: EditorTool; label: string; icon: typeof Upload }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'resize', label: 'Resize', icon: SlidersHorizontal },
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'shapes', label: 'Shapes', icon: Shapes },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
  { id: 'music', label: 'Add music', icon: Music2 },
  { id: 'filters', label: 'Filters', icon: WandSparkles },
  { id: 'background', label: 'Background', icon: Eraser },
  { id: 'draw-remove', label: 'Draw & Remove', icon: Pencil },
  { id: 'stickers', label: 'Stickers', icon: Sticker },
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
      scene: canvas.toObject(['name']),
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