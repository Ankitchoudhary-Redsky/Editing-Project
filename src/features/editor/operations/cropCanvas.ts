import { Canvas, FabricImage, Rect } from 'fabric'
import { cropRatios } from '../model/constants'
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

  canvas.remove(frame)
  canvas.getObjects().forEach((object) => {
    if (object instanceof FabricImage && object === backgroundImage && !object.angle && !object.flipX && !object.flipY) {
      const scaleX = object.scaleX || 1
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
    object.setCoords()
  })
  canvas.setDimensions({ width, height })
  canvas.discardActiveObject()
  canvas.requestRenderAll()
  return { width, height }
}