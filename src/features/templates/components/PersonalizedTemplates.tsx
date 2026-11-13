import type { TemplateRecommendation } from '../model/template.types'
import { TemplateCard } from './TemplateCard'

export function PersonalizedTemplates({ recommendations, onPreview, onUse }: {
  recommendations: TemplateRecommendation[]
  onPreview: (template: TemplateRecommendation['template']) => void
  onUse: (template: TemplateRecommendation['template']) => void
}) {
  return (
    <div className="template-grid">
      {recommendations.map(({ template, reason }) => (
        <TemplateCard key={template.id} template={template} reason={reason} onPreview={onPreview} onUse={onUse} />
      ))}
    </div>
  )
}