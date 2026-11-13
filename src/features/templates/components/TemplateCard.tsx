import { BookmarkPlus, Copy, Pencil, Trash2 } from 'lucide-react'
import type { EditorTemplate } from '../model/template.types'
import { TemplatePreview } from './TemplatePreview'

export function TemplateCard({
  template,
  reason,
  personal = false,
  canUpdate = true,
  onPreview,
  onUse,
  onRename,
  onUpdate,
  onDuplicate,
  onDelete,
}: {
  template: EditorTemplate
  reason?: string
  personal?: boolean
  canUpdate?: boolean
  onPreview: (template: EditorTemplate) => void
  onUse: (template: EditorTemplate) => void
  onRename?: (template: EditorTemplate) => void
  onUpdate?: (template: EditorTemplate) => void
  onDuplicate?: (template: EditorTemplate) => void
  onDelete?: (template: EditorTemplate) => void
}) {
  return (
    <article className="template-card">
      <button type="button" className="template-card-preview" onClick={() => onPreview(template)} aria-label={`Preview ${template.name}`}>
        <TemplatePreview template={template} />
        {template.designStyles.includes('3D') && <span className="template-3d-mark">3D</span>}
      </button>
      <div className="template-card-copy">
        <div className="template-card-heading">
          <div>
            <h3>{template.name}</h3>
            <p>{template.subcategory ?? template.category.replaceAll('-', ' ')}</p>
          </div>
          <button type="button" className="template-use-icon" title="Use template" aria-label={`Use ${template.name}`} onClick={() => onUse(template)}>
            <BookmarkPlus size={17} />
          </button>
        </div>
        <div className="template-card-tags">
          {template.designStyles.slice(0, 2).map((style) => <span key={style}>{style}</span>)}
        </div>
        {reason && <p className="template-reason">{reason}</p>}
        {personal && (
          <div className="template-manage-actions" aria-label={`Manage ${template.name}`}>
            <button type="button" title="Rename template" aria-label={`Rename ${template.name}`} onClick={() => onRename?.(template)}><Pencil size={14} /></button>
            <button type="button" title="Update from current design" aria-label={`Update ${template.name} from current design`} disabled={!canUpdate} onClick={() => onUpdate?.(template)}><BookmarkPlus size={14} /></button>
            <button type="button" title="Duplicate template" aria-label={`Duplicate ${template.name}`} onClick={() => onDuplicate?.(template)}><Copy size={14} /></button>
            <button type="button" title="Delete template" aria-label={`Delete ${template.name}`} onClick={() => onDelete?.(template)}><Trash2 size={14} /></button>
          </div>
        )}
      </div>
    </article>
  )
}