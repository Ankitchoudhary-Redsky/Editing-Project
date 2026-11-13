import type { EditorTemplate, TemplateFilters } from '../model/template.types'

const searchableText = (template: EditorTemplate) => [
  template.name,
  template.description,
  template.category,
  template.subcategory,
  template.occasion,
  ...template.tags,
  ...template.designStyles,
  ...template.profession ?? [],
  ...template.industry ?? [],
].filter(Boolean).join(' ').toLocaleLowerCase()

export function filterTemplates(
  templates: EditorTemplate[],
  query: string,
  filters: TemplateFilters,
) {
  const searchTerms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)

  return templates.filter((template) => {
    if (searchTerms.some((term) => !searchableText(template).includes(term))) return false
    if (filters.category && template.category !== filters.category) return false
    if (filters.subcategory && template.subcategory !== filters.subcategory) return false
    if (filters.profession && !template.profession?.includes(filters.profession)) return false
    if (filters.industry && !template.industry?.includes(filters.industry)) return false
    if (filters.occasion && template.occasion !== filters.occasion) return false
    if (filters.designStyles.length > 0 && !filters.designStyles.some((style) => template.designStyles.includes(style))) return false
    if (filters.orientation && template.orientation !== filters.orientation) return false
    if (filters.minWidth !== undefined && template.width < filters.minWidth) return false
    if (filters.maxWidth !== undefined && template.width > filters.maxWidth) return false
    if (filters.minHeight !== undefined && template.height < filters.minHeight) return false
    if (filters.maxHeight !== undefined && template.height > filters.maxHeight) return false
    return true
  })
}

export function hasTemplateFilters(filters: TemplateFilters, query: string) {
  return Boolean(
    query.trim() || filters.category || filters.subcategory || filters.profession ||
    filters.industry || filters.occasion || filters.orientation || filters.minWidth !== undefined ||
    filters.maxWidth !== undefined || filters.minHeight !== undefined || filters.maxHeight !== undefined ||
    filters.designStyles.length,
  )
}