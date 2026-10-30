import { Canvas, Circle, Ellipse, FabricImage, Line, Path, Polygon, Rect, Triangle, type FabricObject } from 'fabric'
import { shapeNames } from '../model/constants'
import type { NewShapeOptions, ShapeBounds } from '../model/types'
import { getImageBounds } from './tableGeometry'

export function constrainShapeToImage(canvas: Canvas, image: FabricImage | null, object: FabricObject) {
  const bounds = getImageBounds(canvas, image)
  if (!bounds.width || !bounds.height) return

  object.setCoords()
  let objectBounds = object.getBoundingRect()
  const scale = Math.min(
    1,
    bounds.width / Math.max(1, objectBounds.width),
    bounds.height / Math.max(1, objectBounds.height),
  )
  if (scale < 1) {
    object.set({
      scaleX: (object.scaleX ?? 1) * scale,
      scaleY: (object.scaleY ?? 1) * scale,
    })
    object.setCoords()
    objectBounds = object.getBoundingRect()
  }

  const right = bounds.left + bounds.width
  const bottom = bounds.top + bounds.height
  const offsetX = objectBounds.left < bounds.left
    ? bounds.left - objectBounds.left
    : objectBounds.left + objectBounds.width > right
      ? right - objectBounds.left - objectBounds.width
      : 0
  const offsetY = objectBounds.top < bounds.top
    ? bounds.top - objectBounds.top
    : objectBounds.top + objectBounds.height > bottom
      ? bottom - objectBounds.top - objectBounds.height
      : 0
  object.set({
    left: (object.left ?? 0) + offsetX,
    top: (object.top ?? 0) + offsetY,
  })
  object.setCoords()
}

export function isShapeObject(object: FabricObject) {
  const name = String(object.get('name') ?? '')
  return Object.values(shapeNames).some(
    (shapeName) => name === shapeName || name.startsWith(`${shapeName} copy`),
  )
}

export function buildShapeObject(options: NewShapeOptions, bounds: ShapeBounds): FabricObject {
  const { left, top, width, height } = bounds
  const common = {
    left,
    top,
    originX: 'left' as const,
    originY: 'top' as const,
    fill: options.kind === 'line' || options.kind === 'arrow' || options.transparentFill ? 'rgba(0,0,0,0)' : options.fill,
    stroke: options.stroke,
    strokeWidth: options.strokeWidth,
    opacity: options.opacity / 100,
    cornerColor: '#2c7660',
    transparentCorners: false,
    name: options.name,
  }
  let shape: FabricObject
  if (options.kind === 'circle') shape = new Circle({ ...common, radius: 50, scaleX: width / 100, scaleY: height / 100 })
  else if (options.kind === 'ellipse') shape = new Ellipse({ ...common, rx: width / 2, ry: height / 2 })
  else if (options.kind === 'triangle') shape = new Triangle({ ...common, width, height })
  else if (options.kind === 'star' || options.kind === 'pentagon') {
    const count = options.kind === 'star' ? 10 : 5
    const points = Array.from({ length: count }, (_, index) => {
      const angle = -Math.PI / 2 + (index * Math.PI * 2) / count
      const radius = options.kind === 'star' && index % 2 === 1 ? 0.22 : 0.5
      return { x: width / 2 + Math.cos(angle) * width * radius, y: height / 2 + Math.sin(angle) * height * radius }
    })
    shape = new Polygon(points, common)
  } else if (options.kind === 'arrow') {
    const startX = bounds.directionX === -1 ? width : 0
    const startY = bounds.directionY === -1 ? height : 0
    const endX = width - startX
    const endY = height - startY
    const deltaX = endX - startX
    const deltaY = endY - startY
    const angle = Math.atan2(deltaY, deltaX)
    const length = Math.hypot(deltaX, deltaY)
    const headLength = Math.min(length * 0.4, Math.max(10, options.strokeWidth * 4))
    const wingOne = {
      x: endX + Math.cos(angle + Math.PI - Math.PI / 6) * headLength,
      y: endY + Math.sin(angle + Math.PI - Math.PI / 6) * headLength,
    }
    const wingTwo = {
      x: endX + Math.cos(angle - Math.PI + Math.PI / 6) * headLength,
      y: endY + Math.sin(angle - Math.PI + Math.PI / 6) * headLength,
    }
    const points = [
      { x: startX, y: startY },
      { x: endX, y: endY },
      wingOne,
      wingTwo,
    ]
    const minX = Math.min(...points.map((point) => point.x))
    const minY = Math.min(...points.map((point) => point.y))
    const path = `M ${startX - minX} ${startY - minY} L ${endX - minX} ${endY - minY} M ${wingOne.x - minX} ${wingOne.y - minY} L ${endX - minX} ${endY - minY} L ${wingTwo.x - minX} ${wingTwo.y - minY}`

    shape = new Path(path, {
      ...common,
      left: left + minX,
      top: top + minY,
      fill: 'rgba(0,0,0,0)',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    })
  } else if (options.kind === 'line') {
    const startX = bounds.directionX === -1 ? width : 0
    const startY = bounds.directionY === -1 ? height : 0
    shape = new Line([startX, startY, width - startX, height - startY], {
      ...common,
      strokeWidth: Math.max(2, options.strokeWidth),
      strokeLineCap: 'round',
    })
  } else shape = new Rect({ ...common, width, height, rx: options.kind === 'roundRect' ? Math.min(width, height) * 0.16 : 0, ry: options.kind === 'roundRect' ? Math.min(width, height) * 0.16 : 0 })

  return shape
}

export function createShapeObject(canvas: Canvas, options: NewShapeOptions): FabricObject {
  const shape = buildShapeObject(options, { left: canvas.getWidth() / 2 - 90, top: canvas.getHeight() / 2 - 60, width: 180, height: 120 })
  const image = canvas.getObjects().find((object) => object instanceof FabricImage && object.get('name') !== '__pixel_studio_background_image__')
  constrainShapeToImage(canvas, image instanceof FabricImage ? image : null, shape)
  canvas.add(shape)
  canvas.setActiveObject(shape)
  canvas.requestRenderAll()
  return shape
}