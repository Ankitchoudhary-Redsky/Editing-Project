import { useCallback, useState } from 'react'
import type { ReactNode } from 'react'
import { useEditor } from '../../editor/EditorContext'
import type { EditorTemplate, TemplatePreferences, TemplateSaveInput } from '../model/template.types'
import { createTemplate } from '../operations/createTemplate'
import { updateTemplate } from '../operations/updateTemplate'
import { useTemplates } from '../hooks/useTemplates'
import { useUserTemplatePreferences } from '../hooks/useUserTemplatePreferences'
import { TemplateFeatureContext } from './TemplateFeatureContext'
import { TemplateExperience } from './TemplateExperience'
import '../templates.css'

function useTemplateFeatureValue(loadTemplate: (template: EditorTemplate) => Promise<void>) {
  const editor = useEditor()
  const templateState = useTemplates()
  const preferenceState = useUserTemplatePreferences()
  const { refresh, update, duplicate, remove, userTemplates } = templateState
  const { update: persistPreferences } = preferenceState
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [detailsTemplate, setDetailsTemplate] = useState<EditorTemplate | null>(null)
  const [busy, setBusy] = useState(false)
  const [operationError, setOperationError] = useState('')
  
  const openGallery = useCallback(() => setGalleryOpen(true), [])
  const closeGallery = useCallback(() => {
    setGalleryOpen(false)
    setDetailsTemplate(null)
  }, [])

  const applyTemplate = useCallback(async (template: EditorTemplate) => {
    if (editor.canvas.hasDocument && !window.confirm(`Replace the current page with “${template.name}”?`)) return false
    setBusy(true)
    setOperationError('')
    try {
      await loadTemplate(template)
      setGalleryOpen(false)
      setDetailsTemplate(null)
      return true
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'This template could not be loaded.')
      return false
    } finally {
      setBusy(false)
    }
  }, [editor.canvas.hasDocument, loadTemplate])

  const saveCurrentTemplate = useCallback(async (input: TemplateSaveInput) => {
    const canvas = editor.fabricCanvas
    if (!canvas) throw new Error('The editor canvas is not ready yet.')
    if (!editor.canvas.hasDocument) throw new Error('Add editable content before saving a template.')
    const saved = await createTemplate(canvas, input, {
      filterId: editor.filters.selected,
      filterIntensity: editor.filters.intensity,
      backgroundRemoved: editor.background.removed,
      backgroundColor: editor.background.color,
    })
    await refresh()
    setSaveDialogOpen(false)
    return saved
  }, [editor.background.color, editor.background.removed, editor.canvas.hasDocument, editor.fabricCanvas, editor.filters.intensity, editor.filters.selected, refresh])

  const updateCurrentTemplate = useCallback(async (template: EditorTemplate) => {
    const canvas = editor.fabricCanvas
    if (!canvas) throw new Error('The editor canvas is not ready yet.')
    if (!editor.canvas.hasDocument) throw new Error('Add editable content before updating a template.')
    if (template.source !== 'user') throw new Error('Built-in templates cannot be updated directly.')
    if (!window.confirm(`Replace the saved design in “${template.name}” with the current canvas?`)) return null
    const updated = await updateTemplate(canvas, template)
    await refresh()
    return updated
  }, [editor.canvas.hasDocument, editor.fabricCanvas, refresh])

  const renameTemplate = useCallback(async (template: EditorTemplate, name: string) => {
    if (!name.trim()) throw new Error('Enter a template name.')
    if (userTemplates.some((item) => item.id !== template.id && item.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) {
      throw new Error('A saved template already uses that name.')
    }
    return update({ ...template, name: name.trim() })
  }, [update, userTemplates])

  const duplicateTemplate = useCallback((template: EditorTemplate) => duplicate(template), [duplicate])
  const deleteTemplate = useCallback((template: EditorTemplate) => remove(template), [remove])
  const savePreferences = useCallback((preferences: TemplatePreferences) => persistPreferences(preferences), [persistPreferences])

  return {
    ...templateState,
    preferences: preferenceState.preferences,
    preferencesLoading: preferenceState.loading,
    preferencesError: preferenceState.error,
    savePreferences,
    canSaveTemplate: editor.canvas.hasDocument,
    canUpdateTemplate: editor.canvas.hasDocument,
    galleryOpen,
    openGallery,
    closeGallery,
    saveDialogOpen,
    setSaveDialogOpen,
    detailsTemplate,
    setDetailsTemplate,
    applyTemplate,
    saveCurrentTemplate,
    updateCurrentTemplate,
    renameTemplate,
    duplicateTemplate,
    deleteTemplate,
    busy,
    operationError,
    setOperationError,
  }
}

export function TemplateFeatureRoot({
  children,
  loadTemplate,
}: {
  children: ReactNode
  loadTemplate: (template: EditorTemplate) => Promise<void>
}) {
  const value = useTemplateFeatureValue(loadTemplate)
  return (
    <TemplateFeatureContext.Provider value={value}>
      {children}
      <TemplateExperience />
    </TemplateFeatureContext.Provider>
  )
}