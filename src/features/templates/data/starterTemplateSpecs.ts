export type StarterTemplateSpec = {
  style: string
  layoutId: string
  motif?: string
  featured?: boolean
  threeDShape?: 'cube' | 'sphere' | 'torus' | 'cone'
}

const specs = {
  'social-media': {
    'Instagram Posts': { style: 'Modern', layoutId: 'collage-composition', motif: 'spark', featured: true },
    'Instagram Stories': { style: 'Creative', layoutId: 'photo-full-bleed', motif: 'flower' },
    'Instagram Reels Covers': { style: 'Colorful', layoutId: 'typography-focus', motif: 'firework' },
    'Facebook Posts': { style: 'Professional', layoutId: 'grid-composition', motif: 'geometric' },
    'Facebook Covers': { style: 'Corporate', layoutId: 'split-screen', motif: 'bars' },
    'YouTube Thumbnails': { style: 'Creative', layoutId: 'layered-poster', motif: 'play' , featured: true },
    'YouTube Channel Banners': { style: 'Modern', layoutId: 'asymmetrical', motif: 'spark' },
    'LinkedIn Posts': { style: 'Professional', layoutId: 'structured-information', motif: 'chart', featured: true },
    'Pinterest Pins': { style: 'Colorful', layoutId: 'editorial-magazine', motif: 'flower' },
  },
  engineering: {
    'Mechanical Engineering': { style: 'Technical', layoutId: 'technical-blueprint', motif: 'gear', featured: true },
    'Civil Engineering': { style: 'Professional', layoutId: 'architecture-elevation', motif: 'building' },
    'Electrical Engineering': { style: 'Minimalist', layoutId: 'data-poster', motif: 'circuit' },
    'Computer Science': { style: 'Futuristic', layoutId: 'grid-composition', motif: 'code' },
    'Software Engineering': { style: 'Corporate', layoutId: 'split-screen', motif: 'code' },
    'Electronics Engineering': { style: '3D', layoutId: 'asymmetrical', motif: 'circuit', threeDShape: 'cube', featured: true },
    Architecture: { style: 'Technical', layoutId: 'technical-blueprint', motif: 'blueprint' },
    'Engineering Projects': { style: 'Professional', layoutId: 'technical-blueprint', motif: 'prototype' },
    'Technical Presentations': { style: 'Minimalist', layoutId: 'structured-information', motif: 'chart' },
    'Engineering Resumes': { style: 'Futuristic', layoutId: 'editorial-magazine', motif: 'circuit' },
    'Technical Reports': { style: 'Corporate', layoutId: 'technical-blueprint', motif: 'chart' },
    'Project Cover Pages': { style: '3D', layoutId: 'layered-poster', motif: 'prototype', threeDShape: 'sphere' },
    'Technical Posters': { style: 'Technical', layoutId: 'asymmetrical', motif: 'blueprint' },
  },
  'education-students': {
    'School Students': { style: 'Colorful', layoutId: 'grid-composition', motif: 'book', featured: true },
    'College Students': { style: 'Creative', layoutId: 'collage-composition', motif: 'book' },
    'University Students': { style: 'Modern', layoutId: 'editorial-magazine', motif: 'book' },
    Teachers: { style: 'Educational', layoutId: 'worksheet-composition', motif: 'book', featured: true },
    Professors: { style: 'Professional', layoutId: 'data-poster', motif: 'book' },
    'Educational Institutions': { style: 'Corporate', layoutId: 'structured-information', motif: 'building' },
    Assignments: { style: 'Minimalist', layoutId: 'minimalist-composition', motif: 'book' },
    'Study Notes': { style: 'Educational', layoutId: 'worksheet-frame', motif: 'book' },
    'Project Reports': { style: 'Technical', layoutId: 'data-poster', motif: 'chart' },
    Certificates: { style: 'Elegant', layoutId: 'certificate-frame', motif: 'star' },
    Timetables: { style: 'Modern', layoutId: 'schedule-grid', motif: 'grid' },
    'Study Planners': { style: 'Creative', layoutId: 'grid-composition', motif: 'book' },
    'Presentation Templates': { style: 'Professional', layoutId: 'split-screen', motif: 'chart' },
    Worksheets: { style: 'Colorful', layoutId: 'worksheet-composition', motif: 'book' },
    'Academic Posters': { style: 'Educational', layoutId: 'central-illustration', motif: 'book' },
    'Resume Templates': { style: 'Minimalist', layoutId: 'structured-information', motif: 'profile' },
  },
  'business-professional': {
    Entrepreneurs: { style: 'Professional', layoutId: 'diagonal-poster', motif: 'chart' },
    Startups: { style: 'Corporate', layoutId: 'asymmetrical', motif: 'chart', featured: true },
    'Small Businesses': { style: 'Modern', layoutId: 'business-dashboard', motif: 'chart' },
    'Corporate Teams': { style: 'Corporate', layoutId: 'grid-composition', motif: 'chart' },
    'Marketing Agencies': { style: 'Creative', layoutId: 'layered-poster', motif: 'spark', featured: true },
    Freelancers: { style: 'Minimalist', layoutId: 'business-card', motif: 'profile' },
    Consultants: { style: 'Professional', layoutId: 'structured-information', motif: 'chart' },
    'Real Estate': { style: 'Luxury', layoutId: 'photo-full-bleed', motif: 'building' },
    Finance: { style: 'Corporate', layoutId: 'data-poster', motif: 'bars' },
    Healthcare: { style: 'Modern', layoutId: 'structured-information', motif: 'heart' },
    Restaurants: { style: 'Elegant', layoutId: 'restaurant-menu', motif: 'flower' },
    'Business Cards': { style: 'Minimalist', layoutId: 'business-card', motif: 'geometric' },
    'Business Proposals': { style: 'Professional', layoutId: 'editorial-magazine', motif: 'chart' },
    'Marketing Materials': { style: 'Colorful', layoutId: 'collage-composition', motif: 'spark' },
  },
  'creative-professionals': {
    'Graphic Designers': { style: 'Abstract', layoutId: 'collage-composition', motif: 'geometric', featured: true },
    Photographers: { style: 'Creative', layoutId: 'photo-full-bleed', motif: 'camera' },
    'Content Creators': { style: 'Modern', layoutId: 'typography-focus', motif: 'play' },
    YouTubers: { style: 'Colorful', layoutId: 'layered-poster', motif: 'play', featured: true },
    Influencers: { style: 'Luxury', layoutId: 'photo-full-bleed', motif: 'flower' },
    'Video Editors': { style: 'Futuristic', layoutId: 'editing-timeline', motif: 'play' },
    Artists: { style: 'Abstract', layoutId: 'layered-poster', motif: 'flower' },
    'Portfolio Designs': { style: 'Geometric', layoutId: 'editorial-magazine', motif: 'camera' },
    'Creative Presentations': { style: '3D', layoutId: 'asymmetrical', motif: 'geometric', threeDShape: 'torus' },
  },
  personal: {
    Birthday: { style: 'Colorful', layoutId: 'collage-composition', motif: 'firework' },
    Wedding: { style: 'Luxury', layoutId: 'luxury-invitation', motif: 'flower', featured: true },
    Anniversary: { style: 'Elegant', layoutId: 'typography-focus', motif: 'heart' },
    Invitations: { style: 'Vintage', layoutId: 'decorative-frame', motif: 'flower' },
    'Family Events': { style: 'Modern', layoutId: 'grid-composition', motif: 'flower' },
    Travel: { style: 'Creative', layoutId: 'photo-full-bleed', motif: 'globe' },
    'Personal Branding': { style: 'Modern', layoutId: 'geometric-composition', motif: 'profile' },
    'Greeting Cards': { style: 'Elegant', layoutId: 'central-illustration', motif: 'flower' },
    'Event Posters': { style: 'Retro', layoutId: 'diagonal-poster', motif: 'firework' },
  },
} satisfies Record<string, Record<string, StarterTemplateSpec>>

export const STARTER_TEMPLATE_SPECS = specs

export const OCCASION_LAYOUTS: Record<string, string> = {
  Diwali: 'diwali-lights',
  Holi: 'holi-splashes',
  'Raksha Bandhan': 'rakhi-center',
  Navratri: 'navratri-mandala',
  Dussehra: 'dussehra-bow',
  'Ganesh Chaturthi': 'ganesh-modak',
  Janmashtami: 'janmashtami-flute',
  'Makar Sankranti': 'sankranti-kites',
  Lohri: 'lohri-bonfire',
  Baisakhi: 'baisakhi-wheat',
  Eid: 'eid-arch',
  Christmas: 'christmas-tree',
  Halloween: 'halloween-night',
  Thanksgiving: 'thanksgiving-harvest',
  "Valentine's Day": 'valentine-hearts',
  'New Year': 'new-year-type',
  Easter: 'easter-eggs',
  "Mother's Day": 'mothers-flowers',
  "Father's Day": 'fathers-tie',
  "Women's Day": 'womens-flower',
  'Earth Day': 'earth-globe',
  'Indian Independence Day': 'independence-poster',
  'Indian Republic Day': 'republic-wheel',
  'Constitution Day': 'constitution-book',
  'Memorial Day': 'memorial-poppy',
  'Veterans Day': 'veterans-star',
  'Other Country-Specific National Celebrations': 'national-flag',
}

export const OCCASION_STYLE_LAYOUTS: Record<string, string> = {
  Traditional: 'occasion-poster',
  Festive: 'layered-poster',
  Luxury: 'luxury-invitation',
  Modern: 'split-screen',
  Minimalist: 'minimalist-composition',
  Colorful: 'collage-composition',
  Elegant: 'decorative-frame',
  Professional: 'structured-information',
  Educational: 'editorial-magazine',
  Creative: 'asymmetrical',
  Retro: 'diagonal-poster',
  Vintage: 'editorial-magazine',
}

const OCCASION_LAYOUT_OVERRIDES: Record<string, Record<string, string>> = {
  'Raksha Bandhan': { Elegant: 'decorative-frame' },
  'Ganesh Chaturthi': { Elegant: 'central-illustration' },
  Janmashtami: { Elegant: 'luxury-invitation' },
  Eid: { Elegant: 'luxury-invitation' },
  Holi: { Festive: 'layered-poster' },
  "Mother's Day": { Elegant: 'central-illustration', Modern: 'split-screen', Minimalist: 'typography-focus' },
  "Women's Day": { Elegant: 'asymmetrical', Modern: 'geometric-composition', Colorful: 'collage-composition' },
  'Indian Republic Day': { Professional: 'structured-information', Elegant: 'decorative-frame' },
  'Constitution Day': { Professional: 'structured-information', Educational: 'technical-blueprint', Minimalist: 'photo-full-bleed' },
  'Memorial Day': { Elegant: 'luxury-invitation', Professional: 'structured-information' },
}

export function getOccasionLayout(name: string, style: string) {
  const override = OCCASION_LAYOUT_OVERRIDES[name]?.[style]
  if (override) return override
  const baseLayout = OCCASION_LAYOUTS[name] ?? 'occasion-poster'
  if (['Traditional', 'Professional', 'Educational'].includes(style)) return baseLayout
  if (style === 'Festive') return 'layered-poster'
  return OCCASION_STYLE_LAYOUTS[style] ?? baseLayout
}
