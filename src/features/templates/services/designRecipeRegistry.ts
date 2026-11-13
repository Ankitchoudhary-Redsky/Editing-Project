import { Circle, Ellipse, Line, Polygon, Rect, Textbox } from 'fabric'
import type { FabricObject } from 'fabric'
import type {
  DesignCircleNode,
  DesignEllipseNode,
  DesignLineNode,
  DesignNode,
  DesignPolygonNode,
  DesignRecipeContext,
  DesignScene,
  DesignTextNode,
  DesignThreeDNode,
} from '../model/designScene'
import { OCCASION_LAYOUTS } from '../data/starterTemplateSpecs'

export type DesignRecipe = DesignRecipeContext & {
  scene: DesignScene
}

type LayoutBuilder = (context: DesignRecipeContext) => DesignNode[]

export const DESIGN_RECIPE_REGISTRY = new Map<string, DesignRecipe>()

export function resetDesignRecipeRegistry() {
  DESIGN_RECIPE_REGISTRY.clear()
}

const uniqueId = (context: DesignRecipeContext) => context.designId
const box = (context: DesignRecipeContext) => ({
  width: context.width,
  height: context.height,
  margin: Math.round(Math.min(context.width, context.height) * 0.075),
})
const rect = (
  name: string,
  left: number,
  top: number,
  width: number,
  height: number,
  fill: string,
  extra: Partial<DesignNode> = {},
): DesignNode => ({ kind: 'rect', name, left, top, width, height, fill, stroke: null, ...extra } as DesignNode)
const circle = (name: string, cx: number, cy: number, radius: number, fill: string, extra: Partial<DesignCircleNode> = {}): DesignCircleNode => ({
  kind: 'circle', name, left: cx - radius, top: cy - radius, width: radius * 2, height: radius * 2,
  fill, stroke: null, ...extra,
})
const ellipse = (name: string, cx: number, cy: number, rx: number, ry: number, fill: string, extra: Partial<DesignEllipseNode> = {}): DesignEllipseNode => ({
  kind: 'ellipse', name, left: cx - rx, top: cy - ry, width: rx * 2, height: ry * 2,
  fill, stroke: null, ...extra,
})
const line = (name: string, x1: number, y1: number, x2: number, y2: number, stroke: string, strokeWidth = 3, extra: Partial<DesignLineNode> = {}): DesignLineNode => ({
  kind: 'line', name, left: x1, top: y1, width: x2 - x1, height: y2 - y1, x2, y2,
  fill: 'rgba(0,0,0,0)', stroke, strokeWidth, ...extra,
})
const polygon = (name: string, left: number, top: number, width: number, height: number, points: Array<[number, number]>, fill: string, extra: Partial<DesignPolygonNode> = {}): DesignPolygonNode => ({
  kind: 'polygon', name, left, top, width, height,
  points: points.map(([x, y]) => ({ x: x * width, y: y * height })),
  fill, stroke: null, ...extra,
})
const text = (
  name: string,
  value: string,
  left: number,
  top: number,
  width: number,
  fontSize: number,
  fill: string,
  fontFamily = 'Avenir Next',
  extra: Partial<DesignTextNode> = {},
): DesignTextNode => ({
  kind: 'text', name, text: value, left, top, width, height: fontSize * 2.8,
  fontFamily, fontSize, fontWeight: 'normal', textAlign: 'left', lineHeight: 1.05,
  fill, stroke: null, ...extra,
})
const base = (context: DesignRecipeContext, fill = context.palette[0]): DesignNode[] => [
  rect('canvas-background', 0, 0, context.width, context.height, fill),
]
const title = (context: DesignRecipeContext, left: number, top: number, width: number, fontSize: number, fill = context.palette[3], extra: Partial<DesignTextNode> = {}) =>
  text('editable-headline', context.title, left, top, width, fontSize, fill,
    ['Elegant', 'Luxury', 'Traditional', 'Vintage'].includes(context.style) ? 'Georgia' : 'Avenir Next',
    { fontWeight: context.style === 'Luxury' ? 'normal' : 'bold', lineHeight: 0.98, ...extra })
const label = (context: DesignRecipeContext, left: number, top: number, width: number, fill = context.palette[1], value = context.occasion ?? context.subcategory.toUpperCase()) =>
  text('editable-kicker', value.toUpperCase(), left, top, width, Math.max(13, context.width * 0.016), fill, 'Avenir Next', { fontWeight: 'bold', charSpacing: 110 })
const copy = (context: DesignRecipeContext, left: number, top: number, width: number, fill = context.palette[3], value = context.supportingText) =>
  text('editable-supporting-copy', value, left, top, width, Math.max(15, context.width * 0.021), fill, 'Avenir Next', { lineHeight: 1.2 })

function floralMotif(context: DesignRecipeContext, cx: number, cy: number, size: number, name = 'flower') {
  const layers: DesignNode[] = []
  const petalColors = [context.palette[1], context.palette[2], context.palette[1], context.palette[2], context.palette[1], context.palette[2]]
  for (let petal = 0; petal < 6; petal += 1) {
    const angle = petal * Math.PI / 3
    layers.push(ellipse(`${name}-petal-${petal + 1}`, cx + Math.cos(angle) * size * 0.28, cy + Math.sin(angle) * size * 0.28, size * 0.16, size * 0.27, petalColors[petal], { angle: petal * 60 }))
  }
  layers.push(circle(`${name}-center`, cx, cy, size * 0.14, context.palette[3]))
  return layers
}

function diyaMotif(context: DesignRecipeContext, cx: number, cy: number, size: number, prefix = 'diya') {
  return [
    ellipse(`${prefix}-glow`, cx, cy - size * 0.16, size * 0.37, size * 0.45, context.palette[2], { opacity: 0.24 }),
    polygon(`${prefix}-bowl`, cx - size * 0.42, cy + size * 0.12, size * 0.84, size * 0.36, [[0, 0], [1, 0], [0.83, 0.78], [0.5, 1], [0.17, 0.78]], context.palette[1]),
    line(`${prefix}-rim`, cx - size * 0.42, cy + size * 0.12, cx + size * 0.42, cy + size * 0.12, context.palette[2], size * 0.04),
    polygon(`${prefix}-flame`, cx - size * 0.1, cy - size * 0.44, size * 0.2, size * 0.58, [[0.5, 0], [0.95, 0.62], [0.72, 1], [0.28, 1], [0.05, 0.62]], '#f27f37'),
    ellipse(`${prefix}-wick`, cx - size * 0.08, cy + size * 0.02, size * 0.16, size * 0.04, context.palette[3]),
  ]
}

function pumpkinMotif(context: DesignRecipeContext, cx: number, cy: number, size: number) {
  const layers: DesignNode[] = [
    ellipse('pumpkin-body', cx, cy, size * 0.46, size * 0.34, context.palette[1]),
    ellipse('pumpkin-rib-left', cx - size * 0.2, cy, size * 0.18, size * 0.34, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: size * 0.025 }),
    ellipse('pumpkin-rib-right', cx + size * 0.2, cy, size * 0.18, size * 0.34, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: size * 0.025 }),
    polygon('pumpkin-stem', cx - size * 0.08, cy - size * 0.42, size * 0.17, size * 0.2, [[0.4, 1], [0.15, 0.15], [0.8, 0], [1, 1]], context.palette[3]),
    polygon('pumpkin-eye-left', cx - size * 0.22, cy - size * 0.09, size * 0.12, size * 0.13, [[0.5, 0], [1, 1], [0, 1]], context.palette[3]),
    polygon('pumpkin-eye-right', cx + size * 0.1, cy - size * 0.09, size * 0.12, size * 0.13, [[0.5, 0], [1, 1], [0, 1]], context.palette[3]),
    polygon('pumpkin-mouth', cx - size * 0.2, cy + size * 0.1, size * 0.4, size * 0.11, [[0, 0], [0.2, 1], [0.36, 0], [0.53, 1], [0.72, 0], [1, 0.8], [1, 1]], context.palette[3]),
  ]
  return layers
}

function treeMotif(context: DesignRecipeContext, cx: number, top: number, size: number) {
  const layers: DesignNode[] = [
    rect('tree-trunk', cx - size * 0.08, top + size * 0.72, size * 0.16, size * 0.22, context.palette[3]),
    polygon('tree-lower', cx - size * 0.48, top + size * 0.39, size * 0.96, size * 0.5, [[0.5, 0], [1, 0.78], [0.82, 0.78], [0.98, 1], [0.02, 1], [0.18, 0.78], [0, 0.78]], context.palette[1]),
    polygon('tree-middle', cx - size * 0.36, top + size * 0.2, size * 0.72, size * 0.43, [[0.5, 0], [1, 0.85], [0.78, 0.85], [0.96, 1], [0.04, 1], [0.22, 0.85], [0, 0.85]], context.palette[1]),
    polygon('tree-top', cx - size * 0.24, top + size * 0.03, size * 0.48, size * 0.38, [[0.5, 0], [1, 1], [0, 1]], context.palette[1]),
    circle('tree-star', cx, top + size * 0.03, size * 0.07, context.palette[2]),
  ]
  for (const [index, position] of [
    [0.35, 0.48], [0.68, 0.57], [0.45, 0.73], [0.78, 0.79], [0.22, 0.77],
  ].entries()) {
    layers.push(circle(`tree-ornament-${index + 1}`, cx - size * 0.48 + size * position[0], top + size * position[1], size * 0.035, index % 2 ? context.palette[2] : context.palette[3]))
  }
  return layers
}

function crescentMotif(context: DesignRecipeContext, cx: number, cy: number, size: number) {
  return [
    circle('crescent-gold-disc', cx, cy, size * 0.42, context.palette[2]),
    circle('crescent-cutout', cx + size * 0.2, cy - size * 0.12, size * 0.37, context.palette[0]),
    ...Array.from({ length: 5 }, (_, index) => {
      const angle = -Math.PI * 0.8 + index * Math.PI * 0.23
      return circle(`crescent-star-${index + 1}`, cx + Math.cos(angle) * size * 0.57, cy + Math.sin(angle) * size * 0.57, size * (index === 2 ? 0.045 : 0.028), context.palette[2])
    }),
  ]
}

function kiteMotif(context: DesignRecipeContext, cx: number, cy: number, size: number) {
  const layers: DesignNode[] = [
    polygon('kite-color-panel-a', cx - size * 0.33, cy - size * 0.33, size * 0.66, size * 0.66, [[0.5, 0], [0.5, 1], [0, 0.5]], context.palette[1]),
    polygon('kite-color-panel-b', cx - size * 0.33, cy - size * 0.33, size * 0.66, size * 0.66, [[0.5, 0], [1, 0.5], [0.5, 1]], context.palette[2]),
    polygon('kite-color-panel-c', cx - size * 0.33, cy - size * 0.33, size * 0.66, size * 0.66, [[0.5, 0], [1, 0.5], [0.5, 0.5]], context.palette[3]),
    line('kite-string', cx, cy + size * 0.33, cx + size * 0.24, cy + size * 0.78, context.palette[3], size * 0.018),
    circle('kite-knot', cx, cy, size * 0.035, context.palette[0]),
  ]
  return layers
}

function flagMotif(context: DesignRecipeContext, left: number, top: number, width: number, height: number) {
  const stripeHeight = height / 3
  return [
    rect('flag-pole', left, top - height * 0.08, width * 0.035, height * 1.16, context.palette[3]),
    rect('flag-saffron-band', left + width * 0.06, top, width * 0.88, stripeHeight, '#e77835'),
    rect('flag-white-band', left + width * 0.06, top + stripeHeight, width * 0.88, stripeHeight, '#fffaf0'),
    rect('flag-green-band', left + width * 0.06, top + stripeHeight * 2, width * 0.88, stripeHeight, '#39846e'),
    ...Array.from({ length: 12 }, (_, index) => {
      const angle = index * Math.PI / 6
      return line(`flag-wheel-spoke-${index + 1}`, left + width * 0.5, top + stripeHeight * 1.5,
        left + width * 0.5 + Math.cos(angle) * stripeHeight * 0.36,
        top + stripeHeight * 1.5 + Math.sin(angle) * stripeHeight * 0.36,
        '#294f7d', Math.max(1.5, stripeHeight * 0.025))
    }),
    circle('flag-wheel', left + width * 0.5, top + stripeHeight * 1.5, stripeHeight * 0.39, 'rgba(0,0,0,0)', { stroke: '#294f7d', strokeWidth: Math.max(1.5, stripeHeight * 0.025) }),
  ]
}

function motifLayers(context: DesignRecipeContext, cx: number, cy: number, size: number): DesignNode[] {
  switch (context.motif) {
    case 'diya': return diyaMotif(context, cx, cy, size)
    case 'pumpkin': return pumpkinMotif(context, cx, cy, size)
    case 'tree': return treeMotif(context, cx, cy - size * 0.48, size)
    case 'crescent': return crescentMotif(context, cx, cy, size)
    case 'kite': return kiteMotif(context, cx, cy, size)
    case 'tricolor-flag': return flagMotif(context, cx - size * 0.42, cy - size * 0.26, size * 0.84, size * 0.52)
    case 'wheel': {
      const layers: DesignNode[] = [circle('ashoka-wheel-ring', cx, cy, size * 0.46, 'rgba(0,0,0,0)', { stroke: '#294f7d', strokeWidth: Math.max(3, size * 0.035) })]
      for (let spoke = 0; spoke < 24; spoke += 1) {
        const angle = spoke * Math.PI / 12
        layers.push(line(`ashoka-wheel-spoke-${spoke + 1}`, cx, cy, cx + Math.cos(angle) * size * 0.42, cy + Math.sin(angle) * size * 0.42, '#294f7d', Math.max(1.5, size * 0.012)))
      }
      return layers
    }
    case 'heart': {
      const heart = (name: string, x: number, y: number, scale: number, fill: string): DesignNode[] => [
        circle(`${name}-left`, x - scale * 0.22, y - scale * 0.12, scale * 0.25, fill),
        circle(`${name}-right`, x + scale * 0.22, y - scale * 0.12, scale * 0.25, fill),
        polygon(`${name}-point`, x - scale * 0.43, y - scale * 0.08, scale * 0.86, scale * 0.76, [[0, 0], [0.5, 1], [1, 0]], fill),
      ]
      return [...heart('heart-large', cx, cy, size * 0.88, context.palette[1]), ...heart('heart-small', cx + size * 0.48, cy - size * 0.32, size * 0.38, context.palette[2])]
    }
    case 'firework': {
      const layers: DesignNode[] = []
      for (let burst = 0; burst < 3; burst += 1) {
        const bx = cx + (burst - 1) * size * 0.42
        const by = cy + (burst % 2 ? -size * 0.24 : size * 0.12)
        const color = burst % 2 ? context.palette[1] : context.palette[2]
        for (let ray = 0; ray < 12; ray += 1) {
          const angle = ray * Math.PI / 6
          layers.push(line(`firework-${burst}-${ray}`, bx + Math.cos(angle) * size * 0.08, by + Math.sin(angle) * size * 0.08,
            bx + Math.cos(angle) * size * (0.25 + (ray % 3) * 0.035), by + Math.sin(angle) * size * (0.25 + (ray % 3) * 0.035), color, size * 0.018))
          layers.push(circle(`firework-dot-${burst}-${ray}`, bx + Math.cos(angle) * size * 0.3, by + Math.sin(angle) * size * 0.3, size * 0.018, color))
        }
      }
      return layers
    }
    case 'powder': {
      const colors = [context.palette[1], context.palette[2], '#f2bd46', '#3989a2']
      return Array.from({ length: 22 }, (_, index) => {
        const angle = index * 2.399963
        const distance = size * (0.14 + (index % 5) * 0.095)
        const radius = size * (0.026 + (index % 3) * 0.015)
        return circle(`powder-color-${index + 1}`, cx + Math.cos(angle) * distance, cy + Math.sin(angle) * distance, radius, colors[index % colors.length], { opacity: 0.85 })
      })
    }
    case 'rakhi': {
      const layers: DesignNode[] = [
        line('rakhi-thread-left', cx - size * 0.55, cy, cx - size * 0.22, cy, context.palette[2], size * 0.06),
        line('rakhi-thread-right', cx + size * 0.22, cy, cx + size * 0.55, cy, context.palette[2], size * 0.06),
        circle('rakhi-outer', cx, cy, size * 0.23, context.palette[1]),
        circle('rakhi-inner', cx, cy, size * 0.14, context.palette[2]),
        circle('rakhi-jewel', cx, cy, size * 0.065, context.palette[3]),
      ]
      for (let bead = 0; bead < 8; bead += 1) {
        const angle = bead * Math.PI / 4
        layers.push(circle(`rakhi-bead-${bead}`, cx + Math.cos(angle) * size * 0.31, cy + Math.sin(angle) * size * 0.31, size * 0.04, context.palette[2]))
      }
      return layers
    }
    case 'flute': return [
      rect('flute-body', cx - size * 0.45, cy - size * 0.045, size * 0.9, size * 0.09, context.palette[2], { angle: -12, rx: size * 0.04, ry: size * 0.04 }),
      ...[0.18, 0.36, 0.58, 0.77].map((position, index) => circle(`flute-hole-${index + 1}`, cx - size * 0.45 + size * position, cy - size * 0.005, size * 0.023, context.palette[3])),
      ...floralMotif(context, cx + size * 0.16, cy - size * 0.35, size * 0.3, 'peacock-feather'),
    ]
    case 'bonfire': return [
      polygon('bonfire-wood-left', cx - size * 0.46, cy + size * 0.25, size * 0.9, size * 0.12, [[0, 0.35], [0.88, 0], [1, 0.65], [0.12, 1]], context.palette[3]),
      polygon('bonfire-wood-right', cx - size * 0.38, cy + size * 0.38, size * 0.86, size * 0.11, [[0, 0.5], [0.88, 0], [1, 0.5], [0.12, 1]], context.palette[3]),
      polygon('bonfire-flame', cx - size * 0.28, cy - size * 0.44, size * 0.56, size * 0.8, [[0.52, 0], [0.72, 0.35], [1, 0.6], [0.78, 1], [0.18, 1], [0, 0.58], [0.33, 0.36]], '#e86a34'),
      polygon('bonfire-core', cx - size * 0.1, cy - size * 0.08, size * 0.2, size * 0.4, [[0.5, 0], [1, 0.72], [0.73, 1], [0.2, 1], [0, 0.72]], '#f3c554'),
    ]
    case 'wheat': return [0, 1, 2].flatMap((stem) => {
      const x = cx + (stem - 1) * size * 0.28
      const color = stem === 1 ? context.palette[1] : context.palette[2]
      return [
        line(`wheat-stem-${stem}`, x, cy + size * 0.46, x + (stem - 1) * size * 0.12, cy - size * 0.42, context.palette[3], size * 0.025),
        ...[-0.28, -0.08, 0.12, 0.32].flatMap((offset, index) => {
          const leafY = cy + size * offset
          return [
            ellipse(`wheat-kernel-${stem}-${index}-left`, x - size * 0.09, leafY, size * 0.09, size * 0.035, color, { angle: -35 }),
            ellipse(`wheat-kernel-${stem}-${index}-right`, x + size * 0.09, leafY - size * 0.07, size * 0.09, size * 0.035, color, { angle: 35 }),
          ]
        }),
      ]
    })
    case 'bow': return [
      polygon('bow-left', cx - size * 0.45, cy - size * 0.14, size * 0.43, size * 0.3, [[1, 0.5], [0, 0], [0.12, 1]], context.palette[1]),
      polygon('bow-right', cx + size * 0.02, cy - size * 0.14, size * 0.43, size * 0.3, [[0, 0.5], [1, 0], [0.88, 1]], context.palette[1]),
      circle('bow-knot', cx, cy, size * 0.1, context.palette[2]),
      line('bow-string', cx + size * 0.02, cy, cx + size * 0.4, cy + size * 0.42, context.palette[2], size * 0.025),
    ]
    case 'modak': return [
      polygon('modak-shape', cx - size * 0.36, cy - size * 0.36, size * 0.72, size * 0.76,
        [[0.5, 1], [0.08, 0.55], [0.18, 0.3], [0.35, 0.38], [0.42, 0.15], [0.5, 0.32], [0.62, 0.08], [0.7, 0.36], [0.88, 0.25], [0.96, 0.58]], context.palette[2], { stroke: context.palette[1], strokeWidth: size * 0.025 }),
      line('modak-fold-1', cx - size * 0.22, cy + size * 0.08, cx + size * 0.2, cy + size * 0.08, context.palette[1], size * 0.02),
      line('modak-fold-2', cx - size * 0.15, cy + size * 0.2, cx + size * 0.15, cy + size * 0.2, context.palette[1], size * 0.02),
    ]
    case 'harvest': return [
      ...floralMotif(context, cx - size * 0.22, cy, size * 0.45, 'harvest-sunflower'),
      line('harvest-stem', cx + size * 0.15, cy + size * 0.15, cx + size * 0.3, cy + size * 0.48, context.palette[3], size * 0.035),
      ...[-1, 1].map((direction) => ellipse(`harvest-leaf-${direction}`, cx + size * direction * 0.28, cy + size * 0.32, size * 0.18, size * 0.07, context.palette[1], { angle: direction * -25 })),
    ]
    case 'egg': return [
      ...[-1, 0, 1].map((position, index) => ellipse(`easter-egg-${index}`, cx + position * size * 0.3, cy, size * 0.18, size * 0.26, [context.palette[1], context.palette[2], '#83a99b'][index], { angle: position * 12 })),
      ...[-1, 0, 1].flatMap((position, index) => [
        line(`easter-band-${index}`, cx + position * size * 0.3 - size * 0.14, cy, cx + position * size * 0.3 + size * 0.14, cy, context.palette[0], size * 0.035),
        circle(`easter-dot-${index}`, cx + position * size * 0.3, cy - size * 0.12, size * 0.03, context.palette[0]),
      ]),
    ]
    case 'tie': return [
      polygon('tie-knot', cx - size * 0.11, cy - size * 0.42, size * 0.22, size * 0.2, [[0, 0], [1, 0], [0.82, 1], [0.18, 1]], context.palette[2]),
      polygon('tie-body', cx - size * 0.19, cy - size * 0.24, size * 0.38, size * 0.72, [[0.22, 0], [0.78, 0], [1, 0.85], [0.5, 1], [0, 0.85]], context.palette[1]),
      line('tie-stripe-a', cx - size * 0.12, cy - size * 0.05, cx + size * 0.1, cy + size * 0.04, context.palette[2], size * 0.035),
      line('tie-stripe-b', cx - size * 0.14, cy + size * 0.13, cx + size * 0.13, cy + size * 0.24, context.palette[2], size * 0.035),
    ]
    case 'globe': {
      const layers: DesignNode[] = [
        circle('earth-globe', cx, cy, size * 0.42, context.palette[1]),
        ellipse('earth-longitude', cx, cy, size * 0.2, size * 0.42, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: size * 0.025 }),
        ellipse('earth-latitude-1', cx, cy - size * 0.13, size * 0.35, size * 0.12, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: size * 0.025 }),
        ellipse('earth-latitude-2', cx, cy + size * 0.13, size * 0.35, size * 0.12, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: size * 0.025 }),
      ]
      layers.push(polygon('earth-continent-one', cx - size * 0.2, cy - size * 0.22, size * 0.34, size * 0.36, [[0.05, 0.1], [0.72, 0], [0.88, 0.38], [0.54, 0.52], [0.67, 0.88], [0.32, 1], [0.18, 0.57], [0, 0.4]], context.palette[2]))
      return layers
    }
    case 'poppy': return floralMotif(context, cx, cy, size * 0.78, 'memorial-poppy').map((node) => ({ ...node, fill: node.name.endsWith('center') ? context.palette[3] : '#a94142' }))
    case 'book': return [
      rect('constitution-book-left', cx - size * 0.43, cy - size * 0.32, size * 0.41, size * 0.64, context.palette[2], { angle: -4, rx: size * 0.025, ry: size * 0.025 }),
      rect('constitution-book-right', cx + size * 0.02, cy - size * 0.32, size * 0.41, size * 0.64, context.palette[2], { angle: 4, rx: size * 0.025, ry: size * 0.025 }),
      line('constitution-book-spine', cx, cy - size * 0.32, cx, cy + size * 0.33, context.palette[3], size * 0.025),
      ...[0, 1, 2].flatMap((row) => [
        line(`constitution-left-line-${row}`, cx - size * 0.34, cy - size * 0.14 + row * size * 0.13, cx - size * 0.08, cy - size * 0.14 + row * size * 0.13, context.palette[1], size * 0.018),
        line(`constitution-right-line-${row}`, cx + size * 0.08, cy - size * 0.14 + row * size * 0.13, cx + size * 0.34, cy - size * 0.14 + row * size * 0.13, context.palette[1], size * 0.018),
      ]),
    ]
    case 'star': {
      const points: Array<[number, number]> = Array.from({ length: 10 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI / 5
        const radius = index % 2 ? size * 0.21 : size * 0.45
        return [0.5 + Math.cos(angle) * radius / size, 0.5 + Math.sin(angle) * radius / size]
      })
      return [polygon('veterans-star', cx - size * 0.5, cy - size * 0.5, size, size, points, context.palette[2], { stroke: context.palette[1], strokeWidth: size * 0.025 })]
    }
    case 'flag': return [
      rect('national-flag-pole', cx - size * 0.44, cy - size * 0.5, size * 0.04, size, context.palette[3]),
      polygon('national-flag-cloth', cx - size * 0.38, cy - size * 0.47, size * 0.82, size * 0.62, [[0, 0], [1, 0.12], [0.96, 1], [0, 0.82]], context.palette[1]),
      line('national-flag-fold-1', cx - size * 0.35, cy - size * 0.25, cx + size * 0.38, cy - size * 0.16, context.palette[2], size * 0.02),
      line('national-flag-fold-2', cx - size * 0.35, cy - size * 0.04, cx + size * 0.37, cy + size * 0.05, context.palette[2], size * 0.02),
    ]
    case 'flower': return floralMotif(context, cx, cy, size * 0.82, 'occasion-flower')
    case 'spark': return [
      polygon('spark-main-star', cx - size * 0.32, cy - size * 0.32, size * 0.64, size * 0.64, [[0.5, 0], [0.61, 0.39], [1, 0.5], [0.61, 0.61], [0.5, 1], [0.39, 0.61], [0, 0.5], [0.39, 0.39]], context.palette[2]),
      polygon('spark-side-star', cx + size * 0.25, cy - size * 0.43, size * 0.24, size * 0.24, [[0.5, 0], [0.64, 0.36], [1, 0.5], [0.64, 0.64], [0.5, 1], [0.36, 0.64], [0, 0.5], [0.36, 0.36]], context.palette[1]),
      circle('spark-dot', cx - size * 0.37, cy + size * 0.28, size * 0.055, context.palette[3]),
    ]
    case 'geometric': return [
      polygon('geometric-diamond', cx - size * 0.4, cy - size * 0.35, size * 0.56, size * 0.7, [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], context.palette[1]),
      polygon('geometric-cutout', cx - size * 0.08, cy - size * 0.24, size * 0.48, size * 0.48, [[0, 0], [1, 0.3], [0.64, 1], [0.18, 0.72]], context.palette[2]),
      circle('geometric-anchor', cx + size * 0.34, cy + size * 0.27, size * 0.1, context.palette[3]),
      line('geometric-orbit', cx - size * 0.42, cy + size * 0.39, cx + size * 0.42, cy - size * 0.39, context.palette[3], size * 0.018),
    ]
    case 'chart': return [
      line('chart-axis-y', cx - size * 0.4, cy - size * 0.34, cx - size * 0.4, cy + size * 0.37, context.palette[3], size * 0.025),
      line('chart-axis-x', cx - size * 0.42, cy + size * 0.37, cx + size * 0.44, cy + size * 0.37, context.palette[3], size * 0.025),
      ...[0.28, 0.52, 0.38, 0.76, 0.62].map((value, index) => rect(`chart-column-${index}`, cx - size * 0.31 + index * size * 0.15, cy + size * (0.32 - value * 0.66), size * 0.09, size * value * 0.66, index === 3 ? context.palette[2] : context.palette[1])),
      line('chart-trend-line', cx - size * 0.3, cy + size * 0.05, cx + size * 0.34, cy - size * 0.25, context.palette[2], size * 0.025),
    ]
    case 'bars': return [
      rect('bars-panel', cx - size * 0.45, cy - size * 0.34, size * 0.9, size * 0.68, context.palette[1]),
      ...[0.34, 0.58, 0.45, 0.79].map((value, index) => rect(`bars-column-${index}`, cx - size * 0.35 + index * size * 0.2, cy + size * (0.27 - value * 0.58), size * 0.12, size * value * 0.58, index % 2 ? context.palette[2] : context.palette[0])),
      line('bars-baseline', cx - size * 0.38, cy + size * 0.29, cx + size * 0.39, cy + size * 0.29, context.palette[3], size * 0.02),
    ]
    case 'building': return [
      polygon('building-roof', cx - size * 0.42, cy - size * 0.4, size * 0.84, size * 0.22, [[0.5, 0], [1, 1], [0, 1]], context.palette[2]),
      rect('building-main', cx - size * 0.34, cy - size * 0.2, size * 0.68, size * 0.58, context.palette[1]),
      rect('building-wing-left', cx - size * 0.46, cy + size * 0.03, size * 0.14, size * 0.35, context.palette[2]),
      rect('building-wing-right', cx + size * 0.32, cy + size * 0.03, size * 0.14, size * 0.35, context.palette[2]),
      ...[-1, 0, 1].flatMap((column) => [-1, 0].map((row) => rect(`building-window-${column}-${row}`, cx + column * size * 0.19 - size * 0.035, cy + row * size * 0.18 - size * 0.08, size * 0.07, size * 0.09, context.palette[0]))),
      rect('building-door', cx - size * 0.07, cy + size * 0.17, size * 0.14, size * 0.21, context.palette[3]),
    ]
    case 'camera': return [
      rect('camera-body', cx - size * 0.43, cy - size * 0.27, size * 0.86, size * 0.55, context.palette[1], { rx: size * 0.07, ry: size * 0.07 }),
      rect('camera-top', cx - size * 0.22, cy - size * 0.37, size * 0.29, size * 0.12, context.palette[3]),
      circle('camera-lens-ring', cx + size * 0.02, cy, size * 0.21, context.palette[2]),
      circle('camera-lens', cx + size * 0.02, cy, size * 0.13, context.palette[3]),
      circle('camera-highlight', cx + size * 0.07, cy - size * 0.05, size * 0.045, '#ffffff'),
      circle('camera-indicator', cx + size * 0.33, cy - size * 0.16, size * 0.035, context.palette[2]),
    ]
    case 'play': return [
      rect('playback-frame', cx - size * 0.45, cy - size * 0.3, size * 0.9, size * 0.6, context.palette[3], { rx: size * 0.1, ry: size * 0.1 }),
      polygon('playback-triangle', cx - size * 0.13, cy - size * 0.19, size * 0.34, size * 0.38, [[0, 0], [1, 0.5], [0, 1]], context.palette[0]),
      line('playback-progress-bg', cx - size * 0.34, cy + size * 0.22, cx + size * 0.34, cy + size * 0.22, '#ffffff', size * 0.025),
      line('playback-progress', cx - size * 0.34, cy + size * 0.22, cx + size * 0.02, cy + size * 0.22, context.palette[2], size * 0.035),
    ]
    case 'code': return [
      rect('code-window', cx - size * 0.46, cy - size * 0.35, size * 0.92, size * 0.7, '#162c3c', { stroke: context.palette[2], strokeWidth: size * 0.018, rx: size * 0.04, ry: size * 0.04 }),
      ...[0, 1, 2, 3].map((row) => line(`code-line-${row}`, cx - size * 0.25, cy - size * 0.15 + row * size * 0.12, cx + size * (row % 2 ? 0.24 : 0.1), cy - size * 0.15 + row * size * 0.12, row === 1 ? context.palette[2] : context.palette[0], size * 0.025)),
      polygon('code-chevron-left', cx - size * 0.38, cy - size * 0.08, size * 0.12, size * 0.22, [[0.8, 0], [0, 0.5], [0.8, 1], [1, 0.84], [0.38, 0.5], [1, 0.16]], context.palette[2]),
      polygon('code-chevron-right', cx + size * 0.27, cy - size * 0.08, size * 0.12, size * 0.22, [[0.2, 0], [1, 0.5], [0.2, 1], [0, 0.84], [0.62, 0.5], [0, 0.16]], context.palette[2]),
    ]
    case 'circuit': return [
      rect('circuit-board', cx - size * 0.43, cy - size * 0.35, size * 0.86, size * 0.7, '#1e4a55', { rx: size * 0.06, ry: size * 0.06 }),
      ...[-1, 1].flatMap((direction) => [
        line(`circuit-trace-${direction}-a`, cx + direction * size * 0.12, cy - size * 0.1, cx + direction * size * 0.34, cy - size * 0.1, '#81c5b4', size * 0.025),
        line(`circuit-trace-${direction}-b`, cx + direction * size * 0.12, cy + size * 0.1, cx + direction * size * 0.3, cy + size * 0.1, '#81c5b4', size * 0.025),
        circle(`circuit-node-${direction}-a`, cx + direction * size * 0.35, cy - size * 0.1, size * 0.04, context.palette[2]),
        circle(`circuit-node-${direction}-b`, cx + direction * size * 0.31, cy + size * 0.1, size * 0.04, context.palette[2]),
      ]),
      rect('circuit-chip', cx - size * 0.12, cy - size * 0.15, size * 0.24, size * 0.3, context.palette[3], { stroke: context.palette[2], strokeWidth: size * 0.02 }),
    ]
    case 'gear': {
      const points: Array<[number, number]> = Array.from({ length: 24 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI / 12
        const radius = index % 3 === 0 ? 0.48 : index % 3 === 1 ? 0.43 : 0.37
        return [0.5 + Math.cos(angle) * radius, 0.5 + Math.sin(angle) * radius]
      })
      return [
        polygon('gear-outline', cx - size * 0.5, cy - size * 0.5, size, size, points, context.palette[1], { stroke: context.palette[3], strokeWidth: size * 0.02 }),
        circle('gear-cutout', cx, cy, size * 0.19, context.palette[0]),
        circle('gear-hub', cx, cy, size * 0.08, context.palette[2]),
      ]
    }
    case 'prototype': return [
      polygon('prototype-top', cx - size * 0.36, cy - size * 0.3, size * 0.72, size * 0.38, [[0.5, 0], [1, 0.35], [0.5, 1], [0, 0.35]], context.palette[2]),
      polygon('prototype-left', cx - size * 0.36, cy - size * 0.17, size * 0.36, size * 0.56, [[0, 0], [1, 0.23], [1, 1], [0, 0.72]], context.palette[1]),
      polygon('prototype-right', cx, cy - size * 0.17, size * 0.36, size * 0.56, [[0, 0.23], [1, 0], [1, 0.72], [0, 1]], context.palette[3]),
      line('prototype-measure-x', cx - size * 0.42, cy + size * 0.48, cx + size * 0.42, cy + size * 0.48, context.palette[2], size * 0.018),
    ]
    case 'profile': return [
      circle('profile-avatar', cx - size * 0.18, cy - size * 0.1, size * 0.2, context.palette[1]),
      ellipse('profile-shoulders', cx - size * 0.18, cy + size * 0.28, size * 0.34, size * 0.21, context.palette[2]),
      ...[0, 1, 2].map((row) => line(`profile-bio-line-${row}`, cx + size * 0.18, cy - size * 0.14 + row * size * 0.15, cx + size * (row === 1 ? 0.43 : 0.37), cy - size * 0.14 + row * size * 0.15, context.palette[3], size * 0.026)),
      circle('profile-status', cx + size * 0.38, cy + size * 0.32, size * 0.07, '#58a978'),
    ]
    case 'mandala': {
      const layers: DesignNode[] = []
      for (let ring = 0; ring < 3; ring += 1) {
        const radius = size * (0.15 + ring * 0.13)
        layers.push(circle(`rangoli-ring-${ring}`, cx, cy, radius, 'rgba(0,0,0,0)', { stroke: ring % 2 ? context.palette[1] : context.palette[2], strokeWidth: Math.max(2, size * 0.022) }))
        for (let petal = 0; petal < 8; petal += 1) {
          const angle = petal * Math.PI / 4 + ring * Math.PI / 8
          layers.push(ellipse(`rangoli-petal-${ring}-${petal}`, cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius, size * 0.04, size * 0.09, ring % 2 ? context.palette[2] : context.palette[1], { angle: petal * 45 }))
        }
      }
      layers.push(circle('rangoli-center', cx, cy, size * 0.075, context.palette[3]))
      return layers
    }
    default: return [
      ...floralMotif(context, cx, cy, size * 0.72, context.motif),
      circle('illustration-accent', cx + size * 0.4, cy - size * 0.38, size * 0.08, context.palette[2]),
    ]
  }
}

function photoPlaceholder(context: DesignRecipeContext, left: number, top: number, width: number, height: number, labelText: string): DesignNode[] {
  const [background, primary, accent] = context.palette
  return [
    rect(`${labelText}-photo-frame`, left, top, width, height, primary, { rx: 12, ry: 12 }),
    polygon(`${labelText}-photo-sky`, left, top, width, height, [[0, 0], [1, 0], [1, 0.56], [0, 0.82]], accent, { opacity: 0.84 }),
    circle(`${labelText}-sun`, left + width * 0.73, top + height * 0.2, Math.min(width, height) * 0.1, background),
    polygon(`${labelText}-photo-hill`, left, top + height * 0.45, width, height * 0.55, [[0, 0.82], [0.3, 0.12], [0.62, 0.72], [0.78, 0.36], [1, 0.85], [1, 1], [0, 1]], primary),
    text(`${labelText}-placeholder-label`, 'REPLACE IMAGE', left + width * 0.08, top + height * 0.82, width * 0.5, Math.max(11, context.width * 0.012), background, 'Avenir Next', { fontWeight: 'bold', charSpacing: 75 }),
  ]
}

function withIllustration(context: DesignRecipeContext, layers: DesignNode[], cx: number, cy: number, size: number) {
  layers.push(...motifLayers(context, cx, cy, size))
  if (context.style === '3D' || context.threeDShape) {
    const dimension = Math.min(size, context.width * 0.22)
    const node: DesignThreeDNode = {
      kind: 'three-d', name: 'Editable 3D feature object', left: cx - dimension / 2, top: cy - dimension / 2,
      width: dimension, height: dimension, shape: context.threeDShape ?? 'cube', color: context.palette[2],
      rotationX: -16, rotationY: 28, rotationZ: 5,
    }
    layers.push(node)
  }
  return layers
}

function fullBleedPhoto(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, context.palette[3])
  const photoWidth = width * 0.76
  layers.push(...photoPlaceholder(context, width - photoWidth, 0, photoWidth, height, 'hero'))
  layers.push(...motifLayers(context, width * 0.8, height * 0.42, Math.min(width, height) * 0.14))
  layers.push(rect('hero-copy-panel', 0, 0, width * 0.43, height, context.palette[0], { opacity: 0.97 }))
  layers.push(label(context, margin, height * 0.17, width * 0.34, context.palette[2]))
  layers.push(title(context, margin, height * 0.31, width * 0.38, width * 0.066, context.palette[3]))
  layers.push(line('hero-rule', margin, height * 0.68, width * 0.34, height * 0.68, context.palette[1], Math.max(4, width * 0.006)))
  layers.push(copy(context, margin, height * 0.72, width * 0.32, context.palette[3]))
  return layers
}

function splitScreen(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const split = width * 0.53
  const layers = base(context)
  layers.push(rect('split-color-field', split, 0, width - split, height, context.palette[1]))
  layers.push(polygon('split-diagonal-seam', split - width * 0.08, 0, width * 0.16, height, [[0, 0], [1, 0], [0, 1]], context.palette[1]))
  layers.push(label(context, margin, height * 0.19, split - margin * 1.5))
  layers.push(title(context, margin, height * 0.36, split - margin * 1.5, width * 0.062))
  layers.push(copy(context, margin, height * 0.64, split - margin * 1.6))
  layers.push(...withIllustration(context, [], split + (width - split) / 2, height * 0.52, Math.min(width - split, height) * 0.56))
  return layers
}

function magazine(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#f4f0e7')
  layers.push(text('magazine-issue', 'FIELD NOTES  /  01', margin, margin * 0.55, width - margin * 2, width * 0.015, context.palette[1], 'Avenir Next', { fontWeight: 'bold', charSpacing: 140 }))
  layers.push(line('magazine-top-rule', margin, margin * 1.2, width - margin, margin * 1.2, context.palette[3], 2))
  layers.push(title(context, margin, height * 0.16, width * 0.78, width * 0.079, context.palette[3], { fontWeight: 'normal' }))
  layers.push(copy(context, margin, height * 0.43, width * 0.42, context.palette[3]))
  layers.push(rect('magazine-color-block', width * 0.58, height * 0.48, width * 0.34, height * 0.37, context.palette[1]))
  layers.push(...withIllustration(context, [], width * 0.75, height * 0.66, Math.min(width, height) * 0.27))
  layers.push(text('magazine-folio', 'E / STUDIO     01', margin, height - margin * 0.78, width - margin * 2, width * 0.014, context.palette[1], 'Avenir Next', { charSpacing: 95 }))
  return layers
}

function asymmetrical(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context)
  layers.push(polygon('asymmetrical-color-plane', width * 0.36, 0, width * 0.64, height, [[0.42, 0], [1, 0], [1, 1], [0, 1]], context.palette[1]))
  layers.push(polygon('asymmetrical-accent', 0, height * 0.78, width * 0.7, height * 0.22, [[0, 1], [0.82, 0], [1, 0.4], [0.18, 1]], context.palette[2]))
  layers.push(label(context, margin, height * 0.17, width * 0.56))
  layers.push(title(context, margin, height * 0.31, width * 0.57, width * 0.068))
  layers.push(copy(context, margin, height * 0.57, width * 0.43))
  layers.push(...withIllustration(context, [], width * 0.72, height * 0.47, Math.min(width, height) * 0.38))
  return layers
}

function geometric(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, context.palette[3])
  layers.push(polygon('geo-panel-one', width * 0.55, 0, width * 0.45, height * 0.56, [[0, 0], [1, 0], [1, 1]], context.palette[1]))
  layers.push(polygon('geo-panel-two', 0, height * 0.52, width * 0.74, height * 0.48, [[0, 1], [0.5, 0], [1, 1]], context.palette[2]))
  layers.push(circle('geo-anchor', width * 0.79, height * 0.72, Math.min(width, height) * 0.12, context.palette[1]))
  layers.push(...motifLayers(context, width * 0.79, height * 0.72, Math.min(width, height) * 0.22))
  layers.push(label(context, margin, height * 0.18, width * 0.5, context.palette[2]))
  layers.push(title(context, margin, height * 0.34, width * 0.57, width * 0.066, context.palette[0]))
  layers.push(copy(context, margin, height * 0.59, width * 0.5, context.palette[0]))
  return layers
}

function gridLayout(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context)
  const gap = margin * 0.18
  const cellW = (width - margin * 2 - gap * 2) / 3
  const cellH = height * 0.16
  layers.push(label(context, margin, margin * 0.8, width - margin * 2))
  layers.push(title(context, margin, height * 0.12, width - margin * 2, width * 0.064))
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const x = margin + column * (cellW + gap)
      const y = height * 0.39 + row * (cellH + gap)
      const fill = (row + column) % 2 ? context.palette[1] : context.palette[2]
      layers.push(rect(`grid-cell-${row}-${column}`, x, y, cellW, cellH, fill, { opacity: 0.78 }))
      if ((row + column) % 3 === 0) layers.push(...motifLayers(context, x + cellW * 0.5, y + cellH * 0.46, Math.min(cellW, cellH) * 0.42))
      else layers.push(text(`grid-label-${row}-${column}`, `${String(row * 3 + column + 1).padStart(2, '0')}  ${context.subcategory.split(' ')[0].toUpperCase()}`, x + cellW * 0.09, y + cellH * 0.62, cellW * 0.82, Math.max(10, width * 0.012), context.palette[3], 'Avenir Next', { fontWeight: 'bold' }))
    }
  }
  return layers
}

function collage(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#f1eadf')
  layers.push(rect('collage-card-back', width * 0.48, height * 0.16, width * 0.4, height * 0.47, context.palette[1], { angle: 7, rx: 8, ry: 8 }))
  layers.push(...photoPlaceholder(context, width * 0.46, height * 0.13, width * 0.4, height * 0.46, 'collage'))
  layers.push(...motifLayers(context, width * 0.68, height * 0.36, Math.min(width, height) * 0.17))
  layers.push(rect('collage-paper', margin, height * 0.38, width * 0.58, height * 0.43, context.palette[0], { angle: -3, stroke: context.palette[3], strokeWidth: 2 }))
  layers.push(label(context, margin * 1.15, height * 0.46, width * 0.45))
  layers.push(title(context, margin * 1.15, height * 0.55, width * 0.48, width * 0.055))
  layers.push(circle('collage-sticker', width * 0.81, height * 0.78, Math.min(width, height) * 0.11, context.palette[2]))
  layers.push(text('collage-sticker-text', 'MAKE\nIT YOURS', width * 0.73, height * 0.75, width * 0.16, width * 0.015, context.palette[3], 'Avenir Next', { textAlign: 'center', fontWeight: 'bold' }))
  return layers
}

function typeFocus(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, context.style === 'Minimalist' ? '#faf8f2' : context.palette[3])
  layers.push(...motifLayers(context, width * 0.84, height * 0.17, Math.min(width, height) * 0.12))
  layers.push(text('type-overline', context.occasion ? context.occasion.toUpperCase() : context.category.replaceAll('-', ' ').toUpperCase(), margin, height * 0.14, width - margin * 2, width * 0.018, context.palette[2], 'Avenir Next', { textAlign: 'center', charSpacing: 150, fontWeight: 'bold' }))
  layers.push(text('type-display', context.title, margin * 0.7, height * 0.26, width - margin * 1.4, width * 0.11, context.palette[1], 'Georgia', { fontWeight: 'bold', textAlign: 'center', lineHeight: 0.86 }))
  layers.push(line('type-short-rule', width * 0.38, height * 0.68, width * 0.62, height * 0.68, context.palette[2], Math.max(3, width * 0.004)))
  const captionColor = context.style === 'Minimalist' ? context.palette[3] : context.palette[0]
  layers.push(text('type-caption', context.supportingText.toUpperCase(), width * 0.17, height * 0.73, width * 0.66, width * 0.017, captionColor, 'Avenir Next', { textAlign: 'center', charSpacing: 55 }))
  return layers
}

function centralIllustration(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context)
  layers.push(label(context, margin, margin * 0.8, width - margin * 2, context.palette[1], context.occasion ?? context.subcategory))
  layers.push(title(context, margin, height * 0.12, width - margin * 2, width * 0.056, context.palette[3], { textAlign: 'center' }))
  const centerY = height * 0.53
  layers.push(circle('illustration-halo', width * 0.5, centerY, Math.min(width, height) * 0.28, context.palette[0], { stroke: context.palette[2], strokeWidth: Math.max(3, width * 0.005) }))
  layers.push(...withIllustration(context, [], width * 0.5, centerY, Math.min(width, height) * 0.42))
  layers.push(copy(context, margin * 1.2, height * 0.83, width - margin * 2.4, context.palette[3], context.supportingText))
  return layers
}

function decorativeFrame(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, context.style === 'Luxury' ? context.palette[0] : '#f7f1e7')
  const inner = margin * 0.6
  layers.push(rect('frame-outer', inner, inner, width - inner * 2, height - inner * 2, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: Math.max(3, width * 0.006) }))
  layers.push(rect('frame-inner', inner + margin * 0.24, inner + margin * 0.24, width - (inner + margin * 0.24) * 2, height - (inner + margin * 0.24) * 2, 'rgba(0,0,0,0)', { stroke: context.palette[1], strokeWidth: 1.5 }))
  for (const [corner, x, y] of [['tl', inner, inner], ['tr', width - inner, inner], ['bl', inner, height - inner], ['br', width - inner, height - inner]] as const) {
    layers.push(circle(`frame-jewel-${corner}`, x, y, margin * 0.1, context.palette[1]))
  }
  layers.push(label(context, margin, height * 0.24, width - margin * 2, context.palette[2]))
  layers.push(title(context, margin, height * 0.36, width - margin * 2, width * 0.065, context.palette[3], { textAlign: 'center' }))
  layers.push(...withIllustration(context, [], width * 0.5, height * 0.66, Math.min(width, height) * 0.28))
  layers.push(copy(context, margin * 1.3, height * 0.83, width - margin * 2.6, context.palette[3], context.supportingText))
  return layers
}

function diagonal(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context)
  layers.push(polygon('diagonal-main', 0, 0, width, height, [[0.58, 0], [1, 0], [1, 1], [0, 1]], context.palette[1]))
  layers.push(polygon('diagonal-accent', 0, height * 0.75, width, height * 0.25, [[0, 1], [0.5, 0], [0.66, 0], [0.16, 1]], context.palette[2]))
  layers.push(label(context, margin, height * 0.18, width * 0.46, context.palette[2]))
  layers.push(title(context, margin, height * 0.33, width * 0.48, width * 0.062, context.palette[3]))
  layers.push(copy(context, margin, height * 0.58, width * 0.4, context.palette[3]))
  layers.push(...withIllustration(context, [], width * 0.75, height * 0.48, Math.min(width, height) * 0.33))
  return layers
}

function layeredPoster(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, context.palette[3])
  layers.push(circle('poster-disc-back', width * 0.74, height * 0.32, Math.min(width, height) * 0.3, context.palette[1]))
  layers.push(rect('poster-label-strip', 0, height * 0.11, width, height * 0.06, context.palette[2]))
  layers.push(text('poster-label', (context.occasion ?? context.subcategory).toUpperCase(), margin, height * 0.125, width - margin * 2, width * 0.018, context.palette[3], 'Avenir Next', { textAlign: 'center', charSpacing: 135, fontWeight: 'bold' }))
  layers.push(title(context, margin, height * 0.27, width * 0.74, width * 0.082, context.palette[0]))
  layers.push(...withIllustration(context, [], width * 0.73, height * 0.65, Math.min(width, height) * 0.36))
  layers.push(copy(context, margin, height * 0.84, width * 0.54, context.palette[0]))
  return layers
}

function technicalBlueprint(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#102c42')
  const step = Math.max(42, Math.round(width / 15))
  for (let x = step; x < width; x += step) layers.push(line(`blueprint-grid-v-${x}`, x, 0, x, height, '#376078', 1, { opacity: 0.34 }))
  for (let y = step; y < height; y += step) layers.push(line(`blueprint-grid-h-${y}`, 0, y, width, y, '#376078', 1, { opacity: 0.34 }))
  layers.push(rect('blueprint-border', margin * 0.55, margin * 0.55, width - margin * 1.1, height - margin * 1.1, 'rgba(0,0,0,0)', { stroke: '#77b4bd', strokeWidth: 2 }))
  layers.push(label(context, margin, margin, width - margin * 2, '#91d1d2', 'ENGINEERING / DESIGN NOTE'))
  layers.push(title(context, margin, height * 0.17, width * 0.6, width * 0.06, '#f1f0e8'))
  layers.push(copy(context, margin, height * 0.37, width * 0.45, '#d7e8e7'))
  const cx = width * 0.72
  const cy = height * 0.58
  const radius = Math.min(width, height) * 0.22
  layers.push(circle('blueprint-drawing-circle', cx, cy, radius, 'rgba(0,0,0,0)', { stroke: '#91d1d2', strokeWidth: 3 }))
  layers.push(...motifLayers(context, cx, cy, radius * 1.35))
  layers.push(line('dimension-line-horizontal', cx - radius, cy + radius * 1.25, cx + radius, cy + radius * 1.25, '#e8b866', 2))
  layers.push(line('dimension-tick-left', cx - radius, cy + radius * 1.18, cx - radius, cy + radius * 1.32, '#e8b866', 2))
  layers.push(line('dimension-tick-right', cx + radius, cy + radius * 1.18, cx + radius, cy + radius * 1.32, '#e8b866', 2))
  layers.push(text('blueprint-dimension-label', 'FIG. 01  /  SCALE 1:25', cx - radius, cy + radius * 1.34, radius * 2, width * 0.014, '#e8b866', 'Avenir Next', { textAlign: 'center', charSpacing: 80 }))
  return layers
}

function structuredInfo(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const side = width * 0.26
  const layers = base(context)
  layers.push(rect('information-sidebar', 0, 0, side, height, context.palette[1]))
  layers.push(text('information-index', '01\n/\n04', margin * 0.54, height * 0.15, side - margin, width * 0.042, context.palette[0], 'Georgia', { lineHeight: 1.3 }))
  layers.push(line('information-sidebar-rule', margin * 0.54, height * 0.39, side - margin * 0.5, height * 0.39, context.palette[2], 2))
  layers.push(text('information-side-label', context.category.toUpperCase().replaceAll('-', ' '), margin * 0.54, height * 0.44, side - margin, width * 0.014, context.palette[0], 'Avenir Next', { charSpacing: 70 }))
  layers.push(...motifLayers(context, side * 0.5, height * 0.78, Math.min(side, height) * 0.22))
  layers.push(label(context, side + margin * 0.8, height * 0.16, width - side - margin * 1.6))
  layers.push(title(context, side + margin * 0.8, height * 0.28, width - side - margin * 1.6, width * 0.057))
  layers.push(copy(context, side + margin * 0.8, height * 0.48, width - side - margin * 1.6))
  for (let row = 0; row < 3; row += 1) {
    const y = height * 0.65 + row * height * 0.09
    layers.push(line(`info-row-${row}-rule`, side + margin * 0.8, y, width - margin, y, '#c6d0c8', 1.5))
    layers.push(text(`info-row-${row}-number`, `0${row + 1}`, side + margin * 0.8, y + 8, width * 0.09, width * 0.016, context.palette[1], 'Georgia', { fontWeight: 'bold' }))
    layers.push(text(`info-row-${row}-label`, ['OVERVIEW', 'DETAILS', 'NEXT STEPS'][row], side + margin * 1.8, y + 8, width * 0.4, width * 0.014, context.palette[3], 'Avenir Next', { charSpacing: 80 }))
  }
  return layers
}

function minimalist(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#faf8f1')
  layers.push(rect('minimalist-border', margin, margin, width - margin * 2, height - margin * 2, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: 1.5 }))
  layers.push(text('minimalist-index', 'NO. 01     /     ESTUDIO', margin * 1.3, margin * 1.2, width - margin * 2.6, width * 0.013, context.palette[1], 'Avenir Next', { charSpacing: 110 }))
  layers.push(title(context, margin * 1.3, height * 0.36, width * 0.7, width * 0.069, context.palette[3]))
  layers.push(line('minimalist-rule', margin * 1.3, height * 0.58, margin * 2.3, height * 0.58, context.palette[1], 2))
  layers.push(copy(context, margin * 1.3, height * 0.63, width * 0.54, context.palette[3]))
  layers.push(circle('minimalist-seal', width - margin * 1.6, height - margin * 1.65, margin * 0.15, context.palette[1]))
  layers.push(...motifLayers(context, width - margin * 1.6, height - margin * 1.65, margin * 0.27))
  return layers
}

function luxuryInvitation(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, context.style === 'Luxury' ? '#211b2a' : '#f6f0e6')
  const archTop = height * 0.09
  const archLeft = width * 0.16
  const archWidth = width * 0.68
  const archHeight = height * 0.72
  layers.push(rect('invitation-arch-body', archLeft, archTop + archWidth * 0.5, archWidth, archHeight - archWidth * 0.5, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: 2.4 }))
  layers.push(ellipse('invitation-arch-cap', width * 0.5, archTop + archWidth * 0.5, archWidth * 0.5, archWidth * 0.5, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: 2.4 }))
  layers.push(circle('invitation-top-seal', width * 0.5, height * 0.22, width * 0.036, context.palette[2]))
  layers.push(label(context, margin * 1.4, height * 0.32, width - margin * 2.8, context.palette[2], context.occasion ?? 'A SPECIAL INVITATION'))
  layers.push(title(context, margin * 1.4, height * 0.42, width - margin * 2.8, width * 0.061, context.style === 'Luxury' ? '#f5ead7' : context.palette[3], { textAlign: 'center', fontWeight: 'normal' }))
  layers.push(...withIllustration(context, [], width * 0.5, height * 0.68, Math.min(width, height) * 0.15))
  layers.push(copy(context, margin * 1.6, height * 0.8, width - margin * 3.2, context.style === 'Luxury' ? '#e5d6bd' : context.palette[3], context.supportingText))
  return layers
}

function worksheet(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#fffdf7')
  layers.push(rect('worksheet-header-band', 0, 0, width, height * 0.2, context.palette[1]))
  layers.push(label(context, margin, height * 0.06, width - margin * 2, context.palette[2], 'CLASSROOM ACTIVITY'))
  layers.push(title(context, margin, height * 0.115, width - margin * 2, width * 0.047, '#ffffff'))
  layers.push(text('worksheet-student-name', 'NAME ____________________     DATE __________', margin, height * 0.25, width - margin * 2, width * 0.015, context.palette[3], 'Avenir Next', { fontWeight: 'bold' }))
  for (let section = 0; section < 3; section += 1) {
    const top = height * (0.35 + section * 0.2)
    layers.push(circle(`worksheet-step-${section + 1}`, margin * 0.75, top + width * 0.025, width * 0.025, context.palette[2]))
    layers.push(text(`worksheet-step-label-${section + 1}`, `${section + 1}.  ${['READ', 'THINK', 'ANSWER'][section]}`, margin * 1.25, top, width * 0.3, width * 0.018, context.palette[1], 'Avenir Next', { fontWeight: 'bold' }))
    layers.push(copy(context, margin * 1.25, top + width * 0.04, width * 0.72, context.palette[3]))
    layers.push(line(`worksheet-answer-line-${section + 1}`, margin * 1.25, top + height * 0.1, width - margin, top + height * 0.1, '#c5d2c8', 1.5))
  }
  return layers
}

function schedule(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context)
  layers.push(label(context, margin, margin, width - margin * 2))
  layers.push(title(context, margin, height * 0.12, width - margin * 2, width * 0.065))
  const gridTop = height * 0.3
  const rows = 6
  const rowHeight = height * 0.095
  const labelWidth = width * 0.2
  for (let row = 0; row < rows; row += 1) {
    const y = gridTop + row * rowHeight
    const fill = row % 2 ? '#f3f5ef' : '#ffffff'
    layers.push(rect(`schedule-row-${row}`, margin, y, width - margin * 2, rowHeight, fill, { stroke: '#d7dfd8', strokeWidth: 1 }))
    layers.push(text(`schedule-time-${row}`, `${String(8 + row * 2).padStart(2, '0')}:00`, margin * 1.18, y + rowHeight * 0.31, labelWidth, width * 0.017, context.palette[1], 'Avenir Next', { fontWeight: 'bold' }))
    layers.push(line(`schedule-column-${row}`, margin + labelWidth, y, margin + labelWidth, y + rowHeight, '#d7dfd8', 1))
    layers.push(text(`schedule-item-${row}`, ['FOCUS', 'STUDY', 'BREAK', 'PROJECT', 'REVIEW', 'RESET'][row], margin * 1.18 + labelWidth, y + rowHeight * 0.31, width * 0.5, width * 0.015, context.palette[3], 'Avenir Next'))
  }
  return layers
}

function certificate(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#f7f3e9')
  layers.push(rect('certificate-border-outer', margin * 0.55, margin * 0.55, width - margin * 1.1, height - margin * 1.1, 'rgba(0,0,0,0)', { stroke: context.palette[1], strokeWidth: 5 }))
  layers.push(rect('certificate-border-inner', margin * 0.8, margin * 0.8, width - margin * 1.6, height - margin * 1.6, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: 1.4 }))
  layers.push(circle('certificate-medal', width * 0.5, height * 0.23, Math.min(width, height) * 0.075, context.palette[2]))
  layers.push(...motifLayers(context, width * 0.5, height * 0.23, Math.min(width, height) * 0.12))
  layers.push(label(context, margin * 1.5, height * 0.37, width - margin * 3, context.palette[1], 'CERTIFICATE OF ACHIEVEMENT'))
  layers.push(title(context, margin * 1.5, height * 0.48, width - margin * 3, width * 0.055, context.palette[3], { textAlign: 'center' }))
  layers.push(copy(context, margin * 1.6, height * 0.64, width - margin * 3.2, context.palette[3], 'Presented in recognition of dedication, learning, and meaningful contribution.'))
  layers.push(line('certificate-signature-left', width * 0.16, height * 0.83, width * 0.42, height * 0.83, context.palette[1], 1.5))
  layers.push(line('certificate-signature-right', width * 0.58, height * 0.83, width * 0.84, height * 0.83, context.palette[1], 1.5))
  return layers
}

function dataPoster(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#edf1ee')
  layers.push(rect('data-poster-hero', 0, 0, width, height * 0.31, context.palette[3]))
  layers.push(label(context, margin, height * 0.07, width - margin * 2, context.palette[2]))
  layers.push(title(context, margin, height * 0.15, width * 0.7, width * 0.052, '#ffffff'))
  layers.push(copy(context, margin, height * 0.36, width * 0.66, context.palette[3]))
  layers.push(...motifLayers(context, width * 0.31, height * 0.66, Math.min(width, height) * 0.17))
  const chartLeft = width * 0.64
  const chartBottom = height * 0.78
  layers.push(line('data-chart-axis-x', chartLeft, chartBottom, width * 0.92, chartBottom, context.palette[3], 2))
  layers.push(line('data-chart-axis-y', chartLeft, height * 0.49, chartLeft, chartBottom, context.palette[3], 2))
  const bars = [0.34, 0.62, 0.48, 0.87]
  bars.forEach((value, index) => layers.push(rect(`data-bar-${index}`, chartLeft + width * (0.04 + index * 0.065), chartBottom - height * value * 0.3, width * 0.04, height * value * 0.3, index === 3 ? context.palette[2] : context.palette[1])))
  layers.push(line('data-poster-bottom-rule', margin, height * 0.89, width - margin, height * 0.89, context.palette[1], 3))
  return layers
}

function menuLayout(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#f6f0e4')
  layers.push(rect('menu-side-art', width * 0.64, 0, width * 0.36, height, context.palette[1]))
  layers.push(...withIllustration(context, [], width * 0.82, height * 0.26, Math.min(width, height) * 0.2))
  layers.push(text('menu-brand', 'THE TABLE', margin, height * 0.13, width * 0.52, width * 0.02, context.palette[1], 'Avenir Next', { charSpacing: 140, fontWeight: 'bold' }))
  layers.push(title(context, margin, height * 0.23, width * 0.55, width * 0.058, context.palette[3]))
  for (let item = 0; item < 4; item += 1) {
    const y = height * (0.48 + item * 0.1)
    layers.push(text(`menu-item-${item}`, ['SEASONAL PLATE', 'GARDEN LUNCH', 'HOUSE SPECIAL', 'SOMETHING SWEET'][item], margin, y, width * 0.38, width * 0.015, context.palette[3], 'Avenir Next', { fontWeight: 'bold' }))
    layers.push(line(`menu-rule-${item}`, margin, y + width * 0.04, width * 0.56, y + width * 0.04, '#b8a98f', 1))
  }
  return layers
}

function timeline(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#172735')
  layers.push(label(context, margin, height * 0.12, width - margin * 2, context.palette[2], 'EDIT / CUT / COLOR'))
  layers.push(title(context, margin, height * 0.21, width * 0.68, width * 0.064, '#ffffff'))
  const laneLeft = margin
  const laneWidth = width - margin * 2
  for (let track = 0; track < 4; track += 1) {
    const y = height * (0.52 + track * 0.09)
    layers.push(text(`timeline-track-label-${track}`, ['VIDEO 1', 'VIDEO 2', 'SOUND', 'TITLES'][track], laneLeft, y - width * 0.022, width * 0.18, width * 0.013, '#d7e5df', 'Avenir Next', { fontWeight: 'bold', charSpacing: 45 }))
    layers.push(rect(`timeline-lane-${track}`, laneLeft, y, laneWidth, height * 0.055, '#263c4b', { rx: 4, ry: 4 }))
    for (let block = 0; block < 3; block += 1) {
      const x = laneLeft + laneWidth * (0.06 + block * 0.3 + (track % 2) * 0.04)
      layers.push(rect(`timeline-clip-${track}-${block}`, x, y + 4, laneWidth * (0.2 + (block % 2) * 0.06), height * 0.055 - 8,
        track === 2 ? context.palette[2] : track === 3 ? '#bb6f75' : context.palette[1], { rx: 3, ry: 3 }))
    }
  }
  layers.push(line('timeline-playhead', width * 0.57, height * 0.45, width * 0.57, height * 0.91, '#f3c864', 3))
  return layers
}

function worksheetFrame(context: DesignRecipeContext): DesignNode[] {
  const { width, height } = box(context)
  const layers = base(context, '#fffdf7')
  layers.push(rect('worksheet-frame-accent', 0, 0, width * 0.12, height, context.palette[1]))
  layers.push(label(context, width * 0.19, height * 0.12, width * 0.72, context.palette[1], 'LEARN / PRACTICE / SHARE'))
  layers.push(title(context, width * 0.19, height * 0.21, width * 0.7, width * 0.054, context.palette[3]))
  layers.push(copy(context, width * 0.19, height * 0.34, width * 0.68, context.palette[3]))
  for (let question = 0; question < 4; question += 1) {
    const y = height * (0.49 + question * 0.105)
    layers.push(circle(`worksheet-choice-${question}`, width * 0.22, y + width * 0.008, width * 0.014, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: 2 }))
    layers.push(text(`worksheet-question-${question}`, `${question + 1}.  Write your answer here`, width * 0.27, y, width * 0.62, width * 0.016, context.palette[3], 'Avenir Next'))
    layers.push(line(`worksheet-answer-${question}`, width * 0.27, y + width * 0.045, width * 0.88, y + width * 0.045, '#c8d2ca', 1))
  }
  return layers
}

function architectureElevation(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#e9eeeb')
  layers.push(label(context, margin, margin * 0.7, width - margin * 2, context.palette[1], 'STUDIO / BUILT FORM'))
  layers.push(title(context, margin, height * 0.1, width - margin * 2, width * 0.052, context.palette[3]))
  const left = width * 0.18
  const top = height * 0.34
  const buildingW = width * 0.64
  const buildingH = height * 0.45
  layers.push(rect('elevation-shell', left, top, buildingW, buildingH, '#f8f6ef', { stroke: context.palette[3], strokeWidth: 3 }))
  layers.push(rect('elevation-roof', left - width * 0.04, top - height * 0.06, buildingW + width * 0.08, height * 0.06, context.palette[1]))
  for (let column = 0; column < 4; column += 1) {
    for (let row = 0; row < 3; row += 1) {
      const wx = left + buildingW * (0.07 + column * 0.23)
      const wy = top + buildingH * (0.1 + row * 0.28)
      layers.push(rect(`elevation-window-${row}-${column}`, wx, wy, buildingW * 0.12, buildingH * 0.18, context.palette[2], { stroke: context.palette[3], strokeWidth: 1.5 }))
    }
  }
  layers.push(rect('elevation-door', width * 0.46, top + buildingH * 0.64, width * 0.12, buildingH * 0.36, context.palette[1]))
  layers.push(line('elevation-dimension', left, top + buildingH + height * 0.05, left + buildingW, top + buildingH + height * 0.05, context.palette[1], 2))
  layers.push(text('elevation-note', 'NORTH ELEVATION   /   1:100', left, top + buildingH + height * 0.065, buildingW, width * 0.013, context.palette[3], 'Avenir Next', { charSpacing: 55 }))
  return layers
}

function dashboard(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#f0f3f0')
  layers.push(rect('dashboard-nav', 0, 0, width, height * 0.14, context.palette[3]))
  layers.push(text('dashboard-brand', context.subcategory.toUpperCase(), margin, height * 0.05, width * 0.65, width * 0.023, '#ffffff', 'Avenir Next', { fontWeight: 'bold', charSpacing: 50 }))
  layers.push(label(context, margin, height * 0.2, width - margin * 2, context.palette[1], 'QUARTERLY BUSINESS REVIEW'))
  layers.push(title(context, margin, height * 0.27, width - margin * 2, width * 0.057, context.palette[3]))
  const widgets = [
    { x: margin, w: width * 0.25, label: 'REVENUE', value: '$42.8K', color: context.palette[1] },
    { x: width * 0.37, w: width * 0.25, label: 'GROWTH', value: '+18.4%', color: context.palette[2] },
    { x: width * 0.66, w: width * 0.25, label: 'REACH', value: '12.6K', color: context.palette[1] },
  ]
  widgets.forEach((widget, index) => {
    layers.push(rect(`dashboard-widget-${index}`, widget.x, height * 0.42, widget.w, height * 0.2, '#ffffff', { stroke: '#d7dfd8', strokeWidth: 1 }))
    layers.push(text(`dashboard-widget-label-${index}`, widget.label, widget.x + width * 0.02, height * 0.45, widget.w * 0.9, width * 0.013, widget.color, 'Avenir Next', { charSpacing: 65, fontWeight: 'bold' }))
    layers.push(text(`dashboard-widget-value-${index}`, widget.value, widget.x + width * 0.02, height * 0.5, widget.w * 0.9, width * 0.04, context.palette[3], 'Georgia'))
  })
  layers.push(line('dashboard-chart-baseline', margin, height * 0.81, width - margin, height * 0.81, context.palette[3], 2))
  for (let tick = 0; tick < 7; tick += 1) {
    const x = margin + (width - margin * 2) * (tick / 6)
    const y = height * (0.76 - [0.05, 0.11, 0.08, 0.18, 0.15, 0.24, 0.3][tick])
    if (tick > 0) {
      const previousX = margin + (width - margin * 2) * ((tick - 1) / 6)
      const previousY = height * (0.76 - [0.05, 0.11, 0.08, 0.18, 0.15, 0.24, 0.3][tick - 1])
      layers.push(line(`dashboard-chart-segment-${tick}`, previousX, previousY, x, y, context.palette[1], 4))
    }
    layers.push(circle(`dashboard-chart-point-${tick}`, x, y, width * 0.012, context.palette[2]))
  }
  return layers
}

function cardLayout(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, '#efeae0')
  layers.push(rect('business-card-paper', margin * 0.7, height * 0.2, width - margin * 1.4, height * 0.58, context.palette[0], { stroke: context.palette[1], strokeWidth: 2, rx: 5, ry: 5 }))
  layers.push(rect('business-card-stripe', margin * 0.7, height * 0.2, width * 0.17, height * 0.58, context.palette[1], { rx: 5, ry: 5 }))
  layers.push(circle('business-card-mark', margin * 1.25, height * 0.4, width * 0.04, context.palette[2]))
  layers.push(text('business-card-brand', 'ESTUDIO', width * 0.32, height * 0.34, width * 0.54, width * 0.02, context.palette[1], 'Avenir Next', { fontWeight: 'bold', charSpacing: 100 }))
  layers.push(title(context, width * 0.32, height * 0.42, width * 0.58, width * 0.045, context.palette[3]))
  layers.push(text('business-card-contact', 'NAME  /  ROLE  /  CONTACT', width * 0.32, height * 0.6, width * 0.58, width * 0.013, context.palette[3], 'Avenir Next', { charSpacing: 55 }))
  layers.push(line('business-card-baseline', width * 0.32, height * 0.68, width * 0.88, height * 0.68, context.palette[2], 2))
  return layers
}

function occasionLayout(context: DesignRecipeContext): DesignNode[] {
  const { width, height, margin } = box(context)
  const layers = base(context, context.occasion === 'Halloween' ? '#171a25' : context.palette[0])
  const centerX = width * 0.5
  const centerY = height * 0.48
  const size = Math.min(width, height) * 0.34
  if (context.layoutId === 'diwali-lights') {
    layers.push(rect('diwali-night-band', 0, 0, width, height * 0.28, '#271d38'))
    for (let light = 0; light < 9; light += 1) {
      const x = width * (0.08 + light * 0.105)
      layers.push(line(`diwali-light-string-${light}`, x, 0, x, height * (0.09 + (light % 3) * 0.018), context.palette[2], 1.5))
      layers.push(circle(`diwali-bulb-${light}`, x, height * (0.1 + (light % 3) * 0.018), width * 0.009, light % 2 ? '#ff9a4c' : '#ffe08b'))
    }
    layers.push(...diyaMotif(context, centerX, centerY + height * 0.04, size * 0.9))
    for (let rangoli = 0; rangoli < 12; rangoli += 1) {
      const angle = rangoli * Math.PI / 6
      layers.push(ellipse(`diwali-rangoli-petal-${rangoli}`, centerX + Math.cos(angle) * size * 0.51, centerY + size * 0.4 + Math.sin(angle) * size * 0.27, size * 0.055, size * 0.12, rangoli % 2 ? context.palette[2] : context.palette[1], { angle: rangoli * 30 }))
    }
    layers.push(rect('diwali-gold-frame', margin * 0.45, height * 0.31, width - margin * 0.9, height * 0.55, 'rgba(0,0,0,0)', { stroke: '#d9af5d', strokeWidth: 3 }))
    layers.push(label(context, margin * 1.2, height * 0.16, width - margin * 2.4, '#f4c864'))
    layers.push(title(context, margin * 1.2, height * 0.67, width - margin * 2.4, width * 0.053, '#fff5df', { textAlign: 'center' }))
  } else if (context.layoutId === 'holi-splashes') {
    layers.push(polygon('holi-color-field-left', 0, height * 0.12, width * 0.7, height * 0.65, [[0, 0], [0.72, 0.18], [1, 0.68], [0.2, 1]], '#e64162', { opacity: 0.88 }))
    layers.push(polygon('holi-color-field-right', width * 0.38, height * 0.06, width * 0.62, height * 0.72, [[0.12, 0], [1, 0.24], [0.78, 1], [0, 0.8]], '#188e83', { opacity: 0.82 }))
    layers.push(...motifLayers(context, width * 0.72, height * 0.31, size * 0.68))
    for (let splash = 0; splash < 20; splash += 1) {
      const x = width * (0.1 + ((splash * 37) % 77) / 100)
      const y = height * (0.12 + ((splash * 19) % 55) / 100)
      layers.push(circle(`holi-splash-speck-${splash}`, x, y, width * (0.009 + (splash % 3) * 0.004), splash % 2 ? context.palette[1] : context.palette[2], { opacity: 0.85 }))
    }
    layers.push(text('holi-display-word', 'PLAY\nIN COLOR', margin, height * 0.56, width * 0.62, width * 0.078, context.palette[3], 'Avenir Next', { fontWeight: 'bold', lineHeight: 0.84 }))
    layers.push(copy(context, margin, height * 0.82, width * 0.58, context.palette[3]))
  } else if (context.layoutId === 'halloween-night') {
    layers.push(circle('halloween-moon', width * 0.78, height * 0.2, Math.min(width, height) * 0.14, '#f3d37e'))
    layers.push(circle('halloween-moon-shadow', width * 0.83, height * 0.16, Math.min(width, height) * 0.13, '#171a25'))
    layers.push(polygon('halloween-night-hill', 0, height * 0.58, width, height * 0.42, [[0, 0.48], [0.25, 0.18], [0.48, 0.42], [0.75, 0.12], [1, 0.36], [1, 1], [0, 1]], '#332b40'))
    layers.push(...pumpkinMotif(context, width * 0.72, height * 0.75, size * 0.72))
    layers.push(...Array.from({ length: 4 }, (_, bat) => polygon(`halloween-bat-${bat}`, width * (0.12 + bat * 0.13), height * (0.19 + (bat % 2) * 0.07), width * 0.08, height * 0.04, [[0, 0.5], [0.25, 0.2], [0.5, 0.55], [0.75, 0.2], [1, 0.5], [0.72, 1], [0.5, 0.65], [0.28, 1]], '#10131d')))
    layers.push(label(context, margin, height * 0.39, width * 0.68, '#f4bd63', 'OCTOBER / AFTER DARK'))
    layers.push(text('halloween-title', 'NIGHT\nOF FRIGHT', margin, height * 0.48, width * 0.64, width * 0.078, '#fff1db', 'Georgia', { fontWeight: 'bold', lineHeight: 0.83 }))
    layers.push(copy(context, margin, height * 0.78, width * 0.53, '#fff1db'))
  } else if (context.layoutId === 'christmas-tree') {
    layers.push(rect('christmas-red-ribbon', 0, height * 0.82, width, height * 0.18, '#b64243'))
    layers.push(...treeMotif(context, width * 0.5, height * 0.29, Math.min(width, height) * 0.43))
    for (let snow = 0; snow < 11; snow += 1) {
      const x = width * (0.08 + ((snow * 29) % 83) / 100)
      const y = height * (0.08 + ((snow * 17) % 46) / 100)
      layers.push(circle(`christmas-snow-${snow}`, x, y, width * 0.008, '#ffffff', { opacity: 0.82 }))
    }
    layers.push(text('christmas-caption', 'SEASON OF', margin, height * 0.63, width - margin * 2, width * 0.025, context.palette[3], 'Avenir Next', { textAlign: 'center', charSpacing: 120, fontWeight: 'bold' }))
    layers.push(title(context, margin, height * 0.69, width - margin * 2, width * 0.051, context.palette[3], { textAlign: 'center', fontWeight: 'normal' }))
    layers.push(copy(context, margin, height * 0.86, width - margin * 2, '#fffaf0'))
  } else if (context.layoutId === 'eid-arch') {
    layers.push(rect('eid-arch-field', width * 0.14, height * 0.1, width * 0.72, height * 0.78, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: 3 }))
    layers.push(ellipse('eid-arch-round', width * 0.5, height * 0.25, width * 0.36, width * 0.36, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: 3 }))
    layers.push(...crescentMotif(context, width * 0.65, height * 0.29, size * 0.66))
    for (let tile = 0; tile < 8; tile += 1) {
      const x = width * (0.2 + tile * 0.085)
      layers.push(polygon(`eid-arch-tile-${tile}`, x, height * 0.11, width * 0.04, height * 0.045, [[0.5, 0], [1, 0.5], [0.5, 1], [0, 0.5]], context.palette[2]))
    }
    layers.push(label(context, margin * 1.4, height * 0.53, width - margin * 2.8, context.palette[2], 'A TIME TO GATHER'))
    layers.push(title(context, margin * 1.4, height * 0.63, width - margin * 2.8, width * 0.062, context.palette[3], { textAlign: 'center', fontWeight: 'normal' }))
    layers.push(copy(context, margin * 1.6, height * 0.78, width - margin * 3.2, context.palette[3]))
  } else if (context.layoutId === 'independence-poster') {
    layers.push(rect('patriotic-saffron-band', 0, 0, width, height * 0.22, '#e77835'))
    layers.push(rect('patriotic-green-band', 0, height * 0.78, width, height * 0.22, '#39846e'))
    layers.push(...flagMotif(context, width * 0.25, height * 0.34, width * 0.5, height * 0.27))
    layers.push(label(context, margin, height * 0.65, width - margin * 2, '#294f7d', 'INDIA / 15 AUGUST'))
    layers.push(title(context, margin, height * 0.7, width - margin * 2, width * 0.052, '#1e3547', { textAlign: 'center' }))
    layers.push(copy(context, margin, height * 0.88, width - margin * 2, '#fffaf0'))
  } else if (context.layoutId === 'valentine-hearts') {
    for (let heart = 0; heart < 7; heart += 1) {
      const x = width * (0.18 + heart * 0.1)
      const y = height * (0.18 + (heart % 2) * 0.1)
      const heartContext = { ...context, motif: 'heart' }
      layers.push(...motifLayers(heartContext, x, y, Math.min(width, height) * (heart === 3 ? 0.22 : 0.11)))
    }
    layers.push(rect('valentine-paper-card', width * 0.1, height * 0.47, width * 0.8, height * 0.4, '#fff6f1', { stroke: '#d7a09d', strokeWidth: 2 }))
    layers.push(label(context, margin, height * 0.55, width - margin * 2, context.palette[1], 'A NOTE FOR YOU'))
    layers.push(title(context, margin, height * 0.63, width - margin * 2, width * 0.056, context.palette[3], { textAlign: 'center', fontWeight: 'normal' }))
    layers.push(copy(context, margin * 1.4, height * 0.78, width - margin * 2.8, context.palette[3]))
  } else if (context.layoutId === 'new-year-type') {
    layers.push(...motifLayers(context, width * 0.5, height * 0.28, Math.min(width, height) * 0.34))
    layers.push(text('new-year-pretitle', 'WELCOME TO', margin, height * 0.54, width - margin * 2, width * 0.023, context.palette[2], 'Avenir Next', { textAlign: 'center', charSpacing: 170, fontWeight: 'bold' }))
    layers.push(text('new-year-number', '2027', margin, height * 0.6, width - margin * 2, width * 0.16, context.palette[1], 'Georgia', { textAlign: 'center', fontWeight: 'bold' }))
    layers.push(copy(context, margin * 1.3, height * 0.83, width - margin * 2.6, context.palette[3], 'A fresh chapter. A brighter horizon.'))
  } else if (context.layoutId === 'rakhi-center') {
    layers.push(rect('rakhi-ribbon', 0, height * 0.28, width, height * 0.12, context.palette[1]))
    layers.push(...motifLayers(context, width * 0.5, height * 0.49, Math.min(width, height) * 0.34))
    layers.push(label(context, margin, height * 0.13, width - margin * 2, context.palette[1], 'A THREAD THAT BINDS'))
    layers.push(title(context, margin, height * 0.72, width - margin * 2, width * 0.054, context.palette[3], { textAlign: 'center' }))
    layers.push(copy(context, margin * 1.4, height * 0.84, width - margin * 2.8, context.palette[3]))
  } else if (context.layoutId === 'navratri-mandala') {
    layers.push(rect('navratri-night-panel', 0, height * 0.68, width, height * 0.32, context.palette[3]))
    layers.push(...motifLayers(context, width * 0.5, height * 0.45, Math.min(width, height) * 0.36))
    layers.push(label(context, margin, height * 0.1, width - margin * 2, context.palette[1], 'NINE NIGHTS / ONE RHYTHM'))
    layers.push(title(context, margin, height * 0.73, width - margin * 2, width * 0.052, '#fff5e8', { textAlign: 'center' }))
    layers.push(copy(context, margin, height * 0.88, width - margin * 2, '#fff5e8'))
  } else if (context.layoutId === 'dussehra-bow') {
    layers.push(polygon('dussehra-banner', 0, 0, width, height * 0.24, [[0, 0], [1, 0], [0.92, 1], [0.08, 1]], context.palette[1]))
    layers.push(...motifLayers(context, width * 0.68, height * 0.55, Math.min(width, height) * 0.32))
    layers.push(label(context, margin, height * 0.07, width - margin * 2, '#fff5e8', 'THE VICTORY OF LIGHT'))
    layers.push(title(context, margin, height * 0.34, width * 0.52, width * 0.058, context.palette[3]))
    layers.push(copy(context, margin, height * 0.64, width * 0.45, context.palette[3]))
    layers.push(line('dussehra-arrow', width * 0.23, height * 0.83, width * 0.74, height * 0.83, context.palette[2], 4))
    layers.push(polygon('dussehra-arrowhead', width * 0.72, height * 0.8, width * 0.055, height * 0.06, [[0, 0], [1, 0.5], [0, 1]], context.palette[2]))
  } else if (context.layoutId === 'ganesh-modak') {
    layers.push(ellipse('ganesh-arch', width * 0.5, height * 0.52, width * 0.35, height * 0.4, 'rgba(0,0,0,0)', { stroke: context.palette[2], strokeWidth: 3 }))
    layers.push(...motifLayers(context, width * 0.5, height * 0.47, Math.min(width, height) * 0.3))
    layers.push(label(context, margin, height * 0.13, width - margin * 2, context.palette[1], 'WELCOME WITH JOY'))
    layers.push(title(context, margin, height * 0.75, width - margin * 2, width * 0.05, context.palette[3], { textAlign: 'center' }))
    layers.push(copy(context, margin * 1.3, height * 0.88, width - margin * 2.6, context.palette[3]))
  } else if (context.layoutId === 'janmashtami-flute') {
    layers.push(rect('janmashtami-skyline', 0, height * 0.68, width, height * 0.32, '#17345a'))
    layers.push(...motifLayers(context, width * 0.58, height * 0.42, Math.min(width, height) * 0.3))
    layers.push(label(context, margin, height * 0.13, width - margin * 2, context.palette[1], 'A NIGHT OF DEVOTION'))
    layers.push(title(context, margin, height * 0.72, width - margin * 2, width * 0.053, '#fff7df', { textAlign: 'center' }))
    layers.push(copy(context, margin, height * 0.87, width - margin * 2, '#fff7df'))
  } else if (context.layoutId === 'sankranti-kites') {
    layers.push(rect('sankranti-sky', 0, 0, width, height * 0.76, '#eaf5f5'))
    for (let kite = 0; kite < 4; kite += 1) {
      const x = width * (0.18 + kite * 0.2)
      const y = height * (0.25 + (kite % 2) * 0.2)
      layers.push(...kiteMotif(context, x, y, Math.min(width, height) * (kite === 1 ? 0.18 : 0.12)))
    }
    layers.push(rect('sankranti-ground', 0, height * 0.77, width, height * 0.23, context.palette[3]))
    layers.push(label(context, margin, height * 0.82, width - margin * 2, context.palette[2], 'UP ABOVE / TOGETHER'))
    layers.push(title(context, margin, height * 0.88, width - margin * 2, width * 0.047, '#fffaf0', { textAlign: 'center' }))
  } else if (context.layoutId === 'lohri-bonfire') {
    layers.push(rect('lohri-night', 0, 0, width, height, '#30253d'))
    for (let ember = 0; ember < 15; ember += 1) {
      const x = width * (0.08 + ((ember * 31) % 82) / 100)
      const y = height * (0.12 + ((ember * 17) % 64) / 100)
      layers.push(circle(`lohri-ember-${ember}`, x, y, width * 0.006, ember % 2 ? '#f0b858' : '#f18447'))
    }
    layers.push(...motifLayers(context, width * 0.5, height * 0.56, Math.min(width, height) * 0.34))
    layers.push(label(context, margin, height * 0.13, width - margin * 2, '#f0c767', 'WARMTH / MUSIC / COMMUNITY'))
    layers.push(title(context, margin, height * 0.79, width - margin * 2, width * 0.049, '#fff0d6', { textAlign: 'center' }))
  } else if (context.layoutId === 'baisakhi-wheat') {
    layers.push(rect('baisakhi-saffron-panel', 0, 0, width * 0.28, height, '#c84235'))
    layers.push(...motifLayers(context, width * 0.7, height * 0.45, Math.min(width, height) * 0.34))
    layers.push(label(context, width * 0.36, height * 0.19, width * 0.54, context.palette[1], 'HARVEST / NEW BEGINNINGS'))
    layers.push(title(context, width * 0.36, height * 0.34, width * 0.55, width * 0.055, context.palette[3]))
    layers.push(copy(context, width * 0.36, height * 0.65, width * 0.5, context.palette[3]))
  } else if (context.layoutId === 'thanksgiving-harvest') {
    layers.push(rect('thanksgiving-table', 0, height * 0.68, width, height * 0.32, '#674336'))
    layers.push(ellipse('thanksgiving-platter', width * 0.5, height * 0.61, width * 0.34, height * 0.13, '#d6bb8c'))
    layers.push(...motifLayers(context, width * 0.5, height * 0.53, Math.min(width, height) * 0.25))
    layers.push(label(context, margin, height * 0.12, width - margin * 2, context.palette[1], 'GATHER AROUND'))
    layers.push(title(context, margin, height * 0.22, width * 0.62, width * 0.06, context.palette[3]))
    layers.push(copy(context, margin, height * 0.38, width * 0.45, context.palette[3]))
  } else if (context.layoutId === 'easter-eggs') {
    layers.push(rect('easter-sky', 0, 0, width, height * 0.7, '#f6f1e5'))
    layers.push(polygon('easter-grass', 0, height * 0.67, width, height * 0.33, [[0, 0.35], [0.2, 0.1], [0.44, 0.38], [0.7, 0.08], [1, 0.3], [1, 1], [0, 1]], '#8aaa7b'))
    layers.push(...motifLayers(context, width * 0.55, height * 0.52, Math.min(width, height) * 0.3))
    layers.push(label(context, margin, height * 0.13, width - margin * 2, context.palette[1], 'A LITTLE SPRING JOY'))
    layers.push(title(context, margin, height * 0.25, width * 0.5, width * 0.057, context.palette[3]))
    layers.push(copy(context, margin, height * 0.42, width * 0.45, context.palette[3]))
  } else if (context.layoutId === 'mothers-flowers') {
    layers.push(rect('mothers-card', width * 0.1, height * 0.16, width * 0.8, height * 0.68, '#fffaf3', { stroke: '#d9b8a6', strokeWidth: 2 }))
    layers.push(...floralMotif(context, width * 0.5, height * 0.33, Math.min(width, height) * 0.15, 'mothers-bouquet'))
    layers.push(label(context, margin * 1.5, height * 0.52, width - margin * 3, context.palette[1], 'FOR EVERYTHING YOU ARE'))
    layers.push(title(context, margin * 1.5, height * 0.62, width - margin * 3, width * 0.055, context.palette[3], { textAlign: 'center', fontWeight: 'normal' }))
    layers.push(copy(context, margin * 1.7, height * 0.76, width - margin * 3.4, context.palette[3]))
  } else if (context.layoutId === 'fathers-tie') {
    layers.push(rect('fathers-side-panel', width * 0.64, 0, width * 0.36, height, context.palette[1]))
    layers.push(...motifLayers(context, width * 0.82, height * 0.47, Math.min(width, height) * 0.26))
    layers.push(label(context, margin, height * 0.22, width * 0.52, context.palette[1], 'A NOTE FOR DAD'))
    layers.push(title(context, margin, height * 0.36, width * 0.55, width * 0.061, context.palette[3]))
    layers.push(copy(context, margin, height * 0.63, width * 0.48, context.palette[3]))
  } else if (context.layoutId === 'womens-flower') {
    layers.push(...floralMotif(context, width * 0.78, height * 0.25, Math.min(width, height) * 0.18, 'womens-flower-large'))
    layers.push(...floralMotif(context, width * 0.68, height * 0.63, Math.min(width, height) * 0.12, 'womens-flower-small'))
    layers.push(polygon('womens-color-plane', 0, height * 0.16, width * 0.58, height * 0.56, [[0, 0], [0.84, 0.05], [1, 1], [0, 0.8]], context.palette[1]))
    layers.push(label(context, margin, height * 0.27, width * 0.48, context.palette[2], 'CELEBRATE HER'))
    layers.push(title(context, margin, height * 0.38, width * 0.5, width * 0.059, '#fffaf0'))
    layers.push(copy(context, margin, height * 0.61, width * 0.45, '#fffaf0'))
  } else if (context.layoutId === 'earth-globe') {
    layers.push(rect('earth-ocean-field', 0, 0, width, height, '#193d48'))
    layers.push(circle('earth-orbit', width * 0.72, height * 0.45, Math.min(width, height) * 0.31, 'rgba(0,0,0,0)', { stroke: '#8bb6a0', strokeWidth: 2 }))
    layers.push(...motifLayers(context, width * 0.7, height * 0.45, Math.min(width, height) * 0.53))
    layers.push(label(context, margin, height * 0.24, width * 0.44, '#a9d8bd', 'ONE PLANET'))
    layers.push(title(context, margin, height * 0.36, width * 0.48, width * 0.06, '#f4f0e2'))
    layers.push(copy(context, margin, height * 0.61, width * 0.42, '#f4f0e2'))
  } else if (context.layoutId === 'republic-wheel') {
    layers.push(rect('republic-saffron', 0, 0, width, height * 0.33, '#e77835'))
    layers.push(rect('republic-white', 0, height * 0.33, width, height * 0.34, '#fffaf0'))
    layers.push(rect('republic-green', 0, height * 0.67, width, height * 0.33, '#39846e'))
    layers.push(...motifLayers(context, width * 0.5, height * 0.48, Math.min(width, height) * 0.24))
    layers.push(rect('republic-title-panel', width * 0.12, height * 0.73, width * 0.76, height * 0.19, '#fffaf0', { opacity: 0.95 }))
    layers.push(label(context, margin, height * 0.75, width - margin * 2, '#294f7d', '26 JANUARY / INDIA'))
    layers.push(title(context, margin, height * 0.81, width - margin * 2, width * 0.042, '#1e3547', { textAlign: 'center' }))
  } else if (context.layoutId === 'constitution-book') {
    layers.push(rect('constitution-paper', width * 0.11, height * 0.13, width * 0.78, height * 0.74, '#f8f4eb', { stroke: context.palette[2], strokeWidth: 2 }))
    layers.push(...motifLayers(context, width * 0.5, height * 0.36, Math.min(width, height) * 0.19))
    layers.push(label(context, width * 0.18, height * 0.55, width * 0.64, context.palette[1], 'THE VALUES THAT UNITE US'))
    layers.push(title(context, width * 0.18, height * 0.65, width * 0.64, width * 0.05, context.palette[3], { textAlign: 'center' }))
    layers.push(copy(context, width * 0.2, height * 0.78, width * 0.6, context.palette[3]))
  } else if (context.layoutId === 'memorial-poppy') {
    layers.push(rect('memorial-slate', 0, 0, width, height, '#e9e6de'))
    layers.push(...floralMotif(context, width * 0.72, height * 0.38, Math.min(width, height) * 0.27, 'memorial-poppy'))
    layers.push(line('memorial-stem', width * 0.72, height * 0.55, width * 0.72, height * 0.82, '#48644f', 5))
    layers.push(label(context, margin, height * 0.23, width * 0.5, context.palette[1], 'IN HONOR'))
    layers.push(title(context, margin, height * 0.35, width * 0.53, width * 0.058, context.palette[3]))
    layers.push(copy(context, margin, height * 0.64, width * 0.45, context.palette[3]))
  } else if (context.layoutId === 'veterans-star') {
    layers.push(rect('veterans-blue-field', 0, 0, width * 0.62, height, '#324e69'))
    layers.push(...motifLayers(context, width * 0.79, height * 0.43, Math.min(width, height) * 0.3))
    layers.push(label(context, margin, height * 0.23, width * 0.48, '#f1f0e8', 'WITH GRATITUDE'))
    layers.push(title(context, margin, height * 0.36, width * 0.48, width * 0.056, '#ffffff'))
    layers.push(copy(context, margin, height * 0.64, width * 0.45, '#ffffff'))
  } else if (context.layoutId === 'national-flag') {
    layers.push(rect('national-celebration-header', 0, 0, width, height * 0.2, context.palette[1]))
    layers.push(label(context, margin, height * 0.07, width - margin * 2, '#ffffff', context.region ?? 'NATIONAL CELEBRATION'))
    layers.push(...motifLayers(context, width * 0.5, height * 0.53, Math.min(width, height) * 0.3))
    layers.push(title(context, margin, height * 0.78, width - margin * 2, width * 0.05, context.palette[3], { textAlign: 'center' }))
    layers.push(copy(context, margin, height * 0.9, width - margin * 2, context.palette[3]))
  } else {
    layers.push(...withIllustration(context, [], centerX, height * 0.4, size * 0.86))
    layers.push(label(context, margin, height * 0.15, width - margin * 2))
    layers.push(title(context, margin, height * 0.61, width - margin * 2, width * 0.054, context.palette[3], { textAlign: 'center' }))
    layers.push(copy(context, margin * 1.3, height * 0.77, width - margin * 2.6, context.palette[3]))
  }
  return layers
}

const layoutBuilders: Record<string, LayoutBuilder> = {
  'photo-full-bleed': fullBleedPhoto,
  'split-screen': splitScreen,
  'editorial-magazine': magazine,
  'asymmetrical': asymmetrical,
  'geometric-composition': geometric,
  'grid-composition': gridLayout,
  'collage-composition': collage,
  'typography-focus': typeFocus,
  'central-illustration': centralIllustration,
  'decorative-frame': decorativeFrame,
  'diagonal-poster': diagonal,
  'layered-poster': layeredPoster,
  'technical-blueprint': technicalBlueprint,
  'structured-information': structuredInfo,
  'minimalist-composition': minimalist,
  'luxury-invitation': luxuryInvitation,
  'worksheet-composition': worksheet,
  'schedule-grid': schedule,
  'certificate-frame': certificate,
  'data-poster': dataPoster,
  'restaurant-menu': menuLayout,
  'editing-timeline': timeline,
  'worksheet-frame': worksheetFrame,
  'architecture-elevation': architectureElevation,
  'business-dashboard': dashboard,
  'business-card': cardLayout,
  'occasion-poster': occasionLayout,
  ...Object.fromEntries(Object.values(OCCASION_LAYOUTS).map((layoutId) => [layoutId, occasionLayout])),
}

export function registerDesignRecipe(context: DesignRecipeContext): DesignScene {
  const id = uniqueId(context)
  const existingRecipe = DESIGN_RECIPE_REGISTRY.get(id)
  if (existingRecipe) {
    return existingRecipe.scene
  }
  const builder = layoutBuilders[context.layoutId]
  if (!builder) throw new Error(`Unknown template layout recipe: ${context.layoutId}`)
  const scene: DesignScene = {
    designId: id,
    layoutId: context.layoutId,
    width: context.width,
    height: context.height,
    background: context.palette[0],
    layers: builder(context),
  }
  DESIGN_RECIPE_REGISTRY.set(id, { ...context, scene })
  return scene
}

export function getDesignRecipe(designId: string) {
  const recipe = DESIGN_RECIPE_REGISTRY.get(designId)
  if (!recipe) throw new Error(`Template design recipe is not registered: ${designId}`)
  return recipe
}

function setSelectableObject<T extends FabricObject>(object: T, node: DesignNode) {
  object.set({
    angle: node.angle ?? 0,
    strokeWidth: object.strokeWidth ?? node.strokeWidth ?? 0,
    name: node.name,
    selectable: true,
    evented: true,
    opacity: node.opacity ?? 1,
  })
  return object
}

function serializeObject(object: FabricObject): Record<string, unknown> {
  const serialized = object.toObject(['name'] as never) as unknown as Record<string, unknown>
  serialized.objectCaching = false
  return serialized
}

function compileNode(node: DesignNode): Record<string, unknown> {
  switch (node.kind) {
    case 'rect': return serializeObject(setSelectableObject(new Rect({
      left: node.left, top: node.top, width: node.width, height: node.height,
      fill: node.fill, stroke: node.stroke, strokeWidth: node.strokeWidth,
      strokeDashArray: node.strokeDashArray, rx: node.rx, ry: node.ry, angle: node.angle,
    }), node))
    case 'circle': return serializeObject(setSelectableObject(new Circle({
      left: node.left, top: node.top, radius: node.width / 2,
      fill: node.fill, stroke: node.stroke, strokeWidth: node.strokeWidth, angle: node.angle,
    }), node))
    case 'ellipse': return serializeObject(setSelectableObject(new Ellipse({
      left: node.left, top: node.top, rx: node.width / 2, ry: node.height / 2,
      fill: node.fill, stroke: node.stroke, strokeWidth: node.strokeWidth, angle: node.angle,
    }), node))
    case 'line': {
      const dx = node.x2 - node.left
      const dy = node.y2 - node.top
      if (Math.abs(dx) < 1 || Math.abs(dy) < 1) {
        const isVertical = Math.abs(dx) <= Math.abs(dy)
        const thickness = Math.max(node.strokeWidth ?? 1, 1)
        const rect = setSelectableObject(new Rect({
          left: isVertical ? node.left - thickness / 2 : Math.min(node.left, node.x2),
          top: isVertical ? Math.min(node.top, node.y2) : node.top - thickness / 2,
          width: isVertical ? thickness : Math.abs(dx),
          height: isVertical ? Math.abs(dy) : thickness,
          fill: node.stroke ?? '#000000',
          stroke: null,
          opacity: node.opacity ?? 1,
        }), node)
        return serializeObject(rect)
      }

      const serialized = serializeObject(setSelectableObject(new Line([node.left, node.top, node.x2, node.y2], {
        stroke: node.stroke, strokeWidth: node.strokeWidth, strokeDashArray: node.strokeDashArray, opacity: node.opacity,
      }), node))
      serialized.objectCaching = false
      return serialized
    }
    case 'polygon': return serializeObject(setSelectableObject(new Polygon(node.points, {
      left: node.left, top: node.top, width: node.width, height: node.height,
      fill: node.fill, stroke: node.stroke, strokeWidth: node.strokeWidth, angle: node.angle,
    }), node))
    case 'text': return serializeObject(setSelectableObject(new Textbox(node.text, {
      left: node.left, top: node.top, width: node.width,
      fontFamily: node.fontFamily, fontSize: node.fontSize, fontWeight: node.fontWeight,
      textAlign: node.textAlign, lineHeight: node.lineHeight, charSpacing: node.charSpacing ?? 0,
      fill: node.fill, angle: node.angle,
    }), node))
    case 'three-d': return {
      type: 'EditableThreeDShape',
      version: '6.9.1',
      originX: 'center',
      originY: 'center',
      left: node.left + node.width / 2,
      top: node.top + node.height / 2,
      width: node.width,
      height: node.height,
      fill: 'rgba(0,0,0,0)',
      stroke: null,
      strokeWidth: 0,
      angle: 0,
      threeDKind: node.shape,
      threeDColor: node.color,
      threeDWidth: 1.35,
      threeDHeight: 1.35,
      threeDDepth: 1.2,
      threeDRotationX: node.rotationX,
      threeDRotationY: node.rotationY,
      threeDRotationZ: node.rotationZ,
      threeDPositionZ: 0,
      threeDRoughness: 0.28,
      threeDMetalness: 0.14,
      threeDOpacity: 1,
      threeDWireframe: false,
      threeDSegments: 32,
      name: node.name,
      selectable: true,
      evented: true,
      objectCaching: false,
    }
  }
}

export function compileSceneToFabric(scene: DesignScene) {
  return {
    version: '6.9.1',
    background: scene.background,
    objects: scene.layers.map(compileNode),
  }
}

const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const transform = (node: DesignNode) => node.angle
  ? ` transform="rotate(${node.angle} ${node.left + node.width / 2} ${node.top + node.height / 2})"`
  : ''
const opacity = (node: DesignNode) => node.opacity === undefined ? '' : ` opacity="${node.opacity}"`
const stroke = (node: DesignNode) => node.stroke && node.stroke !== 'none'
  ? ` stroke="${node.stroke}" stroke-width="${node.strokeWidth ?? 1}"`
  : ''

function renderSvgNode(node: DesignNode) {
  const rotate = transform(node)
  const alpha = opacity(node)
  switch (node.kind) {
    case 'rect': return `<rect x="${node.left}" y="${node.top}" width="${node.width}" height="${node.height}" rx="${node.rx ?? 0}" fill="${node.fill ?? 'none'}"${stroke(node)}${alpha}${rotate}/>`
    case 'circle': return `<circle cx="${node.left + node.width / 2}" cy="${node.top + node.height / 2}" r="${node.width / 2}" fill="${node.fill ?? 'none'}"${stroke(node)}${alpha}${rotate}/>`
    case 'ellipse': return `<ellipse cx="${node.left + node.width / 2}" cy="${node.top + node.height / 2}" rx="${node.width / 2}" ry="${node.height / 2}" fill="${node.fill ?? 'none'}"${stroke(node)}${alpha}${rotate}/>`
    case 'line': return `<line x1="${node.left}" y1="${node.top}" x2="${node.x2}" y2="${node.y2}" fill="none" stroke="${node.stroke ?? node.fill ?? '#000'}" stroke-width="${node.strokeWidth ?? 1}"${alpha}/>`
    case 'polygon': return `<polygon points="${node.points.map((point) => `${node.left + point.x},${node.top + point.y}`).join(' ')}" fill="${node.fill ?? 'none'}"${stroke(node)}${alpha}${rotate}/>`
    case 'text': {
      const align = node.textAlign ?? 'left'
      const x = align === 'center' ? node.left + node.width / 2 : align === 'right' ? node.left + node.width : node.left
      const anchor = align === 'center' ? 'middle' : align === 'right' ? 'end' : 'start'
      const lines = node.text.split('\n')
      const lineHeight = node.fontSize * (node.lineHeight ?? 1.05)
      const tspans = lines.map((value, index) => `<tspan x="${x}" dy="${index ? lineHeight : 0}">${escapeXml(value)}</tspan>`).join('')
      return `<text x="${x}" y="${node.top + node.fontSize}" text-anchor="${anchor}" font-family="${escapeXml(node.fontFamily)}" font-size="${node.fontSize}" font-weight="${node.fontWeight ?? 'normal'}" letter-spacing="${(node.charSpacing ?? 0) / 1000}" fill="${node.fill ?? '#000'}"${alpha}${rotate}>${tspans}</text>`
    }
    case 'three-d': {
      const x = node.left
      const y = node.top
      const side = Math.min(node.width, node.height)
      if (node.shape === 'sphere') return `<circle cx="${x + side / 2}" cy="${y + side / 2}" r="${side * 0.4}" fill="${node.color}" stroke="#ffffff" stroke-opacity=".35" stroke-width="${side * 0.025}"/><ellipse cx="${x + side / 2}" cy="${y + side / 2}" rx="${side * 0.18}" ry="${side * 0.4}" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="${side * 0.018}"/>`
      if (node.shape === 'torus') return `<ellipse cx="${x + side / 2}" cy="${y + side / 2}" rx="${side * 0.38}" ry="${side * 0.24}" fill="none" stroke="${node.color}" stroke-width="${side * 0.15}"/><ellipse cx="${x + side / 2}" cy="${y + side / 2}" rx="${side * 0.38}" ry="${side * 0.24}" fill="none" stroke="#ffffff" stroke-opacity=".4" stroke-width="${side * 0.018}"/>`
      if (node.shape === 'cone') return `<polygon points="${x + side / 2},${y + side * 0.1} ${x + side * 0.9},${y + side * 0.84} ${x + side * 0.1},${y + side * 0.84}" fill="${node.color}" stroke="#ffffff" stroke-opacity=".4" stroke-width="${side * 0.02}"/>`
      return `<polygon points="${x + side * 0.5},${y + side * 0.08} ${x + side * 0.88},${y + side * 0.28} ${x + side * 0.5},${y + side * 0.49} ${x + side * 0.12},${y + side * 0.28}" fill="${node.color}"/><polygon points="${x + side * 0.12},${y + side * 0.28} ${x + side * 0.5},${y + side * 0.49} ${x + side * 0.5},${y + side * 0.9} ${x + side * 0.12},${y + side * 0.7}" fill="#${node.color.replace('#', '')}" fill-opacity=".75"/><polygon points="${x + side * 0.5},${y + side * 0.49} ${x + side * 0.88},${y + side * 0.28} ${x + side * 0.88},${y + side * 0.7} ${x + side * 0.5},${y + side * 0.9}" fill="#ffffff" fill-opacity=".28"/>`
    }
  }
}

export function renderSceneThumbnail(scene: DesignScene) {
  const layers = scene.layers.map(renderSvgNode).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${scene.width} ${scene.height}"><rect width="${scene.width}" height="${scene.height}" fill="${scene.background}"/>${layers}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function describeSceneComposition(scene: DesignScene) {
  return scene.layers.map((node) => ({
    kind: node.kind,
    name: node.name,
    left: Math.round(node.left * 1000 / scene.width),
    top: Math.round(node.top * 1000 / scene.height),
    width: Math.round(node.width * 1000 / scene.width),
    height: Math.round(node.height * 1000 / scene.height),
    angle: node.angle ?? 0,
    fill: node.kind === 'three-d' ? node.color : node.fill ?? '',
  }))
}
