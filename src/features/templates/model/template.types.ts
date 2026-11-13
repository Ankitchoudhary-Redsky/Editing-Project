export const TEMPLATE_SCHEMA_VERSION = 1

export type TemplateSource = 'builtin' | 'user'
export type TemplateOrientation = 'portrait' | 'landscape' | 'square'

export type TemplateCategory = {
  id: string
  label: string
  group: string
  subcategories: string[]
  designStyles: string[]
  featured?: boolean
}

export type TemplateFabricData = {
  width: number
  height: number
  scene: Record<string, unknown>
  editor?: Record<string, unknown>
  settings?: Record<string, unknown>
}

export type TemplateAssetReference = {
  token: string
  assetId: string
}

export interface EditorTemplate {
  id: string
  designId?: string
  name: string
  description: string
  category: string
  subcategory?: string
  tags: string[]
  source: TemplateSource
  profession?: string[]
  industry?: string[]
  occasion?: string
  designStyles: string[]
  supportedFormats: string[]
  orientation: TemplateOrientation
  width: number
  height: number
  thumbnail: string
  fabricData: TemplateFabricData
  assetReferences: TemplateAssetReference[]
  version: number
  createdAt: string
  updatedAt: string
  featured?: boolean
}

export type TemplateFilters = {
  category?: string
  subcategory?: string
  profession?: string
  industry?: string
  occasion?: string
  designStyles: string[]
  orientation?: TemplateOrientation
  minWidth?: number
  maxWidth?: number
  minHeight?: number
  maxHeight?: number
}

export type TemplatePreferences = {
  completedOnboarding: boolean
  professions: string[]
  industries: string[]
  interests: string[]
  designStyles: string[]
  occasions: string[]
}

export type TemplateRecommendation = {
  template: EditorTemplate
  score: number
  reason: string
}

export type PersistedTemplateAsset = {
  id: string
  data: string
  createdAt: string
}

export type TemplateSaveInput = Pick<
  EditorTemplate,
  'name' | 'description' | 'category' | 'subcategory' | 'tags' | 'profession' |
  'industry' | 'occasion' | 'designStyles' | 'supportedFormats'
>