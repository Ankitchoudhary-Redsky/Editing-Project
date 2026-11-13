export { TEMPLATE_CATEGORIES } from './data/templateCategories'
export { TEMPLATE_OCCASIONS } from './data/templateOccasions'
export { TEMPLATE_PROFESSION_OPTIONS } from './data/templateProfessions'
export { TEMPLATE_STYLE_OPTIONS } from './data/templateStyles'
export { STARTER_TEMPLATES } from './data/starterTemplates'
export { TemplateGallery } from './components/TemplateGallery'
export { TemplateFeatureRoot } from './components/TemplateFeatureRoot'
export { useTemplateFeature } from './components/TemplateFeatureContext'
export { createTemplate } from './operations/createTemplate'
export { deleteTemplate } from './operations/deleteTemplate'
export { duplicateTemplate } from './operations/duplicateTemplate'
export { filterTemplates, hasTemplateFilters } from './operations/filterTemplates'
export { loadTemplate } from './operations/loadTemplate'
export { updateTemplate } from './operations/updateTemplate'
export { hydrateTemplateFabricData, migrateTemplateRecord, serializeTemplateCanvas } from './services/templateSerializer'
export { recommendTemplates } from './services/templateRecommendation'
export type {
  EditorTemplate,
  PersistedTemplateAsset,
  TemplateAssetReference,
  TemplateCategory,
  TemplateFabricData,
  TemplateFilters,
  TemplateOrientation,
  TemplatePreferences,
  TemplateRecommendation,
  TemplateSaveInput,
  TemplateSource,
} from './model/template.types'