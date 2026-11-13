import { Check, X } from 'lucide-react'
import type { EditorTemplate } from '../model/template.types'
import { TemplatePreview } from './TemplatePreview'

export function TemplateDetails({ template, onClose, onUse, busy }: {
  template: EditorTemplate
  onClose: () => void
  onUse: (template: EditorTemplate) => void
  busy: boolean
}) {
  return (
    <div className="template-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="template-details" role="dialog" aria-modal="true" aria-labelledby="template-details-title">
        <button type="button" className="template-modal-close" title="Close preview" aria-label="Close preview" onClick={onClose}><X size={19} /></button>
        <TemplatePreview template={template} />
        <div className="template-details-copy">
          <p className="template-eyebrow">{template.subcategory ?? template.category.replaceAll('-', ' ')}</p>
          <h2 id="template-details-title">{template.name}</h2>
          <p>{template.description}</p>
          <div className="template-detail-tags">{template.designStyles.map((style) => <span key={style}>{style}</span>)}</div>
          <dl>
            <div><dt>Canvas</dt><dd>{template.width} × {template.height}</dd></div>
            <div><dt>Orientation</dt><dd>{template.orientation}</dd></div>
            <div><dt>Source</dt><dd>{template.source === 'builtin' ? 'Ready-made' : 'My template'}</dd></div>
          </dl>
          <button type="button" className="template-primary-action" onClick={() => onUse(template)} disabled={busy}>
            <Check size={16} /> {busy ? 'Loading…' : 'Use this template'}
          </button>
        </div>
      </section>
    </div>
  )
}