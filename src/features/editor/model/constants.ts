import {
  MousePointer2,
  SlidersHorizontal,
  Upload,
} from 'lucide-react'
import { Canvas } from 'fabric'
import type { EditorTool } from './types'

export const editorTools: { id: EditorTool; label: string; icon: typeof Upload }[] = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'select', label: 'Select', icon: MousePointer2 },
  { id: 'adjust', label: 'Adjust', icon: SlidersHorizontal },
]


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