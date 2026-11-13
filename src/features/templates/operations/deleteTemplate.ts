import type { EditorTemplate } from '../model/template.types'
import { deleteUserTemplate } from '../services/templateStorage'

export function deleteTemplate(template: EditorTemplate) {
  return deleteUserTemplate(template)
}