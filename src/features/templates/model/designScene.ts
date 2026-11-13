export type DesignNodeBase = {
  name: string
  left: number
  top: number
  width: number
  height: number
  angle?: number
  opacity?: number
  fill?: string
  stroke?: string | null
  strokeWidth?: number
  strokeDashArray?: number[]
}

export type DesignRectNode = DesignNodeBase & {
  kind: 'rect'
  rx?: number
  ry?: number
}

export type DesignCircleNode = DesignNodeBase & {
  kind: 'circle'
}

export type DesignEllipseNode = DesignNodeBase & {
  kind: 'ellipse'
}

export type DesignLineNode = DesignNodeBase & {
  kind: 'line'
  x2: number
  y2: number
}

export type DesignPolygonNode = DesignNodeBase & {
  kind: 'polygon'
  points: Array<{ x: number; y: number }>
}

export type DesignTextNode = DesignNodeBase & {
  kind: 'text'
  text: string
  fontFamily: string
  fontSize: number
  fontWeight?: string | number
  textAlign?: 'left' | 'center' | 'right'
  lineHeight?: number
  charSpacing?: number
}

export type DesignThreeDNode = DesignNodeBase & {
  kind: 'three-d'
  shape: 'cube' | 'sphere' | 'torus' | 'cone'
  color: string
  rotationX: number
  rotationY: number
  rotationZ: number
}

export type DesignNode =
  | DesignRectNode
  | DesignCircleNode
  | DesignEllipseNode
  | DesignLineNode
  | DesignPolygonNode
  | DesignTextNode
  | DesignThreeDNode

export type DesignScene = {
  designId: string
  layoutId: string
  width: number
  height: number
  background: string
  layers: DesignNode[]
}

export type DesignRecipeContext = {
  designId: string
  layoutId: string
  category: string
  subcategory: string
  style: string
  title: string
  supportingText: string
  motif: string
  palette: [string, string, string, string]
  width: number
  height: number
  occasion?: string
  region?: string
  threeDShape?: DesignThreeDNode['shape']
}