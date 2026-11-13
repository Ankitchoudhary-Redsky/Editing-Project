import type { Canvas } from 'fabric'
import type { EditorTemplate, TemplateSaveInput } from '../model/template.types'
import { serializeTemplateCanvas } from '../services/templateSerializer'
import { saveUserTemplate } from '../services/templateStorage'

export async function createTemplate(
  canvas: Canvas,
  input: TemplateSaveInput,
  editorState?: Record<string, unknown>,
): Promise<EditorTemplate> {
  const { fabricData, assetReferences, assets } = await serializeTemplateCanvas(canvas)
  if (editorState) fabricData.editor = editorState
  const width = fabricData.width
  const height = fabricData.height
  return saveUserTemplate({
    ...input,
    thumbnail: canvas.toDataURL({ format: 'png', multiplier: 0.24 }),
    fabricData,
    assetReferences,
    orientation: width === height ? 'square' : width > height ? 'landscape' : 'portrait',
    width,
    height,
  }, assets)
}