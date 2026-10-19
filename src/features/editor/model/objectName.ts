import { Circle, FabricImage, IText, Line, Triangle, type FabricObject } from 'fabric'

export function objectName(object: FabricObject, index: number) {
  const customName = (object as FabricObject & { name?: string }).name
  if (customName) return customName
  if (object instanceof FabricImage) return 'Image'
  if (object instanceof IText) return object.text?.split('\n')[0]?.slice(0, 22) || 'Text'
  if (object instanceof Circle) return 'Circle'
  if (object instanceof Triangle) return 'Triangle'
  if (object instanceof Line) return 'Line'
  return `Rectangle ${index + 1}`
}