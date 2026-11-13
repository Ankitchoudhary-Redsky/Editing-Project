import { useMemo, useState } from 'react'
import { BookmarkPlus, ChevronDown, X } from 'lucide-react'
import { TEMPLATE_CATEGORIES, TEMPLATE_CATEGORY_BY_ID } from '../data/templateCategories'
import { filterTemplates } from '../operations/filterTemplates'
import { recommendTemplates } from '../services/templateRecommendation'
import type { TemplateFilters as TemplateFiltersModel } from '../model/template.types'
import { useTemplateFeature } from './TemplateFeatureContext'
import { TemplateCategories } from './TemplateCategories'
import { TemplateCard } from './TemplateCard'
import { TemplateDetails } from './TemplateDetails'
import { TemplateFilters } from './TemplateFilters'
import { TemplateOnboarding } from './TemplateOnboarding'
import { TemplateSearch } from './TemplateSearch'
import { UserInterestsSettings } from './UserInterestsSettings'
import { MyTemplates } from './MyTemplates'

const emptyFilters: TemplateFiltersModel = { designStyles: [] }

export function TemplateGallery() {
  const {
    templates,
    userTemplates,
    loading,
    error,
    preferences,
    canSaveTemplate,
    canUpdateTemplate,
    galleryOpen,
    closeGallery,
    detailsTemplate,
    setDetailsTemplate,
    applyTemplate,
    busy,
    operationError,
    setOperationError,
    duplicateTemplate,
    deleteTemplate,
    renameTemplate,
    updateCurrentTemplate,
    setSaveDialogOpen,
  } = useTemplateFeature()
  const [section, setSection] = useState('all')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState(emptyFilters)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [renamingTemplate, setRenamingTemplate] = useState<(typeof templates)[number] | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState('')

  const filtered = useMemo(() => filterTemplates(templates, query, filters), [filters, query, templates])
  const recommendations = useMemo(() => recommendTemplates(templates, preferences), [preferences, templates])
  const category = TEMPLATE_CATEGORY_BY_ID.get(section)
  const recommendedRows = recommendations.filter(({ template }) => filtered.some((item) => item.id === template.id))
  const rows = section === 'my-templates'
    ? filtered.filter((template) => template.source === 'user')
    : category
      ? filtered.filter((template) => template.category === category.id)
      : filtered
  const heading = section === 'recommended'
    ? 'Recommended for You'
    : section === 'my-templates'
      ? 'My Templates'
      : category?.label ?? 'All Templates'
  const visibleCount = section === 'recommended' ? recommendedRows.length : rows.length

  if (!galleryOpen) return null

  const reportFailure = (message: string) => setOperationError(message)

  return (
    <div className="template-gallery-overlay" role="dialog" aria-modal="true" aria-label="Template gallery">
      <header className="template-gallery-header">
        <div className="template-gallery-brand"><span className="template-brand-mark">e</span><div><strong>Templates</strong><small>Design library</small></div></div>
        <TemplateSearch value={query} onChange={setQuery} onClear={() => setQuery('')} />
        <div className="template-gallery-header-actions">
          <UserInterestsSettings onClick={() => setSettingsOpen(true)} />
          <button type="button" className="template-save-current" onClick={() => setSaveDialogOpen(true)} disabled={!canSaveTemplate}><BookmarkPlus size={16} /> Save as template</button>
          <button type="button" className="template-close-gallery" title="Close templates" aria-label="Close templates" onClick={closeGallery}><X size={20} /></button>
        </div>
      </header>

      <div className="template-gallery-layout">
        <aside className="template-gallery-sidebar">
          <TemplateCategories active={section} onChange={setSection} />
          <div className="template-sidebar-note"><span>{templates.length}</span> editable designs</div>
        </aside>
        <main className="template-gallery-main">
          <div className="template-gallery-title-row">
            <div><p className="template-eyebrow">A starting point for your next idea</p><h1>{heading}</h1></div>
            <span className="template-result-count">{visibleCount} designs</span>
          </div>
          <TemplateFilters filters={filters} onChange={setFilters} onReset={() => { setFilters(emptyFilters); setQuery('') }} />

          {(error || operationError) && <div className="template-error-banner" role="alert">{operationError || error}</div>}
          {loading && <p className="template-loading" role="status">Loading saved templates…</p>}
          {busy && <p className="template-loading" role="status">Preparing editable design…</p>}

          {section === 'recommended' ? (
            recommendedRows.length
              ? <div className="template-grid">{recommendedRows.map(({ template, reason }) => <TemplateCard key={template.id} template={template} reason={reason} onPreview={setDetailsTemplate} onUse={(item) => { void applyTemplate(item) }} />)}</div>
              : <div className="template-empty-state"><span className="template-empty-mark">✳</span><h3>No matching recommendations</h3><p>Clear a filter or adjust your interests to see more designs.</p></div>
          ) : section === 'my-templates' ? (
            <MyTemplates
              templates={userTemplates.filter((template) => rows.some((row) => row.id === template.id))}
              canUpdate={canUpdateTemplate}
              onPreview={setDetailsTemplate}
              onUse={(item) => { void applyTemplate(item) }}
              onRename={(item) => {
                setRenamingTemplate(item)
                setRenameValue(item.name)
                setRenameError('')
              }}
              onUpdate={(item) => { void updateCurrentTemplate(item).catch((cause) => reportFailure(cause instanceof Error ? cause.message : 'Template could not be updated.')) }}
              onDuplicate={(item) => { void duplicateTemplate(item).catch((cause) => reportFailure(cause instanceof Error ? cause.message : 'Template could not be duplicated.')) }}
              onDelete={(item) => {
                if (!window.confirm(`Delete “${item.name}”? This cannot be undone.`)) return
                void deleteTemplate(item).catch((cause) => reportFailure(cause instanceof Error ? cause.message : 'Template could not be deleted.'))
              }}
            />
          ) : rows.length ? (
            <div className="template-grid">{rows.map((template) => <TemplateCard key={template.id} template={template} onPreview={setDetailsTemplate} onUse={(item) => { void applyTemplate(item) }} />)}</div>
          ) : (
            <div className="template-empty-state"><span className="template-empty-mark">⌕</span><h3>No designs found</h3><p>Try a different search or clear some filters.</p></div>
          )}

          {section === 'all' && !query && <div className="template-gallery-footer"><span>Built for your canvas</span><span>{TEMPLATE_CATEGORIES.length} collections <ChevronDown size={14} /></span></div>}
        </main>
      </div>

      {detailsTemplate && <TemplateDetails template={detailsTemplate} onClose={() => setDetailsTemplate(null)} onUse={(item) => { void applyTemplate(item) }} busy={busy} />}
      {renamingTemplate && (
        <div className="template-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRenamingTemplate(null) }}>
          <form
            className="template-rename-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="template-rename-title"
            onSubmit={(event) => {
              event.preventDefault()
              void renameTemplate(renamingTemplate, renameValue)
                .then(() => setRenamingTemplate(null))
                .catch((cause) => setRenameError(cause instanceof Error ? cause.message : 'Template could not be renamed.'))
            }}
          >
            <p className="template-eyebrow">My Templates</p>
            <h2 id="template-rename-title">Rename template</h2>
            <label>Template name<input autoFocus value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={70} /></label>
            {renameError && <p className="template-inline-error" role="alert">{renameError}</p>}
            <div className="template-save-actions"><button type="button" className="template-text-action" onClick={() => setRenamingTemplate(null)}>Cancel</button><button type="submit" className="template-primary-action">Save name</button></div>
          </form>
        </div>
      )}
      {settingsOpen && <TemplateOnboarding mode="settings" onClose={() => setSettingsOpen(false)} />}
    </div>
  )
}