import { useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { TEMPLATE_CATEGORIES } from '../data/templateCategories'
import { TEMPLATE_OCCASIONS } from '../data/templateOccasions'
import { TEMPLATE_PROFESSION_OPTIONS } from '../data/templateProfessions'
import { TEMPLATE_STYLE_OPTIONS } from '../data/templateStyles'
import type { TemplateSaveInput } from '../model/template.types'
import { useEditor } from '../../editor/EditorContext'
import { useTemplateFeature } from './TemplateFeatureContext'

export function SaveTemplateDialog() {
  const editor = useEditor()
  const { templates, saveDialogOpen, setSaveDialogOpen, saveCurrentTemplate, setOperationError } = useTemplateFeature()
  const [preview] = useState(() => editor.fabricCanvas?.toDataURL({ format: 'png', multiplier: 0.24 }) ?? '')
  const firstCategory = TEMPLATE_CATEGORIES[0]
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState(firstCategory.id)
  const [subcategory, setSubcategory] = useState(firstCategory.subcategories[0])
  const [tags, setTags] = useState('')
  const [profession, setProfession] = useState<string[]>([])
  const [industry, setIndustry] = useState<string[]>([])
  const [occasion, setOccasion] = useState('')
  const [designStyles, setDesignStyles] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedCategory = useMemo(() => TEMPLATE_CATEGORIES.find((item) => item.id === category) ?? firstCategory, [category, firstCategory])
  if (!saveDialogOpen) return null

  const toggle = (current: string[], setCurrent: (next: string[]) => void, value: string) => {
    setCurrent(current.includes(value) ? current.filter((item) => item !== value) : [...current, value])
  }

  const save = async () => {
    if (!name.trim()) {
      setError('Enter a template name before saving.')
      return
    }
    if (templates.some((template) => template.source === 'user' && template.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase())) {
      setError('A saved template already uses that name.')
      return
    }
    const input: TemplateSaveInput = {
      name: name.trim(),
      description: description.trim(),
      category,
      subcategory,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      profession,
      industry,
      occasion: occasion || undefined,
      designStyles,
      supportedFormats: ['image', 'print'],
    }
    setSaving(true)
    setError('')
    setOperationError('')
    try {
      await saveCurrentTemplate(input)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Template could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  const selectedOptions = (event: React.ChangeEvent<HTMLSelectElement>) => Array.from(event.target.selectedOptions, (option) => option.value)

  return (
    <div className="template-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSaveDialogOpen(false) }}>
      <section className="template-save-dialog" role="dialog" aria-modal="true" aria-labelledby="template-save-title">
        <button type="button" className="template-modal-close" title="Close save dialog" aria-label="Close save dialog" onClick={() => setSaveDialogOpen(false)}><X size={18} /></button>
        <div className="template-save-preview">
          {preview && <img src={preview} alt="Current design preview" />}
          <div><p className="template-eyebrow">Personal library</p><h2 id="template-save-title">Save as template</h2><p>{editor.canvas.dimensions.width} × {editor.canvas.dimensions.height}</p></div>
        </div>
        <label>Template name<input autoFocus value={name} onChange={(event) => setName(event.target.value)} maxLength={70} placeholder="e.g. Studio launch post" /></label>
        <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={2} maxLength={240} placeholder="A short description" /></label>
        <div className="template-save-fields">
          <label>Category<select value={category} onChange={(event) => { const next = TEMPLATE_CATEGORIES.find((item) => item.id === event.target.value) ?? firstCategory; setCategory(next.id); setSubcategory(next.subcategories[0]) }}>{TEMPLATE_CATEGORIES.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}</select></label>
          <label>Subcategory<select value={subcategory} onChange={(event) => setSubcategory(event.target.value)}>{selectedCategory.subcategories.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Occasion<select value={occasion} onChange={(event) => setOccasion(event.target.value)}><option value="">None</option>{TEMPLATE_OCCASIONS.map(({ name: label }) => <option key={label}>{label}</option>)}</select></label>
          <label>Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Comma-separated" /></label>
          <label>Profession<select multiple value={profession} onChange={(event) => setProfession(selectedOptions(event))}>{TEMPLATE_PROFESSION_OPTIONS.map(({ name: label }) => <option key={label}>{label}</option>)}</select></label>
          <label>Industry<select multiple value={industry} onChange={(event) => setIndustry(selectedOptions(event))}>{['Engineering', 'Education', 'Technology', 'Healthcare', 'Business', 'Marketing', 'Finance', 'Architecture', 'Creative Arts', 'Media', 'Personal'].map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <fieldset className="template-save-styles"><legend>Design styles</legend><div>{TEMPLATE_STYLE_OPTIONS.map(({ id, name: label }) => <button key={id} type="button" className={designStyles.includes(label) ? 'selected' : ''} aria-pressed={designStyles.includes(label)} onClick={() => toggle(designStyles, setDesignStyles, label)}>{label}</button>)}</div></fieldset>
        {error && <p className="template-inline-error" role="alert">{error}</p>}
        <div className="template-save-actions"><button type="button" className="template-text-action" onClick={() => setSaveDialogOpen(false)}>Cancel</button><button type="button" className="template-primary-action" onClick={() => void save()} disabled={saving}><Check size={16} />{saving ? 'Saving…' : 'Save template'}</button></div>
      </section>
    </div>
  )
}