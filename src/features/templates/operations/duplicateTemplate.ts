import type { EditorTemplate } from '../model/template.types'
import { duplicateUserTemplate } from '../services/templateStorage'

export function duplicateTemplate(template: EditorTemplate) {
  return duplicateUserTemplate(template)
}