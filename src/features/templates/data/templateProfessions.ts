import { TEMPLATE_PROFESSIONS } from '../model/template.constants'

const professionMatches: Record<string, { industries: string[]; categories: string[] }> = {
  Student: { industries: ['Education'], categories: ['education-students'] },
  'School Student': { industries: ['Education'], categories: ['education-students'] },
  'College Student': { industries: ['Education'], categories: ['education-students', 'engineering'] },
  'University Student': { industries: ['Education'], categories: ['education-students', 'engineering'] },
  Engineer: { industries: ['Engineering', 'Technology'], categories: ['engineering'] },
  Teacher: { industries: ['Education'], categories: ['education-students'] },
  Professor: { industries: ['Education'], categories: ['education-students', 'engineering'] },
  'Business Owner': { industries: ['Business'], categories: ['business-professional'] },
  Entrepreneur: { industries: ['Business', 'Technology'], categories: ['business-professional'] },
  Freelancer: { industries: ['Creative Arts', 'Business'], categories: ['business-professional', 'creative-professionals'] },
  'Graphic Designer': { industries: ['Creative Arts'], categories: ['creative-professionals'] },
  Photographer: { industries: ['Creative Arts', 'Media'], categories: ['creative-professionals'] },
  'Content Creator': { industries: ['Media', 'Marketing'], categories: ['creative-professionals', 'social-media'] },
  YouTuber: { industries: ['Media'], categories: ['creative-professionals', 'social-media'] },
  'Marketing Professional': { industries: ['Marketing', 'Business'], categories: ['business-professional', 'social-media'] },
  Other: { industries: ['Personal'], categories: ['personal'] },
}

export const TEMPLATE_PROFESSION_OPTIONS = TEMPLATE_PROFESSIONS.map((name) => ({
  name,
  ...professionMatches[name],
}))