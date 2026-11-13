import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { TEMPLATE_INDUSTRIES, TEMPLATE_INTERESTS, TEMPLATE_PROFESSIONS } from '../model/template.constants'
import type { TemplatePreferences } from '../model/template.types'
import { TEMPLATE_STYLE_OPTIONS } from '../data/templateStyles'
import { TEMPLATE_OCCASIONS } from '../data/templateOccasions'
import { useTemplateFeature } from './TemplateFeatureContext'

type PreferenceField = 'professions' | 'industries' | 'interests' | 'designStyles' | 'occasions'

export function TemplateOnboarding({ mode = 'onboarding', onClose }: {
  mode?: 'onboarding' | 'settings'
  onClose?: () => void
}) {
  const { preferences, savePreferences, preferencesError, setOperationError } = useTemplateFeature()
  const [draft, setDraft] = useState(preferences)
  const [saving, setSaving] = useState(false)

  const toggle = (field: PreferenceField, value: string) => {
    setDraft((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }))
  }

  const save = async (skip = false) => {
    setSaving(true)
    setOperationError('')
    try {
      const next: TemplatePreferences = skip
        ? { completedOnboarding: true, professions: [], industries: [], interests: [], designStyles: [], occasions: [] }
        : { ...draft, completedOnboarding: true }
      await savePreferences(next)
      onClose?.()
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : 'Preferences could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const section = (label: string, field: PreferenceField, options: readonly string[]) => (
    <fieldset className="template-preference-group">
      <legend>{label}</legend>
      <div className="template-choice-grid">
        {options.map((option) => {
          const selected = draft[field].includes(option)
          return (
            <button key={option} type="button" className={selected ? 'selected' : ''} aria-pressed={selected} onClick={() => toggle(field, option)}>
              {selected && <Check size={13} />}{option}
            </button>
          )
        })}
      </div>
    </fieldset>
  )

  return (
    <div className="template-modal-backdrop" role="presentation">
      <section className="template-preferences-dialog" role="dialog" aria-modal="true" aria-labelledby="template-preferences-title">
        {mode === 'settings' && <button type="button" className="template-modal-close" title="Close preferences" aria-label="Close preferences" onClick={onClose}><X size={18} /></button>}
        <p className="template-eyebrow">Personalize your library</p>
        <h2 id="template-preferences-title">{mode === 'settings' ? 'Your interests' : 'What do you create?'}</h2>
        <p className="template-preferences-intro">Your picks shape recommendations. Every template category stays open.</p>
        {section('Profession', 'professions', TEMPLATE_PROFESSIONS)}
        {section('Industry', 'industries', TEMPLATE_INDUSTRIES)}
        {section('Interests', 'interests', TEMPLATE_INTERESTS)}
        {section('Design styles', 'designStyles', TEMPLATE_STYLE_OPTIONS.map(({ name }) => name))}
        {section('Occasions', 'occasions', TEMPLATE_OCCASIONS.map(({ name }) => name))}
        {preferencesError && <p className="template-inline-error" role="alert">{preferencesError}</p>}
        <div className="template-preferences-actions">
          {mode === 'onboarding' && <button type="button" className="template-text-action" onClick={() => void save(true)} disabled={saving}>Skip for now</button>}
          <button type="button" className="template-primary-action" onClick={() => void save()} disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</button>
        </div>
      </section>
    </div>
  )
}