import type { Canvas } from 'fabric'
import type { ExportFormat } from '../model/types'
import { drawProjectWatermark } from './projectWatermark'

export async function createEditorPreview(
  canvas: Canvas,
  includeWatermark: boolean,
) {
  const lassoPreviews = canvas.getObjects().filter(
    (object) => object.get('name') === '__pixel_studio_lasso_preview__',
  )
  const previousVisibility = lassoPreviews.map((object) => object.visible)

  lassoPreviews.forEach((object) => {
    object.visible = false
  })

  const output = (() => {
    try {
      return canvas.toCanvasElement(1)
    } finally {
      lassoPreviews.forEach((object, index) => {
        object.visible = previousVisibility[index]
      })
      canvas.requestRenderAll()
    }
  })()

  if (includeWatermark) await drawProjectWatermark(output)
  return output.toDataURL('image/png')
}

export async function downloadEditorImage(
  canvas: Canvas,
  projectName: string,
  format: ExportFormat,
  scale: number,
  includeWatermark: boolean,
) {
  const output = canvas.toCanvasElement(scale)
  const context = output.getContext('2d')
  if (!context) throw new Error('Could not prepare the export image.')

  if (format === 'jpeg') {
    context.globalCompositeOperation = 'destination-over'
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, output.width, output.height)
    context.globalCompositeOperation = 'source-over'
  }

  if (includeWatermark) await drawProjectWatermark(output)
  const data = output.toDataURL(
    format === 'jpeg' ? 'image/jpeg' : 'image/png',
    format === 'jpeg' ? 0.94 : 1,
  )
  const link = document.createElement('a')
  const safeName = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'pixel-studio-design'
  link.href = data
  link.download = `${safeName}.${format === 'jpeg' ? 'jpg' : 'png'}`
  link.click()
}