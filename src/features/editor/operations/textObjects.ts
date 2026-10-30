import { Canvas, IText, Shadow, type FabricObject } from 'fabric'
import type { TextDesignOptions } from '../model/types'

export type NewTextOptions = TextDesignOptions & {
  value: string
  fontFamily: string
  fontSize: number
  color: string
  opacity: number
  outline: string
  outlineWidth: number
  shadow: string
  position?: { left: number; top: number }
  startEditing?: boolean
}

export function createTextObject(canvas: Canvas, options: NewTextOptions) {
  const isPositioned = options.position !== undefined
  const text = new IText(options.value || 'Your text here', {
    left: options.position?.left ?? canvas.getWidth() * 0.2,
    top: options.position?.top ?? canvas.getHeight() * 0.35,
    originX: isPositioned ? 'center' : 'left',
    originY: isPositioned ? 'center' : 'top',
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    fill: options.color,
    fontWeight: options.fontWeight ?? 'normal',
    fontStyle: options.fontStyle ?? 'normal',
    textAlign: options.textAlign ?? 'left',
    backgroundColor: options.backgroundColor ?? '',
    stroke: options.outlineWidth > 0 ? options.outline : undefined,
    strokeWidth: options.outlineWidth,
    opacity: options.opacity / 100,
    shadow: options.shadow === 'none' ? null : new Shadow({ color: 'rgba(12, 20, 17, 0.48)', blur: options.shadow === 'soft' ? 12 : 3, offsetX: 2, offsetY: options.shadow === 'soft' ? 5 : 3 }),
    editable: true,
    cornerColor: '#2c7660',
    transparentCorners: false,
    name: 'Text',
  })
  canvas.add(text)
  canvas.setActiveObject(text)
  canvas.requestRenderAll()
  if (options.startEditing !== false) {
    text.enterEditing()
    text.selectAll()
  }
  return text
}

export function createTextInsideShape(canvas: Canvas, shape: FabricObject, options: NewTextOptions) {
  const shapeId = String(shape.get('shapeId') ?? `shape-${crypto.randomUUID()}`)
  shape.set('shapeId', shapeId)
  const width = Math.max(1, shape.getScaledWidth())
  const height = Math.max(1, shape.getScaledHeight())
  const center = shape.getCenterPoint()
  const text = createTextObject(canvas, {
    ...options,
    position: {
      left: center.x,
      top: center.y,
    },
    startEditing: false,
  })
  text.set({
    textParentId: shapeId,
    textParentWidth: width,
    textParentHeight: height,
    lockMovementX: true,
    lockMovementY: true,
    lockScalingX: true,
    lockScalingY: true,
  })
  const fitScale = Math.min(
    1,
    (width * 0.84) / Math.max(1, text.width),
    (height * 0.68) / Math.max(1, text.height),
  )
  if (fitScale < 1) {
    text.set('fontSize', Math.max(0.1, options.fontSize * fitScale))
    text.initDimensions()
  }
  text.set('textParentFontSize', text.fontSize)
  text.setCoords()
  syncTextWithShape(canvas, shape)
  text.enterEditing()
  text.selectAll()
  return text
}

export function syncTextWithShape(canvas: Canvas, shape: FabricObject) {
  const shapeId = shape.get('shapeId')
  if (!shapeId) return

  const width = Math.max(1, shape.getScaledWidth())
  const height = Math.max(1, shape.getScaledHeight())
  const center = shape.getCenterPoint()
  for (const object of canvas.getObjects()) {
    if (object instanceof IText && object.get('textParentId') === shapeId) {
      const baseWidth = Number(object.get('textParentWidth')) || width
      const baseHeight = Number(object.get('textParentHeight')) || height
      const baseFontSize = Number(object.get('textParentFontSize')) || object.fontSize
      const shapeScale = Math.min(width / baseWidth, height / baseHeight)
      const desiredFontSize = Math.max(0.1, baseFontSize * shapeScale)
      object.set('fontSize', desiredFontSize)
      object.initDimensions()

      const fitScale = Math.min(
        1,
        (width * 0.84) / Math.max(1, object.width),
        (height * 0.68) / Math.max(1, object.height),
      )
      if (fitScale < 1) {
        object.set('fontSize', Math.max(0.1, desiredFontSize * fitScale))
        object.initDimensions()
      }
      object.set({ left: center.x, top: center.y, visible: width > 2 && height > 2 })
      object.setCoords()
    }
  }
  canvas.requestRenderAll()
}

export function updateLinkedTextFontSize(canvas: Canvas, text: IText, fontSize: number) {
  const parentId = text.get('textParentId')
  if (!parentId) return
  const shape = canvas.getObjects().find((object) => object.get('shapeId') === parentId)
  if (!shape) return

  const baseWidth = Number(text.get('textParentWidth')) || shape.getScaledWidth()
  const baseHeight = Number(text.get('textParentHeight')) || shape.getScaledHeight()
  const shapeScale = Math.min(shape.getScaledWidth() / baseWidth, shape.getScaledHeight() / baseHeight)
  text.set('textParentFontSize', fontSize / Math.max(0.001, shapeScale))
  syncTextWithShape(canvas, shape)
}

export function syncParentShapeForText(canvas: Canvas, text: IText) {
  const parentId = text.get('textParentId')
  if (!parentId) return
  const shape = canvas.getObjects().find((object) => object.get('shapeId') === parentId)
  if (shape) syncTextWithShape(canvas, shape)
}