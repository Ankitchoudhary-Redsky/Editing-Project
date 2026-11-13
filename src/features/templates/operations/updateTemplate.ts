import type { Canvas } from 'fabric'
import type { EditorTemplate } from '../model/template.types'
import { serializeTemplateCanvas } from '../services/templateSerializer'
import { updateUserTemplate } from '../services/templateStorage'

export async function updateTemplate(canvas: Canvas, template: EditorTemplate) {
  if (template.source !== 'user') throw new Error('Built-in templates cannot be updated directly.')
  const { fabricData, assetReferences, assets } = await serializeTemplateCanvas(canvas)
  return updateUserTemplate({
    ...template,
    fabricData,
    assetReferences,
    thumbnail: canvas.toDataURL({ format: 'png', multiplier: 0.24 }),
    width: fabricData.width,
    height: fabricData.height,
    orientation: fabricData.width === fabricData.height
      ? 'square'
      : fabricData.width > fabricData.height ? 'landscape' : 'portrait',
  }, assets)
}