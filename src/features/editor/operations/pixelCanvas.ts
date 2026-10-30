import { Point, util } from 'fabric'
import type { FabricImage } from 'fabric'
import type { EditPoint, ImageEditingTransform } from '../model/types'

export function createImageEditingTransform(image: FabricImage): ImageEditingTransform {
  const inverse = util.invertTransform(image.calcTransformMatrix())
  const scaleX = Math.hypot(inverse[0], inverse[1])
  const scaleY = Math.hypot(inverse[2], inverse[3])
  return {
    inverse,
    width: image.width,
    height: image.height,
    brushScale: (scaleX + scaleY) / 2,
  }
}

export function toImagePoint(
  image: FabricImage,
  point: EditPoint,
  transform = createImageEditingTransform(image),
): EditPoint {
  const localPoint = util.transformPoint(new Point(point.x, point.y), transform.inverse)
  return {
    x: localPoint.x + transform.width / 2,
    y: localPoint.y + transform.height / 2,
  }
}

export function getImageBrushScale(
  image: FabricImage,
  transform = createImageEditingTransform(image),
) {
  return transform.brushScale
}

export function createVisibleImageCanvas(image: FabricImage) {
  const source = image._originalElement
  const width = Math.max(1, Math.round(image.width))
  const height = Math.max(1, Math.round(image.height))
  const output = document.createElement('canvas')
  output.width = width
  output.height = height
  const context = output.getContext('2d')

  if (!context) throw new Error('Could not edit this image.')

  context.drawImage(
    source,
    image.cropX || 0,
    image.cropY || 0,
    image.width,
    image.height,
    0,
    0,
    width,
    height,
  )
  return output
}