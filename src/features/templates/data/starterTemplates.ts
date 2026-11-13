import { TEMPLATE_CATEGORIES } from './templateCategories'
import { TEMPLATE_OCCASIONS } from './templateOccasions'
import { TEMPLATE_PROFESSION_OPTIONS } from './templateProfessions'
import { STARTER_TEMPLATE_SPECS, getOccasionLayout } from './starterTemplateSpecs'
import type { StarterTemplateSpec } from './starterTemplateSpecs'
import type { EditorTemplate, TemplateOrientation } from '../model/template.types'
import type { DesignRecipeContext } from '../model/designScene'
import {
  compileSceneToFabric,
  resetDesignRecipeRegistry,
  registerDesignRecipe,
  renderSceneThumbnail,
} from '../services/designRecipeRegistry'

type Palette = [string, string, string, string]

type StarterDescriptor = {
  category: string
  subcategory: string
  name: string
  style: string
  palette: Palette
  motif: string
  layoutId: string
  occasion?: string
  region?: string
  featured?: boolean
  threeDShape?: DesignRecipeContext['threeDShape']
  profession?: string[]
  industry?: string[]
}

const stylePalettes: Record<string, Palette> = {
  Minimalist: ['#f3f0e9', '#364a45', '#d2aa70', '#293532'],
  Modern: ['#e9efed', '#2b6b61', '#e37a54', '#263c3a'],
  Professional: ['#edf0ef', '#30596a', '#be9859', '#243740'],
  Corporate: ['#e9edf0', '#274b63', '#c49856', '#243542'],
  Creative: ['#f3e8de', '#bc5b4b', '#44797a', '#2b373d'],
  Luxury: ['#211c2b', '#d3b16c', '#9b5b51', '#f5ead7'],
  Elegant: ['#f4ece7', '#9a5963', '#c8a576', '#463442'],
  Vintage: ['#ede3d2', '#8c6049', '#b48c56', '#403832'],
  Retro: ['#f4e8d0', '#db6445', '#457f79', '#382f47'],
  '3D': ['#172b3b', '#56c7c0', '#f0ae52', '#eff2e9'],
  Abstract: ['#eee7f2', '#775b91', '#df8067', '#393243'],
  Colorful: ['#f7edd9', '#e2525a', '#39878c', '#332f45'],
  Traditional: ['#f5ead2', '#8b3e50', '#d2a343', '#3e2d38'],
  Festive: ['#f4ebdf', '#a33f49', '#d6ad50', '#30463f'],
  Educational: ['#f1efe3', '#347669', '#dfa84b', '#283e43'],
  Technical: ['#e8eef0', '#215c70', '#55b7b0', '#213846'],
  Futuristic: ['#172536', '#62d2ca', '#8584c3', '#edf2ee'],
  Geometric: ['#f1e8dd', '#cb624d', '#386e76', '#293841'],
}

const occasionTitles: Record<string, string> = {
  Diwali: 'Festival of Light',
  Holi: 'Colors in Motion',
  'Raksha Bandhan': 'A Thread Between Us',
  Navratri: 'Nine Nights of Joy',
  Dussehra: 'Light Finds a Way',
  'Ganesh Chaturthi': 'A Joyful Welcome',
  Janmashtami: 'A Night of Wonder',
  'Makar Sankranti': 'Let Joy Take Flight',
  Lohri: 'Gather Around the Fire',
  Baisakhi: 'A Season of Plenty',
  Eid: 'A Time to Gather',
  Christmas: 'Season of Giving',
  Halloween: 'Night of Fright',
  Thanksgiving: 'Gather Around',
  "Valentine's Day": 'Made of Love',
  'New Year': 'Welcome to 2027',
  Easter: 'A Little Spring Joy',
  "Mother's Day": 'For Everything You Are',
  "Father's Day": 'A Note for Dad',
  "Women's Day": 'Celebrate Her',
  'Earth Day': 'One Planet, One Home',
  'Indian Independence Day': 'Freedom to Dream',
  'Indian Republic Day': 'The Promise of India',
  'Constitution Day': 'The Values That Unite Us',
  'Memorial Day': 'In Honor',
  'Veterans Day': 'With Gratitude',
  'Other Country-Specific National Celebrations': 'A Day to Celebrate',
}

const occasionCopy: Record<string, string> = {
  Diwali: 'May light, warmth, and good fortune find their way home.',
  Holi: 'Share the color. Keep the joy.',
  'Raksha Bandhan': 'A small thread. A lifelong promise.',
  Navratri: 'Move together through nine nights of celebration.',
  Dussehra: 'Celebrate courage, hope, and new beginnings.',
  'Ganesh Chaturthi': 'May each new beginning be filled with joy.',
  Janmashtami: 'Celebrate the music, mischief, and spirit of the day.',
  'Makar Sankranti': 'New skies. New wishes. Higher hopes.',
  Lohri: 'Warm hands, good stories, and a brighter season.',
  Baisakhi: 'Celebrate the harvest and the people who make it possible.',
  Eid: 'Wishing you a peaceful and generous celebration.',
  Christmas: 'Make room for wonder and the people you love.',
  Halloween: 'Gather for a little mystery after dark.',
  Thanksgiving: 'A moment to pause and give thanks.',
  "Valentine's Day": 'Say the kind thing. Make the thoughtful gesture.',
  'New Year': 'A fresh chapter. A brighter horizon.',
  Easter: 'A season of renewal, hope, and time together.',
  "Mother's Day": 'For every quiet thing you do, and all the love around it.',
  "Father's Day": 'For the steady support and the stories we carry.',
  "Women's Day": 'Recognize the work, strength, and imagination around us.',
  'Earth Day': 'Small choices. A shared future.',
  'Indian Independence Day': 'Honor the people and ideals behind independence.',
  'Indian Republic Day': 'Celebrate the promise of a democratic republic.',
  'Constitution Day': 'Reflect on the rights and responsibilities we share.',
  'Memorial Day': 'Remember with care and gratitude.',
  'Veterans Day': 'Recognize service with respect and appreciation.',
  'Other Country-Specific National Celebrations': 'Celebrate your community and its story.',
}

function slug(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function orientationFor(width: number, height: number): TemplateOrientation {
  if (width === height) return 'square'
  return width > height ? 'landscape' : 'portrait'
}

function dimensionsFor(category: string, subcategory: string) {
  const socialPortrait = ['Instagram Stories', 'Instagram Reels Covers', 'Pinterest Pins']
  const socialLandscape = ['Facebook Covers', 'YouTube Thumbnails', 'YouTube Channel Banners']
  if (category === 'social-media') {
    if (socialPortrait.includes(subcategory)) return { width: 1080, height: 1920 }
    if (socialLandscape.includes(subcategory)) return { width: 1600, height: 900 }
    return { width: 1080, height: 1080 }
  }
  if (['Technical Presentations', 'Presentation Templates', 'Creative Presentations'].includes(subcategory)) {
    return { width: 1600, height: 900 }
  }
  if (subcategory === 'Business Cards') return { width: 1600, height: 900 }
  if (subcategory === 'Greeting Cards') return { width: 1600, height: 1200 }
  if (['Timetables', 'Study Planners', 'Worksheets', 'YouTube Channel Banners'].includes(subcategory)) {
    return { width: 1200, height: 1600 }
  }
  if (category === 'personal' && ['Birthday', 'Wedding', 'Anniversary', 'Invitations'].includes(subcategory)) {
    return { width: 1200, height: 1500 }
  }
  return { width: 1200, height: 1500 }
}

function getIndustry(category: string) {
  if (category === 'engineering') return ['Engineering', 'Technology']
  if (category === 'education-students') return ['Education']
  if (category === 'business-professional') return ['Business', 'Marketing']
  if (category === 'creative-professionals') return ['Creative Arts', 'Media']
  if (category === 'social-media') return ['Media', 'Marketing']
  if (category === 'personal') return ['Personal']
  return undefined
}

function getProfessions(category: string) {
  if (category === 'festivals-occasions') return undefined
  return TEMPLATE_PROFESSION_OPTIONS
    .filter(({ categories }) => categories.includes(category))
    .map(({ name }) => name)
}

function getPalette(descriptor: StarterDescriptor): Palette {
  if (!descriptor.occasion) return stylePalettes[descriptor.style]
  const occasionColors = descriptor.palette
  const styleColors = stylePalettes[descriptor.style] ?? occasionColors
  const occasionStyleColors: Record<string, Palette> = {
    Minimalist: ['#f8f6ef', occasionColors[1], occasionColors[2], '#293532'],
    Luxury: ['#211c2b', occasionColors[2], occasionColors[1], '#f5ead7'],
    Modern: [styleColors[0], occasionColors[1], styleColors[2], styleColors[3]],
    Colorful: [styleColors[0], occasionColors[1], styleColors[2], styleColors[3]],
    Festive: occasionColors,
  }
  if (descriptor.style === 'Traditional') return occasionColors
  return occasionStyleColors[descriptor.style] ?? [
    styleColors[0], occasionColors[1], occasionColors[2], styleColors[3],
  ]
}

function createDescriptors() {
  const descriptors: StarterDescriptor[] = []
  for (const category of TEMPLATE_CATEGORIES) {
    if (category.id === 'festivals-occasions') {
      for (const occasion of TEMPLATE_OCCASIONS) {
        for (const style of occasion.styles) {
          descriptors.push({
            category: category.id,
            subcategory: occasion.name,
            name: `${occasion.name} ${style} Design`,
            style,
            palette: occasion.palette,
            motif: occasion.motif,
            layoutId: getOccasionLayout(occasion.name, style),
            occasion: occasion.name,
            region: occasion.region,
            featured: style === 'Traditional' || style === 'Festive',
          })
        }
      }
      continue
    }

    const categorySpecs = (STARTER_TEMPLATE_SPECS as Record<string, Record<string, StarterTemplateSpec>>)[category.id]
    if (!categorySpecs) throw new Error(`Missing starter template specifications for ${category.id}.`)
    for (const subcategory of category.subcategories) {
      const spec: StarterTemplateSpec | undefined = categorySpecs[subcategory]
      if (!spec) throw new Error(`Missing starter design specification: ${category.id}/${subcategory}.`)
      descriptors.push({
        category: category.id,
        subcategory,
        name: `${subcategory} ${spec.style} Layout`,
        style: spec.style,
        palette: stylePalettes[spec.style],
        motif: spec.motif ?? 'geometric',
        layoutId: spec.layoutId,
        featured: spec.featured,
        threeDShape: spec.threeDShape,
        profession: getProfessions(category.id),
        industry: getIndustry(category.id),
      })
    }
  }
  return descriptors
}

function buildTemplate(descriptor: StarterDescriptor): EditorTemplate {
  const { width, height } = dimensionsFor(descriptor.category, descriptor.subcategory)
  const designId = `builtin-design:${slug(descriptor.category)}:${slug(descriptor.subcategory)}:${slug(descriptor.style)}`
  const titleText = descriptor.occasion
    ? occasionTitles[descriptor.occasion] ?? descriptor.occasion
    : descriptor.subcategory.replace(/\s+(Templates?|Designs?|Cover Pages?)$/i, '')
  const supportingText = descriptor.occasion
    ? occasionCopy[descriptor.occasion] ?? 'Celebrate with the people and traditions that matter to you.'
    : `A considered, editable layout for ${descriptor.subcategory.toLocaleLowerCase()}.`
  const palette = getPalette(descriptor)
  const scene = registerDesignRecipe({
    designId,
    layoutId: descriptor.layoutId,
    category: descriptor.category,
    subcategory: descriptor.subcategory,
    style: descriptor.style,
    title: titleText,
    supportingText,
    motif: descriptor.motif,
    palette,
    width,
    height,
    occasion: descriptor.occasion,
    region: descriptor.region,
    threeDShape: descriptor.threeDShape,
  })
  const categoryLabel = TEMPLATE_CATEGORIES.find(({ id }) => id === descriptor.category)?.label ?? descriptor.category
  return {
    id: `starter:${descriptor.category}:${slug(descriptor.subcategory)}:${slug(descriptor.style)}`,
    designId,
    name: descriptor.name,
    description: `${descriptor.style} ${descriptor.subcategory.toLocaleLowerCase()} composition with editable typography, graphic elements, and a purpose-built layout.`,
    category: descriptor.category,
    subcategory: descriptor.subcategory,
    tags: [descriptor.subcategory, categoryLabel, descriptor.style, descriptor.motif, descriptor.region ?? 'design'],
    source: 'builtin',
    profession: descriptor.profession,
    industry: descriptor.industry,
    occasion: descriptor.occasion,
    designStyles: [descriptor.style],
    supportedFormats: ['image', 'print'],
    orientation: orientationFor(width, height),
    width,
    height,
    thumbnail: renderSceneThumbnail(scene),
    fabricData: {
      width,
      height,
      scene: compileSceneToFabric(scene),
    },
    assetReferences: [],
    version: 1,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    featured: descriptor.featured,
  }
}

resetDesignRecipeRegistry()
export const STARTER_TEMPLATES: EditorTemplate[] = createDescriptors().map(buildTemplate)

const starterIds = new Set<string>()
const starterDesignIds = new Set<string>()
for (const template of STARTER_TEMPLATES) {
  if (starterIds.has(template.id)) throw new Error(`Duplicate starter template ID: ${template.id}`)
  if (!template.designId || starterDesignIds.has(template.designId)) {
    throw new Error(`Missing or duplicate starter design ID: ${template.designId ?? template.id}`)
  }
  starterIds.add(template.id)
  starterDesignIds.add(template.designId)
}
