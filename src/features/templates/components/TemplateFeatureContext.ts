import { createContext, useContext } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { EditorTemplate, TemplatePreferences, TemplateSaveInput } from '../model/template.types'
import type { useTemplates } from '../hooks/useTemplates'

export type TemplateFeatureContextValue = ReturnType<typeof useTemplates> & {
  preferences: TemplatePreferences
  preferencesLoading: boolean
  preferencesError: string
  savePreferences: (preferences: TemplatePreferences) => Promise<void>
  canSaveTemplate: boolean
  canUpdateTemplate: boolean
  galleryOpen: boolean
  openGallery: () => void
  closeGallery: () => void
  saveDialogOpen: boolean
  setSaveDialogOpen: Dispatch<SetStateAction<boolean>>
  detailsTemplate: EditorTemplate | null
  setDetailsTemplate: Dispatch<SetStateAction<EditorTemplate | null>>
  applyTemplate: (template: EditorTemplate) => Promise<boolean>
  saveCurrentTemplate: (input: TemplateSaveInput) => Promise<EditorTemplate>
  updateCurrentTemplate: (template: EditorTemplate) => Promise<EditorTemplate | null>
  renameTemplate: (template: EditorTemplate, name: string) => Promise<EditorTemplate>
  duplicateTemplate: (template: EditorTemplate) => Promise<EditorTemplate>
  deleteTemplate: (template: EditorTemplate) => Promise<void>
  busy: boolean
  operationError: string
  setOperationError: Dispatch<SetStateAction<string>>
}

export const TemplateFeatureContext = createContext<TemplateFeatureContextValue | null>(null)

export function useTemplateFeature() {
  const value = useContext(TemplateFeatureContext)
  if (!value) throw new Error('useTemplateFeature must be used inside TemplateFeatureRoot.')
  return value
}