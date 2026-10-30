import { Canvas, Circle, Ellipse, Line, Path, Polygon, Rect, Triangle, type FabricObject } from 'fabric'
import type { LineStyle, ShapeKind } from '../model/types'

export type NewShapeOptions = {
  kind: ShapeKind
  fill: string
  transparentFill: boolean
  stroke: string
  strokeWidth: number
  opacity: number
  name: string
  lineStyle?: LineStyle
}

export type ShapeBounds = {
  left: number
  top: number
  width: number
  height: number
  directionX?: -1 | 1
  directionY?: -1 | 1
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
    const endX = width - startX
    const endY = height - startY
    const lineStyle = options.lineStyle ?? 'straight'
    if (lineStyle === 'straight') {
      shape = new Line([startX, startY, endX, endY], {
        ...common,
        strokeWidth: Math.max(2, options.strokeWidth),
        strokeLineCap: 'round',
      })
    } else {
      const direction = lineStyle === 'curve-up' ? -1 : 1
      const deltaX = endX - startX
      const deltaY = endY - startY
      const length = Math.max(1, Math.hypot(deltaX, deltaY))
      let normalX = -deltaY / length
      let normalY = deltaX / length
      if (normalY < 0 || (normalY === 0 && normalX < 0)) {
        normalX *= -1
        normalY *= -1
      }
      const bend = Math.max(4, Math.min(96, length * 0.22))
      const controlX = (startX + endX) / 2
      const controlY = (startY + endY) / 2
      const controlPointX = controlX + normalX * direction * bend * 2
      const controlPointY = controlY + normalY * direction * bend * 2
      const minX = Math.min(startX, endX, controlPointX)
      const minY = Math.min(startY, endY, controlPointY)
      const path = `M ${startX - minX} ${startY - minY} Q ${controlPointX - minX} ${controlPointY - minY} ${endX - minX} ${endY - minY}`
      shape = new Path(path, {
        ...common,
        left: left + minX,
        top: top + minY,
        strokeWidth: Math.max(2, options.strokeWidth),
        strokeLineCap: 'round',
        strokeLineJoin: 'round',
      })
    }
  } else shape = new Rect({ ...common, width, height, rx: options.kind === 'roundRect' ? Math.min(width, height) * 0.16 : 0, ry: options.kind === 'roundRect' ? Math.min(width, height) * 0.16 : 0 })

  return shape
}

export function createShapeObject(canvas: Canvas, options: NewShapeOptions): FabricObject {
  const shape = buildShapeObject(options, { left: canvas.getWidth() / 2 - 90, top: canvas.getHeight() / 2 - 60, width: 180, height: 120 })
  canvas.add(shape)
  canvas.setActiveObject(shape)
  canvas.requestRenderAll()
  return shape
}