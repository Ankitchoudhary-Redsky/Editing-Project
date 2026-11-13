import { TEMPLATE_DESIGN_STYLES } from '../model/template.constants'

export const TEMPLATE_STYLE_OPTIONS = TEMPLATE_DESIGN_STYLES.map((name) => ({
  id: name.toLowerCase().replaceAll(' ', '-'),
  name,
}))