import type { EditorTemplate } from '../model/template.types'
import { TemplateCard } from './TemplateCard'

export function MyTemplates({ templates, canUpdate, onPreview, onUse, onRename, onUpdate, onDuplicate, onDelete }: {
  templates: EditorTemplate[]
  canUpdate: boolean
  onPreview: (template: EditorTemplate) => void
  onUse: (template: EditorTemplate) => void
  onRename: (template: EditorTemplate) => void
  onUpdate: (template: EditorTemplate) => void
  onDuplicate: (template: EditorTemplate) => void
  onDelete: (template: EditorTemplate) => void
}) {
  if (!templates.length) return <div className="template-empty-state"><BookmarkPlusIcon /><h3>Your templates will appear here</h3></div>
  return (
    <div className="template-grid">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          personal
          canUpdate={canUpdate}
          onPreview={onPreview}
          onUse={onUse}
          onRename={onRename}
          onUpdate={onUpdate}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function BookmarkPlusIcon() {
  return <span className="template-empty-mark" aria-hidden="true">+</span>
}