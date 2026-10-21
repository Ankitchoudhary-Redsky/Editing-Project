import { Canvas, Circle, Ellipse, Line, Path, Polygon, Rect, Triangle, type FabricObject } from 'fabric'
import type { ShapeKind } from '../model/types'

export type NewShapeOptions = {
  kind: ShapeKind
  fill: string
  transparentFill: boolean
  stroke: string
  strokeWidth: number
  opacity: number
  name: string
}

export type ShapeBounds = { left: number; top: number; width: number; height: number }

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
    shape = new Path(`M 0 0 L ${width} ${height} M ${width * 0.72} ${height - height * 0.28} L ${width} ${height} L ${width - width * 0.28} ${height * 0.72}`, {
      ...common,
      fill: 'rgba(0,0,0,0)',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    })
  } else if (options.kind === 'line') {
    shape = new Line([0, 0, width, height], {
      ...common,
      strokeWidth: Math.max(2, options.strokeWidth),
      strokeLineCap: 'round',
    })
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