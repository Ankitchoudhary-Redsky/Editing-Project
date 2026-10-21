import {
  Crop,
  MousePointer2,
  Shapes,
  SlidersHorizontal,
  Type,
  Upload,
} from 'lucide-react'
import { Canvas } from 'fabric'
import type { EditorTool, ShapeKind } from './types'

export const editorTools: { id: EditorTool; label: string; icon: typeof Upload }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'resize', label: 'Resize', icon: SlidersHorizontal },
  { id: 'crop', label: 'Crop', icon: Crop },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'shapes', label: 'Shapes', icon: Shapes },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
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

export function serializeCanvas(canvas: Canvas) {
  return JSON.stringify({
    width: canvas.getWidth(),
    height: canvas.getHeight(),
    scene: canvas.toJSON(),
  }, (key, value: unknown) =>
    key === 'src' && typeof value === 'string' && value.startsWith('data:image/')
      ? IMAGE_SOURCE_TOKEN
      : value,
  )
}