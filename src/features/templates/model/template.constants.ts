import type { TemplatePreferences } from './template.types'

export const TEMPLATE_STORAGE_PREFIX = 'template:'
export const TEMPLATE_ASSET_PREFIX = 'template-asset:'
export const TEMPLATE_PREFERENCES_KEY = 'template-preferences:v1'

export const EMPTY_TEMPLATE_PREFERENCES: TemplatePreferences = {
  completedOnboarding: false,
  professions: [],
  industries: [],
  interests: [],
  designStyles: [],
  occasions: [],
}

export const TEMPLATE_DESIGN_STYLES = [
  'Minimalist', 'Modern', 'Professional', 'Corporate', 'Creative', 'Luxury',
  'Elegant', 'Vintage', 'Retro', '3D', 'Abstract', 'Colorful', 'Traditional',
  'Festive', 'Educational', 'Technical', 'Futuristic', 'Geometric',
] as const

export const TEMPLATE_PROFESSIONS = [
  'Student', 'School Student', 'College Student', 'University Student', 'Engineer',
  'Teacher', 'Professor', 'Business Owner', 'Entrepreneur', 'Freelancer',
  'Graphic Designer', 'Photographer', 'Content Creator', 'YouTuber',
  'Marketing Professional', 'Other',
] as const

export const TEMPLATE_INDUSTRIES = [
  'Engineering', 'Education', 'Technology', 'Healthcare', 'Business', 'Marketing',
  'Finance', 'Architecture', 'Creative Arts', 'Media', 'Personal',
] as const

export const TEMPLATE_INTERESTS = [
  'Social Media', 'Festivals', 'Business', 'Education', 'Presentations', 'Posters',
  'Flyers', 'Invitations', 'Resume Design', 'Video Thumbnails', 'Personal Branding',
] as const