import { useCallback, useEffect, useState } from 'react'
import { STARTER_TEMPLATES } from '../data/starterTemplates'
import type { EditorTemplate, PersistedTemplateAsset } from '../model/template.types'
import {
  deleteUserTemplate,
  duplicateUserTemplate,
  listUserTemplates,
  saveUserTemplate,
  updateUserTemplate,
} from '../services/templateStorage'

export function useTemplates() {
  const [userTemplates, setUserTemplates] = useState<EditorTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listUserTemplates()
      setUserTemplates(result.templates)
      setError(result.issues.length ? result.issues[0].split(': ').slice(1).join(': ') : '')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Saved templates could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void listUserTemplates()
      .then((result) => {
        if (!active) return
        setUserTemplates(result.templates)
        setError(result.issues.length ? result.issues[0].split(': ').slice(1).join(': ') : '')
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : 'Saved templates could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const save = useCallback(async (
    template: Omit<EditorTemplate, 'id' | 'source' | 'createdAt' | 'updatedAt' | 'version'>,
    assets: PersistedTemplateAsset[],
  ) => {
    const saved = await saveUserTemplate(template, assets)
    setUserTemplates((current) => [saved, ...current])
    return saved
  }, [])

  const update = useCallback(async (template: EditorTemplate, assets: PersistedTemplateAsset[] = []) => {
    const saved = await updateUserTemplate(template, assets)
    setUserTemplates((current) => current.map((item) => item.id === saved.id ? saved : item))
    return saved
  }, [])

  const duplicate = useCallback(async (template: EditorTemplate) => {
    const saved = await duplicateUserTemplate(template)
    setUserTemplates((current) => [saved, ...current])
    return saved
  }, [])

  const remove = useCallback(async (template: EditorTemplate) => {
    await deleteUserTemplate(template)
    setUserTemplates((current) => current.filter((item) => item.id !== template.id))
  }, [])

  return {
    templates: [...STARTER_TEMPLATES, ...userTemplates],
    userTemplates,
    loading,
    error,
    refresh,
    save,
    update,
    duplicate,
    remove,
  }
}