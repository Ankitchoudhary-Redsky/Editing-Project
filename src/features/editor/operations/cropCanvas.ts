import { Canvas, FabricImage, Rect } from 'fabric'
import { DEFAULT_PAGE_HEIGHT, DEFAULT_PAGE_WIDTH, cropRatios } from '../model/constants'
import type { Dimensions } from '../model/types'

export function createCropFrame(canvas: Canvas) {
  const width = canvas.getWidth() * 0.78
  const height = canvas.getHeight() * 0.78
  return new Rect({
    left: (canvas.getWidth() - width) / 2,
    top: (canvas.getHeight() - height) / 2,
    width,
    height,
    fill: 'rgba(255,255,255,0.03)',
    stroke: '#ffffff',
    strokeWidth: Math.max(2, canvas.getWidth() / 600),
    strokeDashArray: [12, 8],
    transparentCorners: false,
    cornerColor: '#2c7660',
    cornerStyle: 'circle',
    hasRotatingPoint: false,
    name: 'Crop area',
  })
}

export function updateCropRatio(canvas: Canvas, frame: Rect, ratioName: string) {
  const ratio = cropRatios[ratioName]
  frame.set({ lockUniScaling: Boolean(ratio) })
  if (!ratio) return
  const bounds = frame.getBoundingRect()
  let width = bounds.width
  let height = width / ratio
  if (height > canvas.getHeight() * 0.92) {
    height = canvas.getHeight() * 0.92
    width = height * ratio
  }
  frame.set({ width, height, scaleX: 1, scaleY: 1, left: (canvas.getWidth() - width) / 2, top: (canvas.getHeight() - height) / 2 })
  frame.setCoords()
  canvas.requestRenderAll()
}

export function applyCanvasCrop(canvas: Canvas, frame: Rect, backgroundImage: FabricImage | null): Dimensions | null {
  const bounds = frame.getBoundingRect()
  const left = Math.max(0, Math.round(bounds.left))
  const top = Math.max(0, Math.round(bounds.top))
  const width = Math.min(canvas.getWidth() - left, Math.round(bounds.width))
  const height = Math.min(canvas.getHeight() - top, Math.round(bounds.height))
  if (width < 1 || height < 1) return null
  const scale = Math.min(DEFAULT_PAGE_WIDTH / width, DEFAULT_PAGE_HEIGHT / height)
  const offsetX = (DEFAULT_PAGE_WIDTH - width * scale) / 2
  const offsetY = (DEFAULT_PAGE_HEIGHT - height * scale) / 2
  const cropRight = left + width
  const cropBottom = top + height
  const previousClipBounds = canvas.clipPath?.getBoundingRect()
  const visibleLeft = Math.max(left, previousClipBounds?.left ?? 0)
  const visibleTop = Math.max(top, previousClipBounds?.top ?? 0)
  const visibleRight = Math.min(cropRight, (previousClipBounds?.left ?? 0) + (previousClipBounds?.width ?? canvas.getWidth()))
  const visibleBottom = Math.min(cropBottom, (previousClipBounds?.top ?? 0) + (previousClipBounds?.height ?? canvas.getHeight()))


  canvas.remove(frame)
  ;[...canvas.getObjects()].forEach((object) => {
    const objectBounds = object.getBoundingRect()
    const isOutsideCrop = objectBounds.left + objectBounds.width <= visibleLeft ||
      objectBounds.top + objectBounds.height <= visibleTop ||
      objectBounds.left >= visibleRight ||
      objectBounds.top >= visibleBottom
    if (isOutsideCrop) {
      canvas.remove(object)
      return
    }
    if (object instanceof FabricImage && object === backgroundImage && !object.angle && !object.flipX && !object.flipY) {
      const scaleX = object.scaleX || 1
  canvas.set('clipPath', new Rect({
    left: (visibleLeft - left) * scale + offsetX,
    top: (visibleTop - top) * scale + offsetY,
    width: Math.max(1, (visibleRight - visibleLeft) * scale),
    height: Math.max(1, (visibleBottom - visibleTop) * scale),
    originX: 'left',
    originY: 'top',
    fill: '#000000',
    absolutePositioned: true,
    selectable: false,
    evented: false,
    name: 'editor-crop-boundary',
  }))
      const scaleY = object.scaleY || 1
      object.set({
        cropX: (object.cropX || 0) + (left - (object.left || 0)) / scaleX,
        cropY: (object.cropY || 0) + (top - (object.top || 0)) / scaleY,
        width: width / scaleX,
        height: height / scaleY,
        left: 0,
        top: 0,
        originX: 'left',
        originY: 'top',
      })
    } else {
      object.set({ left: (object.left || 0) - left, top: (object.top || 0) - top })
    }
    object.set({
      left: (object.left ?? 0) * scale + offsetX,
      top: (object.top ?? 0) * scale + offsetY,
      scaleX: (object.scaleX ?? 1) * scale,
      scaleY: (object.scaleY ?? 1) * scale,
    })
    object.setCoords()
  })
  if (backgroundImage) {
    const frameOverlay = canvas.getObjects().find(
      (object) => object.get('name') === 'editor-frame-overlay',
    )
    if (frameOverlay) {
      const center = backgroundImage.getCenterPoint()
      frameOverlay.set({
        width: backgroundImage.width,
        height: backgroundImage.height,
        scaleX: backgroundImage.scaleX,
        scaleY: backgroundImage.scaleY,
        angle: backgroundImage.angle,
        flipX: backgroundImage.flipX,
        flipY: backgroundImage.flipY,
        originX: 'center',
        originY: 'center',
      })
      frameOverlay.setPositionByOrigin(center, 'center', 'center')
      frameOverlay.setCoords()
    }
  }
  canvas.setDimensions({ width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT })
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return { width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT }
}