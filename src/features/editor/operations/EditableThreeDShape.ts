import { Control, FabricObject, Rect, classRegistry, type RectProps, type TPointerEvent } from 'fabric'
import type * as THREE_TYPES from 'three'
import type { ThreeDShapeKind } from '../model/types'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Rotate3d } from 'lucide-react'

type ThreeModule = typeof import('three')
type RoundedBoxGeometryType = typeof import('three/addons/geometries/RoundedBoxGeometry.js').RoundedBoxGeometry
let threeModule: ThreeModule | null = null
let roundedBoxGeometry: RoundedBoxGeometryType | null = null
let preparation: Promise<void> | null = null

export function prepareThreeDShapes() {
  if (threeModule && roundedBoxGeometry) return Promise.resolve()
  if (!preparation) {
    preparation = Promise.all([
      import('three'),
      import('three/addons/geometries/RoundedBoxGeometry.js'),
    ]).then(([three, roundedBox]) => {
      threeModule = three
      roundedBoxGeometry = roundedBox.RoundedBoxGeometry
    }).finally(() => {
      preparation = null
    })
  }
  return preparation
}

let rotate3dIconImage: HTMLImageElement | null = null
let rotate3dIconLoading = false

function getRotate3dIcon(onLoad?: () => void) {
  if (rotate3dIconImage || rotate3dIconLoading) {
    return rotate3dIconImage
  }

  rotate3dIconLoading = true

  const svg = renderToStaticMarkup(
    createElement(Rotate3d, {
      size: 24,
      color: '#ffffff',
      strokeWidth: 2.5,
    })
  )

  const image = new Image()

  image.onload = () => {
    rotate3dIconLoading = false
    rotate3dIconImage = image
    onLoad?.()
  }

  image.onerror = () => {
    rotate3dIconLoading = false
  }

  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  return null
}

function getThree() {
  if (!threeModule) throw new Error('3D shapes are still loading.')
  return threeModule
}

type EditableThreeDShapeOptions = Partial<RectProps> & {
  name?: string
  threeDKind?: ThreeDShapeKind
  threeDColor?: string
  threeDWidth?: number
  threeDHeight?: number
  threeDDepth?: number
  threeDRotationX?: number
  threeDRotationY?: number
  threeDRotationZ?: number
  threeDPositionZ?: number
  threeDRoughness?: number
  threeDMetalness?: number
  threeDOpacity?: number
  threeDWireframe?: boolean
  threeDSegments?: number
}

type RotationAxis = 'xy' | 'z'

function getClientPoint(event: TPointerEvent) {
  if ('clientX' in event) return { x: event.clientX, y: event.clientY }
  const touch = event.changedTouches[0]
  return touch ? { x: touch.clientX, y: touch.clientY } : null
}

const customProperties = [
  'threeDKind', 'threeDColor', 'threeDWidth', 'threeDHeight', 'threeDDepth',
  'threeDRotationX', 'threeDRotationY', 'threeDRotationZ', 'threeDPositionZ',
  'threeDRoughness', 'threeDMetalness', 'threeDOpacity', 'threeDWireframe', 'threeDSegments',
]
FabricObject.customProperties = Array.from(new Set([...FabricObject.customProperties, ...customProperties]))

let sharedRenderer: THREE_TYPES.WebGLRenderer | null = null
const previewResolution = 256

function getRenderer() {
  const THREE = getThree()
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
    sharedRenderer.setSize(previewResolution, previewResolution, false)
    sharedRenderer.setPixelRatio(1)
    sharedRenderer.outputColorSpace = THREE.SRGBColorSpace
    sharedRenderer.toneMapping = THREE.ACESFilmicToneMapping
    sharedRenderer.toneMappingExposure = 1.1
  }
  return sharedRenderer
}

export function createSharedThreeDScene() {
  const THREE = getThree()
  const scene = new THREE.Scene()
  scene.add(new THREE.HemisphereLight('#ffffff', '#64748b', 2.2))
  const keyLight = new THREE.DirectionalLight('#ffffff', 3.2)
  keyLight.position.set(-3, 4, 5)
  scene.add(keyLight)
  const rimLight = new THREE.DirectionalLight('#a9d8ff', 1.5)
  rimLight.position.set(4, 2, -4)
  scene.add(rimLight)
  return scene
}

export function renderSharedThreeDScene(
  context: CanvasRenderingContext2D,
  scene: THREE_TYPES.Scene,
  camera: THREE_TYPES.PerspectiveCamera,
  width: number,
  height: number,
) {
  const renderer = getRenderer()
  renderer.render(scene, camera)
  context.drawImage(renderer.domElement, -width / 2, -height / 2, width, height)
}

function createExtrusion(points: Array<[number, number]>) {
  const THREE = getThree()
  const shape = new THREE.Shape()
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.3,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.05,
    bevelThickness: 0.05,
  })
}

function createGeometry(kind: ThreeDShapeKind, segments: number): THREE_TYPES.BufferGeometry {
  const THREE = getThree()
  const detail = Math.max(3, Math.min(96, Math.round(segments)))
  switch (kind) {
    case 'sphere': return new THREE.SphereGeometry(0.72, detail, detail)
    case 'cube':
    case 'box': return new THREE.BoxGeometry(1.35, 1.35, 1.35)
    case 'roundedBox': return roundedBoxGeometry
      ? new roundedBoxGeometry(1.35, 1.35, 1.35, 4, 0.11)
      : new THREE.BoxGeometry(1.35, 1.35, 1.35)
    case 'cylinder': return new THREE.CylinderGeometry(0.65, 0.65, 1.45, detail)
    case 'cone': return new THREE.ConeGeometry(0.72, 1.45, detail)
    case 'torus': return new THREE.TorusGeometry(0.56, 0.2, 20, detail)
    case 'torusKnot': return new THREE.TorusKnotGeometry(0.48, 0.15, detail * 2, 12)
    case 'capsule': return new THREE.CapsuleGeometry(0.42, 0.62, 8, detail)
    case 'plane': return new THREE.PlaneGeometry(1.4, 1.4)
    case 'circle': return new THREE.CylinderGeometry(0.7, 0.7, 0.12, detail)
    case 'ring': return new THREE.TorusGeometry(0.58, 0.12, 16, detail)
    case 'tetrahedron': return new THREE.TetrahedronGeometry(0.82)
    case 'octahedron':
    case 'diamond': return new THREE.OctahedronGeometry(0.82)
    case 'dodecahedron': return new THREE.DodecahedronGeometry(0.82)
    case 'icosahedron': return new THREE.IcosahedronGeometry(0.82)
    case 'pyramid': return new THREE.ConeGeometry(0.82, 1.35, 4)
    case 'triangularPrism': return new THREE.CylinderGeometry(0.78, 0.78, 1.2, 3, 1)
    case 'pentagonalPrism': return new THREE.CylinderGeometry(0.76, 0.76, 1.2, 5, 1)
    case 'hexagonalPrism':
    case 'hexagon': return new THREE.CylinderGeometry(0.76, 0.76, 1.2, 6, 1)
    case 'arrow': return createExtrusion([[-1, -0.2], [0.2, -0.2], [0.2, -0.55], [1, 0], [0.2, 0.55], [0.2, 0.2], [-1, 0.2]])
    case 'heart':
    case 'heartExtrusion': {
      const shape = new THREE.Shape()
      shape.moveTo(0, -0.72)
      shape.bezierCurveTo(-0.3, -0.4, -0.9, 0.03, -0.9, 0.42)
      shape.bezierCurveTo(-0.9, 0.98, -0.2, 1.02, 0, 0.48)
      shape.bezierCurveTo(0.2, 1.02, 0.9, 0.98, 0.9, 0.42)
      shape.bezierCurveTo(0.9, 0.03, 0.3, -0.4, 0, -0.72)
      return new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.05, bevelThickness: 0.05 })
    }
    case 'star':
    case 'starExtrusion': return createExtrusion(Array.from({ length: 10 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI / 5
      const radius = index % 2 === 0 ? 0.9 : 0.42
      return [Math.cos(angle) * radius, Math.sin(angle) * radius]
    }))
    case 'sparkle': return createExtrusion([[0, 1], [0.16, 0.18], [0.8, 0], [0.16, -0.18], [0, -1], [-0.16, -0.18], [-0.8, 0], [-0.16, 0.18]])
    case 'check': return createExtrusion([[-0.95, -0.02], [-0.63, 0.3], [-0.2, -0.12], [0.58, 0.68], [0.95, 0.31], [-0.2, -0.84]])
    case 'lightning': return createExtrusion([[0.08, 1], [-0.75, -0.04], [-0.15, -0.04], [-0.38, -1], [0.78, 0.18], [0.16, 0.18]])
    case 'cloud': return createExtrusion([[-0.78, -0.42], [-0.8, 0.34], [-0.3, 0.9], [0.25, 0.56], [0.92, 0.72], [1, -0.04], [0.34, -0.48]])
    case 'speech': return createExtrusion([[-0.9, 0.68], [0.9, 0.68], [0.9, -0.42], [0.18, -0.42], [-0.34, -0.94], [-0.28, -0.42], [-0.9, -0.42]])
    case 'plus':
    case 'cross': return createExtrusion([[-0.28, 1], [0.28, 1], [0.28, 0.28], [1, 0.28], [1, -0.28], [0.28, -0.28], [0.28, -1], [-0.28, -1], [-0.28, -0.28], [-1, -0.28], [-1, 0.28], [-0.28, 0.28]])
    case 'play': return createExtrusion([[-0.65, 0.92], [0.88, 0], [-0.65, -0.92]])
    case 'flower': return createExtrusion(Array.from({ length: 16 }, (_, index) => {
      const angle = -Math.PI / 2 + index * Math.PI / 8
      const radius = index % 2 === 0 ? 1 : 0.68
      return [Math.cos(angle) * radius, Math.sin(angle) * radius]
    }))
    case 'crown': return createExtrusion([[-1, -0.72], [-0.72, 0.68], [-0.22, 0.12], [0, 0.82], [0.26, 0.12], [0.76, 0.68], [1, -0.72]])
  }
}

export class EditableThreeDShape extends Rect {
  static type = 'EditableThreeDShape'
  static cacheProperties = [...Rect.cacheProperties, ...customProperties]

  threeDKind: ThreeDShapeKind
  threeDColor: string
  threeDWidth: number
  threeDHeight: number
  threeDDepth: number
  threeDRotationX: number
  threeDRotationY: number
  threeDRotationZ: number
  threeDPositionZ: number
  threeDRoughness: number
  threeDMetalness: number
  threeDOpacity: number
  threeDWireframe: boolean
  threeDSegments: number
  private scene: THREE_TYPES.Scene | null = null
  private camera: THREE_TYPES.PerspectiveCamera | null = null
  private mesh: THREE_TYPES.Mesh | null = null
  private material: THREE_TYPES.MeshStandardMaterial | null = null
  private rotationDrag: { axis: RotationAxis; lastX: number; lastY: number } | null = null

  constructor(options: EditableThreeDShapeOptions = {}) {
    super({
      width: 220,
      height: 190,
      fill: 'rgba(0,0,0,0)',
      stroke: null,
      originX: 'center',
      originY: 'center',
      ...options,
    } as Partial<RectProps>)
    this.threeDKind = options.threeDKind ?? 'cube'
    this.threeDColor = options.threeDColor ?? '#5588ee'
    this.threeDWidth = options.threeDWidth ?? 1.35
    this.threeDHeight = options.threeDHeight ?? 1.35
    this.threeDDepth = options.threeDDepth ?? 1.2
    this.threeDRotationX = options.threeDRotationX ?? -12
    this.threeDRotationY = options.threeDRotationY ?? 28
    this.threeDRotationZ = options.threeDRotationZ ?? 4
    this.threeDPositionZ = options.threeDPositionZ ?? 0
    this.threeDRoughness = options.threeDRoughness ?? 0.3
    this.threeDMetalness = options.threeDMetalness ?? 0.12
    this.threeDOpacity = options.threeDOpacity ?? 1
    this.threeDWireframe = options.threeDWireframe ?? false
    this.threeDSegments = options.threeDSegments ?? 32
    this.controls = {
      ...this.controls,
      rotate3d: createThreeDRotationControl(
        (object): object is EditableThreeDShape => object instanceof EditableThreeDShape,
      ),
    }
    this.initializeScene()
    this.updateMesh()
  }

  private initializeScene() {
    const THREE = getThree()
    this.scene = createSharedThreeDScene()
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
  }

  rotateFromDrag(deltaX: number, deltaY: number, rotateAroundZ = false) {
  const degreesPerPixel = 0.7

  if (rotateAroundZ) {
    this.threeDRotationZ += (deltaX - deltaY) * degreesPerPixel
  } else {
    this.threeDRotationY += deltaX * degreesPerPixel
    this.threeDRotationX += deltaY * degreesPerPixel
  }

  this.updateMesh()
  this.dirty = true
}

  beginRotationDrag(event: TPointerEvent, axis: RotationAxis) {
    const point = getClientPoint(event)
    if (!point) return
    this.rotationDrag = { axis, lastX: point.x, lastY: point.y }
  }

  updateRotationDrag(event: TPointerEvent) {
  const drag = this.rotationDrag
  const point = getClientPoint(event)

  if (!drag || !point) return false

  const deltaX = point.x - drag.lastX
  const deltaY = point.y - drag.lastY

  drag.lastX = point.x
  drag.lastY = point.y

  if (!deltaX && !deltaY) return false

  const rotateAroundZ = 'shiftKey' in event && event.shiftKey === true

  this.rotateFromDrag(deltaX, deltaY, rotateAroundZ)

  this.canvas?.requestRenderAll()
  return true
}

  finishRotationDrag() {
    this.rotationDrag = null
  }

  private updateMesh() {
    const THREE = getThree()
    if (!this.scene) this.initializeScene()
    if (!this.mesh) {
      this.material ??= new THREE.MeshStandardMaterial({
          color: this.threeDColor,
          roughness: this.threeDRoughness,
          metalness: this.threeDMetalness,
          opacity: this.threeDOpacity,
          transparent: this.threeDOpacity < 1,
          wireframe: this.threeDWireframe,
          side: THREE.DoubleSide,
        })
      this.mesh = new THREE.Mesh(createGeometry(this.threeDKind, this.threeDSegments), this.material)
      this.scene?.add(this.mesh)
    }
    this.mesh.scale.set(this.threeDWidth, this.threeDHeight, this.threeDDepth)
    this.mesh.rotation.set(
      THREE.MathUtils.degToRad(this.threeDRotationX),
      THREE.MathUtils.degToRad(this.threeDRotationY),
      THREE.MathUtils.degToRad(this.threeDRotationZ),
    )
    this.mesh.position.z = this.threeDPositionZ
    this.material?.color.set(this.threeDColor)
    if (this.material) {
      this.material.roughness = this.threeDRoughness
      this.material.metalness = this.threeDMetalness
      this.material.opacity = this.threeDOpacity
      this.material.transparent = this.threeDOpacity < 1
      this.material.wireframe = this.threeDWireframe
    }
  }

  releaseThreeDResources() {
    this.mesh?.geometry.dispose()
    this.material?.dispose()
    this.mesh?.removeFromParent()
    this.mesh = null
    this.material = null
  }

  _render(context: CanvasRenderingContext2D) {
    if (!this.mesh) this.updateMesh()
    if (!this.camera || !this.scene) return
    this.camera.position.set(3.2, 2.5, 4.8)
    this.camera.lookAt(0, 0, 0)
    this.camera.updateProjectionMatrix()
    renderSharedThreeDScene(context, this.scene, this.camera, this.width, this.height)
  }

  override dispose() {
    this.releaseThreeDResources()
    super.dispose()
  }

  static async fromObject(object: Record<string, unknown>) {
    await prepareThreeDShapes()
    const properties = { ...object }
    delete properties.type
    return new EditableThreeDShape(properties as EditableThreeDShapeOptions)
  }
}

classRegistry.setClass(EditableThreeDShape)


type ThreeDRotationTarget = FabricObject & {
  beginRotationDrag: (event: TPointerEvent, axis: RotationAxis) => void
  updateRotationDrag: (event: TPointerEvent) => boolean
  finishRotationDrag: () => void
}

export function createThreeDRotationControl(
  isRotationTarget: (object: FabricObject) => object is ThreeDRotationTarget,
) {
  const radius = 21
  const iconSize = 25

  return new Control({
    x: 0,
    y: 0,
    offsetX: 0,
    offsetY: 0,
    sizeX: radius * 2 + 8,
    sizeY: radius * 2 + 8,
    actionName: 'rotate3d',
    cursorStyle: 'grab',

    mouseDownHandler(event, transform) {
      const shape = transform.target

      if (!isRotationTarget(shape)) return false

      shape.beginRotationDrag(event, 'xy')
      return true
    },

    actionHandler(event, transform) {
      const shape = transform.target

      return isRotationTarget(shape) &&
        shape.updateRotationDrag(event)
    },

    mouseUpHandler(_event, transform) {
      const shape = transform.target

      if (isRotationTarget(shape)) {
        shape.finishRotationDrag()
      }

      return false
    },

    render(ctx, left, top, _style, fabricObject) {
      ctx.save()
      ctx.translate(left, top)

      // 1. Floating glass shadow
      ctx.save()
      ctx.shadowColor = 'rgba(35, 45, 60, 0.28)'
      ctx.shadowBlur = 12
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 4

      ctx.beginPath()
      ctx.arc(0, 0, radius, 0, Math.PI * 2)

      const background = ctx.createRadialGradient(
        -7, -9, 2,
        0, 0, radius
      )

    //   background.addColorStop(0, 'rgba(255,255,255,0.98)')
    //   background.addColorStop(0.45, 'rgba(245,247,250,0.96)')
    //   background.addColorStop(0.8, 'rgba(220,224,230,0.92)')
    //   background.addColorStop(1, 'rgba(255,255,255,0.98)')

      ctx.fillStyle = background
      ctx.fill()
      ctx.restore()

      // 2. Transparent glass border
      ctx.beginPath()
      ctx.arc(0, 0, radius - 0.5, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(150, 160, 175, 0.42)'
      ctx.lineWidth = 1.2
      ctx.stroke()

      // 3. Inner glossy edge
      ctx.beginPath()
      ctx.arc(0, 0, radius - 2, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.9)'
      ctx.lineWidth = 1
      ctx.stroke()

      // 4. Top glass reflection
      ctx.save()

      ctx.beginPath()
      ctx.arc(0, 0, radius - 2, 0, Math.PI * 2)
      ctx.clip()

      const reflection = ctx.createLinearGradient(
        0, -radius,
        0, radius * 0.5
      )

      reflection.addColorStop(0, 'rgba(255,255,255,0.75)')
      reflection.addColorStop(0.4, 'rgba(255,255,255,0.18)')
      reflection.addColorStop(1, 'rgba(255,255,255,0)')

      ctx.fillStyle = reflection
      ctx.fillRect(-radius, -radius, radius * 2, radius * 2)

      ctx.restore()

      // 5. Actual Lucide Rotate3d icon
      const rotateIcon = getRotate3dIcon(() => fabricObject.canvas?.requestRenderAll())

      if (rotateIcon?.complete && rotateIcon.naturalWidth > 0) {
        ctx.save()

        // Dark extrusion shadow
        ctx.shadowColor = 'rgba(30, 40, 55, 0.4)'
        ctx.shadowBlur = 2
        ctx.shadowOffsetX = 0.8
        ctx.shadowOffsetY = 1.8

        ctx.drawImage(
          rotateIcon,
          -iconSize / 2,
          -iconSize / 2,
          iconSize,
          iconSize
        )

        ctx.restore()
      }

      // 6. Final glass highlight
      ctx.beginPath()
      ctx.ellipse(
        -6, -15,
        7, 2,
        -0.35,
        0,
        Math.PI * 2
      )

      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.fill()

      ctx.restore()
    },
  })
}

export function disposeSharedThreeDRenderer() {
  sharedRenderer?.dispose()
  sharedRenderer = null
}
