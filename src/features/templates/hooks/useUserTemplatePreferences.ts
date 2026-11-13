import { useCallback, useEffect, useState } from 'react'
import { EMPTY_TEMPLATE_PREFERENCES } from '../model/template.constants'
import type { TemplatePreferences } from '../model/template.types'
import { loadTemplatePreferences, saveTemplatePreferences } from '../services/templateStorage'

export function useUserTemplatePreferences() {
  const [preferences, setPreferences] = useState(EMPTY_TEMPLATE_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void loadTemplatePreferences()
      .then((saved) => {
        if (active && saved) setPreferences({ ...EMPTY_TEMPLATE_PREFERENCES, ...saved })
      })
      .catch(() => {
        if (active) setError('Template preferences could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const update = useCallback(async (next: TemplatePreferences) => {
    setPreferences(next)
    setError('')
    try {
      await saveTemplatePreferences(next)
    } catch {
      setError('Template preferences could not be saved in browser storage.')
      throw new Error('Template preferences could not be saved in browser storage.')
    }
  }, [])

  return { preferences, update, loading, error }
}