import { Canvas, Circle, Ellipse, FabricImage, Line, Path, Rect, Triangle, type FabricObject } from 'fabric'
import { shapeNames } from '../model/constants'
import type { NewShapeOptions, ShapeBounds, ShapeKind } from '../model/types'
import { getImageBounds } from './tableGeometry'
import { loadLocalImage } from './loadLocalImage'

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
  const kind = object.get('shapeKind')
  if (typeof kind === 'string' && kind in shapeNames) return true
  const name = String(object.get('name') ?? '')
  return Object.values(shapeNames).some(
    (shapeName) => name === shapeName || name.startsWith(`${shapeName} copy`),
  )
}

const previewBaseSizes = new WeakMap<FabricObject, { width: number; height: number }>()

function polygonPath(points: Array<{ x: number; y: number }>) {
  const [first, ...rest] = points
  return `M ${first.x} ${first.y} ${rest.map((point) => `L ${point.x} ${point.y}`).join(' ')} Z`
}

function createShapePath(kind: ShapeKind, width: number, height: number, strokeWidth: number) {
  const point = (x: number, y: number) => ({ x: x * width, y: y * height })
  const polygon = (points: Array<[number, number]>) => polygonPath(points.map(([x, y]) => point(x, y)))
  if (kind === 'arrow' || kind === 'doubleArrow' || kind === 'curvedArrow') {
    const start = point(0.04, 0.04)
    const end = point(0.96, 0.96)
    const directionX = end.x - start.x
    const directionY = end.y - start.y
    const length = Math.max(1, Math.hypot(directionX, directionY))
    const unitX = directionX / length
    const unitY = directionY / length
    const normalX = -unitY
    const normalY = unitX
    const headLength = Math.min(length * 0.35, Math.max(6, strokeWidth * 4))
    const headWidth = Math.max(3, headLength * 0.42)
    const endBase = { x: end.x - unitX * headLength, y: end.y - unitY * headLength }
    const endHead = `M ${endBase.x + normalX * headWidth} ${endBase.y + normalY * headWidth} L ${end.x} ${end.y} L ${endBase.x - normalX * headWidth} ${endBase.y - normalY * headWidth}`
    const startBase = { x: start.x + unitX * headLength, y: start.y + unitY * headLength }
    const startHead = `M ${startBase.x + normalX * headWidth} ${startBase.y + normalY * headWidth} L ${start.x} ${start.y} L ${startBase.x - normalX * headWidth} ${startBase.y - normalY * headWidth}`
    if (kind === 'curvedArrow') {
      const bend = Math.min(width, height) * 0.45
      const controlX = (start.x + end.x) / 2 + normalX * bend
      const controlY = (start.y + end.y) / 2 + normalY * bend
      return `M ${start.x} ${start.y} Q ${controlX} ${controlY} ${end.x - unitX * headLength * 0.45} ${end.y - unitY * headLength * 0.45} ${endHead}`
    }
    return `M ${start.x} ${start.y} L ${end.x} ${end.y} ${endHead}${kind === 'doubleArrow' ? ` ${startHead}` : ''}`
  }
  if (kind === 'rightTriangle') return polygon([[0, 0], [0, 1], [1, 1]])
  if (kind === 'diamond') return polygon([[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]])
  if (kind === 'star') {
    const points: Array<[number, number]> = Array.from(
      { length: 10 },
      (_, index): [number, number] => {
        const angle = -Math.PI / 2 + (index * Math.PI) / 5
        const radius = index % 2 === 0 ? 0.48 : 0.20

        return [
          0.5 + Math.cos(angle) * radius,
          0.5 + Math.sin(angle) * radius,
        ]
      },
    )

    return polygon(points)
  }
  if (kind === 'pentagon' || kind === 'hexagon' || kind === 'octagon') {
    const sides = {
      pentagon: 5,
      hexagon: 6,
      octagon: 8,
    }[kind]

    const points: Array<[number, number]> = Array.from(
      { length: sides },
      (_, index): [number, number] => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides

        return [
          0.5 + Math.cos(angle) * 0.48,
          0.5 + Math.sin(angle) * 0.48,
        ]
      },
    )

    return polygon(points)
  }
  if (kind === 'heart') return `M ${width * 0.5} ${height * 0.92} C ${width * 0.38} ${height * 0.76} ${width * 0.02} ${height * 0.56} ${width * 0.08} ${height * 0.3} C ${width * 0.14} ${height * 0.02} ${width * 0.43} ${height * 0.05} ${width * 0.5} ${height * 0.28} C ${width * 0.57} ${height * 0.05} ${width * 0.86} ${height * 0.02} ${width * 0.92} ${height * 0.3} C ${width * 0.98} ${height * 0.56} ${width * 0.62} ${height * 0.76} ${width * 0.5} ${height * 0.92} Z`
  if (kind === 'cross') return polygon([[0.05, 0.20], [0.20, 0.05], [0.50, 0.35], [0.80, 0.05], [0.95, 0.20], [0.65, 0.50], [0.95, 0.80], [0.80, 0.95], [0.50, 0.65], [0.20, 0.95], [0.05, 0.80], [0.35, 0.50]])
  if (kind === 'plus') return polygon([[0.38, 0.05], [0.62, 0.05], [0.62, 0.38], [0.95, 0.38], [0.95, 0.62], [0.62, 0.62], [0.62, 0.95], [0.38, 0.95], [0.38, 0.62], [0.05, 0.62], [0.05, 0.38], [0.38, 0.38]])
  if (kind === 'minus') return polygon([[0.05, 0.4], [0.95, 0.4], [0.95, 0.6], [0.05, 0.6]])
  if (kind === 'chevron') return polygon([[0.05, 0.05], [0.55, 0.05], [0.95, 0.5], [0.55, 0.95], [0.05, 0.95], [0.45, 0.5]])
  if (kind === 'parallelogram') return polygon([[0.22, 0.05], [0.98, 0.05], [0.78, 0.95], [0.02, 0.95]])
  if (kind === 'speechBubble') return polygon([[0.05, 0.05], [0.95, 0.05], [0.95, 0.72], [0.38, 0.72], [0.18, 0.98], [0.22, 0.72], [0.05, 0.72]])
  if (kind === 'cloud') return `M ${width * 0.22} ${height * 0.76} C ${width * 0.02} ${height * 0.75} ${width * 0.05} ${height * 0.42} ${width * 0.28} ${height * 0.4} C ${width * 0.28} ${height * 0.12} ${width * 0.62} ${height * 0.08} ${width * 0.72} ${height * 0.34} C ${width * 0.97} ${height * 0.26} ${width * 1.02} ${height * 0.65} ${width * 0.82} ${height * 0.76} Z`
  if (kind === 'ring' || kind === 'donut') {
    const outer = Math.min(width, height) * 0.48
    const inner = outer * (kind === 'ring' ? 0.64 : 0.48)
    const cx = width / 2
    const cy = height / 2
    return `M ${cx} ${cy - outer} A ${outer} ${outer} 0 1 1 ${cx} ${cy + outer} A ${outer} ${outer} 0 1 1 ${cx} ${cy - outer} Z M ${cx} ${cy - inner} A ${inner} ${inner} 0 1 0 ${cx} ${cy + inner} A ${inner} ${inner} 0 1 0 ${cx} ${cy - inner} Z`
  }
  if (kind === 'arc') return `M ${width * 0.08} ${height * 0.82} A ${width * 0.72} ${height * 0.72} 0 0 1 ${width * 0.92} ${height * 0.82}`
  return ''
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
    strokeUniform: true,
    opacity: options.opacity / 100,
    cornerColor: '#2c7660',
    transparentCorners: false,
    name: options.name,
    shapeKind: options.kind,
  }
  let shape: FabricObject
  const path = createShapePath(options.kind, width, height, options.strokeWidth)
  if (options.kind === 'circle') shape = new Circle({ ...common, radius: 50, scaleX: width / 100, scaleY: height / 100 })
  else if (options.kind === 'ellipse') shape = new Ellipse({ ...common, rx: width / 2, ry: height / 2 })
  else if (options.kind === 'triangle') shape = new Triangle({ ...common, width, height })
  else if (options.kind === 'line' || options.kind === 'dashedLine' || options.kind === 'dottedLine') {
    shape = new Line([0, 0, width, height], {
      ...common,
      strokeWidth: options.strokeWidth,
      strokeLineCap: options.kind === 'dottedLine' ? 'round' : 'butt',
      strokeDashArray: options.kind === 'dashedLine' ? [8, 5] : options.kind === 'dottedLine' ? [1, 5] : null,
    })
  } else if (['rect', 'roundRect', 'square'].includes(options.kind)) {
    shape = new Rect({ ...common, width, height, rx: options.kind === 'roundRect' ? Math.min(width, height) * 0.16 : 0, ry: options.kind === 'roundRect' ? Math.min(width, height) * 0.16 : 0 })
  } else {
    shape = new Path(path, {
      ...common,
      fill: ['arrow', 'doubleArrow', 'curvedArrow', 'arc'].includes(options.kind) ? 'rgba(0,0,0,0)' : common.fill,
      fillRule: options.kind === 'ring' || options.kind === 'donut' ? 'evenodd' : 'nonzero',
      strokeLineCap: 'round',
      strokeLineJoin: 'round',
    })
  }
  previewBaseSizes.set(shape, { width: Math.max(width, 1), height: Math.max(height, 1) })
  return shape
}

export function updateShapeObject(object: FabricObject, bounds: ShapeBounds, kind: ShapeKind) {
  const width = Math.max(1, bounds.width)
  const height = Math.max(1, bounds.height)
  if (object instanceof Circle) {
    object.set({ left: bounds.left, top: bounds.top, radius: 50, scaleX: width / 100, scaleY: height / 100, flipX: bounds.directionX === -1, flipY: bounds.directionY === -1 })
  } else if (object instanceof Ellipse) {
    object.set({ left: bounds.left, top: bounds.top, rx: width / 2, ry: height / 2, scaleX: 1, scaleY: 1, flipX: bounds.directionX === -1, flipY: bounds.directionY === -1 })
  } else if (object instanceof Triangle) {
    object.set({ left: bounds.left, top: bounds.top, width, height, scaleX: 1, scaleY: 1, flipX: bounds.directionX === -1, flipY: bounds.directionY === -1 })
  } else if (object instanceof Rect) {
    object.set({ left: bounds.left, top: bounds.top, width, height, rx: kind === 'roundRect' ? Math.min(width, height) * 0.16 : 0, ry: kind === 'roundRect' ? Math.min(width, height) * 0.16 : 0, scaleX: 1, scaleY: 1, flipX: bounds.directionX === -1, flipY: bounds.directionY === -1 })
  } else {
    const base = previewBaseSizes.get(object) ?? { width: Math.max(object.width, 1), height: Math.max(object.height, 1) }
    object.set({ left: bounds.left, top: bounds.top, scaleX: width / base.width, scaleY: height / base.height, flipX: bounds.directionX === -1, flipY: bounds.directionY === -1 })
  }
  object.setCoords()
  object.dirty = true
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

export async function addImageInsideShape(canvas: Canvas, shape: FabricObject, file: File) {
  const shapeId = String(shape.get('shapeId') ?? `shape-${crypto.randomUUID()}`)
  shape.set('shapeId', shapeId)

  const { image } = await loadLocalImage(file)
  const shapeWidth = Math.max(1, shape.getScaledWidth())
  const shapeHeight = Math.max(1, shape.getScaledHeight())
  const center = shape.getCenterPoint()
  const coverScale = Math.max(shapeWidth / image.width, shapeHeight / image.height)
  const clipPath = await shape.clone()
  clipPath.set({
    absolutePositioned: true,
    fill: '#000000',
    stroke: null,
    strokeWidth: 0,
    opacity: 1,
    shadow: null,
    selectable: false,
    evented: false,
  })

  image.set({
    name: 'Image in shape',
    left: center.x,
    top: center.y,
    originX: 'center',
    originY: 'center',
    scaleX: coverScale,
    scaleY: coverScale,
    angle: shape.angle,
    clipPath,
    selectable: false,
    evented: false,
    imageParentId: shapeId,
  })
  canvas.add(image)
  canvas.requestRenderAll()
  return image
}

export function syncImageWithShape(canvas: Canvas, shape: FabricObject) {
  const shapeId = shape.get('shapeId')
  if (!shapeId) return

  const shapeWidth = Math.max(1, shape.getScaledWidth())
  const shapeHeight = Math.max(1, shape.getScaledHeight())
  const center = shape.getCenterPoint()
  for (const object of canvas.getObjects()) {
    if (!(object instanceof FabricImage) || object.get('imageParentId') !== shapeId) continue
    const coverScale = Math.max(shapeWidth / object.width, shapeHeight / object.height)
    object.set({
      left: center.x,
      top: center.y,
      scaleX: coverScale,
      scaleY: coverScale,
      angle: shape.angle,
      visible: shapeWidth > 2 && shapeHeight > 2,
    })
    object.clipPath?.set({
      left: shape.left,
      top: shape.top,
      originX: shape.originX,
      originY: shape.originY,
      scaleX: shape.scaleX,
      scaleY: shape.scaleY,
      angle: shape.angle,
      flipX: shape.flipX,
      flipY: shape.flipY,
      skewX: shape.skewX,
      skewY: shape.skewY,
    })
    object.clipPath?.setCoords()
    object.setCoords()
  }
  canvas.requestRenderAll()
}