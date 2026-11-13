import type { EditorTemplate } from '../model/template.types'

export function TemplatePreview({ template, compact = false }: { template: EditorTemplate; compact?: boolean }) {
  return (
    <div className={`template-preview${compact ? ' compact' : ''}`}>
      <img src={template.thumbnail} alt={`${template.name} preview`} loading="lazy" />
    </div>
  )
}