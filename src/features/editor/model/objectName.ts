import { Circle, FabricImage, IText, Line, Triangle, type FabricObject } from 'fabric'
import { BACKGROUND_IMAGE_NAME, DRAWING_LAYER_NAME, DRAWING_LAYER_TOOL_NAMES, LAYER_DISPLAY_NAME_PROPERTY } from './constants'

export function objectName(object: FabricObject, index: number) {
  const displayName = object.get(LAYER_DISPLAY_NAME_PROPERTY)
  if (typeof displayName === 'string' && displayName.trim()) return displayName.trim()
  const customName = (object as FabricObject & { name?: string }).name
  if (customName === BACKGROUND_IMAGE_NAME) return 'Background'
  if (customName === DRAWING_LAYER_NAME) return 'Drawing'
  const drawingTool = Object.entries(DRAWING_LAYER_TOOL_NAMES).find(([, name]) => name === customName)?.[0]
  if (drawingTool) return `${drawingTool[0].toUpperCase()}${drawingTool.slice(1)}`
  if (customName) return customName
  if (object instanceof FabricImage) return 'Image'
  if (object instanceof IText) return object.text?.split('\n')[0]?.slice(0, 22) || 'Text'
  if (object instanceof Circle) return 'Circle'
  if (object instanceof Triangle) return 'Triangle'
  if (object instanceof Line) return 'Line'
  return `Rectangle ${index + 1}`
}