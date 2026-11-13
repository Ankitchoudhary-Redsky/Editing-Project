import type {
  EditorTemplate,
  TemplatePreferences,
  TemplateRecommendation,
} from '../model/template.types'

const interestCategories: Record<string, string[]> = {
  'Social Media': ['social-media'],
  Festivals: ['festivals-occasions'],
  Business: ['business-professional'],
  Education: ['education-students', 'engineering'],
  Presentations: ['education-students', 'engineering', 'creative-professionals'],
  Posters: ['engineering', 'education-students', 'personal'],
  Flyers: ['business-professional', 'personal'],
  Invitations: ['personal', 'festivals-occasions'],
  'Resume Design': ['engineering', 'education-students', 'business-professional'],
  'Video Thumbnails': ['social-media', 'creative-professionals'],
  'Personal Branding': ['personal', 'creative-professionals', 'business-professional'],
}

function includesAny(values: string[] | undefined, preferences: string[]) {
  return Boolean(values?.some((value) => preferences.includes(value)))
}

function matchesInterest(template: EditorTemplate, interest: string) {
  if (interestCategories[interest]?.includes(template.category)) return true
  const text = [template.name, template.subcategory, ...template.tags].join(' ').toLocaleLowerCase()
  return text.includes(interest.toLocaleLowerCase())
}

export function recommendTemplates(
  templates: EditorTemplate[],
  preferences: TemplatePreferences,
  limit = 12,
): TemplateRecommendation[] {
  const hasPreferences = Boolean(
    preferences.professions.length || preferences.industries.length || preferences.interests.length ||
    preferences.designStyles.length || preferences.occasions.length,
  )

  if (!hasPreferences) {
    return templates
      .filter((template) => template.featured || template.source === 'builtin')
      .sort((left, right) => Number(Boolean(right.featured)) - Number(Boolean(left.featured)) || left.name.localeCompare(right.name))
      .slice(0, limit)
      .map((template) => ({ template, score: template.featured ? 1 : 0, reason: 'Featured template to get you started.' }))
  }

  const recommendations = templates.map((template) => {
    const reasons: Array<{ score: number; text: string }> = []
    if (includesAny(template.profession, preferences.professions)) {
      const selected = preferences.professions.find((profession) => template.profession?.includes(profession))
      reasons.push({ score: 8, text: `Recommended because you selected ${selected}.` })
    }
    if (includesAny(template.industry, preferences.industries)) {
      const selected = preferences.industries.find((industry) => template.industry?.includes(industry))
      reasons.push({ score: 6, text: `Recommended for the ${selected} industry you chose.` })
    }
    const selectedInterest = preferences.interests.find((interest) => matchesInterest(template, interest))
    if (selectedInterest) reasons.push({ score: 4, text: `Recommended because you are interested in ${selectedInterest.toLowerCase()}.` })
    const selectedStyle = preferences.designStyles.find((style) => template.designStyles.includes(style))
    if (selectedStyle) reasons.push({ score: 3, text: `Matches your ${selectedStyle.toLowerCase()} style preference.` })
    const selectedOccasion = preferences.occasions.find((occasion) =>
      template.occasion?.toLocaleLowerCase() === occasion.toLocaleLowerCase() ||
      template.subcategory?.toLocaleLowerCase() === occasion.toLocaleLowerCase())
    if (selectedOccasion) reasons.push({ score: 7, text: `Recommended for ${selectedOccasion}.` })

    const score = reasons.reduce((total, reason) => total + reason.score, template.featured ? 1 : 0)
    const bestReason = [...reasons].sort((left, right) => right.score - left.score)[0]
    return {
      template,
      score,
      reason: bestReason?.text ?? 'A featured design selected for you.',
    }
  })

  const relevant = recommendations.filter(({ score }) => score > 0)
  const source = relevant.length > 0
    ? relevant
    : templates.filter((template) => template.featured).map((template) => ({
      template,
      score: 1,
      reason: 'A featured design selected for you.',
    }))

  return source
    .sort((left, right) => right.score - left.score || left.template.name.localeCompare(right.template.name))
    .slice(0, limit)
}