import { FabricImage, type Canvas } from 'fabric'

export const threeDShapeChoices = [
  { kind: 'sphere', label: 'Sphere', color: '#18a78b', group: 'Basic Objects' },
  { kind: 'cube', label: 'Cube', color: '#5588ee', group: 'Basic Objects' },
  { kind: 'cone', label: 'Cone', color: '#f18442', group: 'Basic Objects' },
  { kind: 'torus', label: 'Torus', color: '#eb6687', group: 'Basic Objects' },
  { kind: 'ring', label: 'Ring', color: '#d15d9b', group: 'Basic Objects' },
  { kind: 'cylinder', label: 'Cylinder', color: '#e5ad36', group: 'Basic Objects' },
  { kind: 'diamond', label: 'Diamond', color: '#8968dc', group: 'Basic Objects' },
  { kind: 'pyramid', label: 'Pyramid', color: '#d77645', group: 'Basic Objects' },
  { kind: 'hexagon', label: 'Hexagon', color: '#32a6b0', group: 'Basic Objects' },
  { kind: 'capsule', label: 'Capsule', color: '#6185d8', group: 'Basic Objects' },
  { kind: 'arrow', label: 'Arrow', color: '#ef5b42', group: 'Symbols & Icons' },
  { kind: 'heart', label: 'Heart', color: '#ec5276', group: 'Symbols & Icons' },
  { kind: 'star', label: 'Star', color: '#e5a92e', group: 'Symbols & Icons' },
  { kind: 'sparkle', label: 'Sparkle', color: '#7c67de', group: 'Symbols & Icons' },
  { kind: 'check', label: 'Check', color: '#26a780', group: 'Symbols & Icons' },
  { kind: 'lightning', label: 'Lightning', color: '#ef9d2d', group: 'Symbols & Icons' },
  { kind: 'cloud', label: 'Cloud', color: '#619bdc', group: 'Symbols & Icons' },
  { kind: 'speech', label: 'Speech bubble', color: '#29aeb3', group: 'Symbols & Icons' },
  { kind: 'plus', label: 'Plus', color: '#25a57b', group: 'Symbols & Icons' },
  { kind: 'cross', label: 'Cross', color: '#e65f59', group: 'Symbols & Icons' },
  { kind: 'play', label: 'Play', color: '#5984e6', group: 'Symbols & Icons' },
  { kind: 'flower', label: 'Flower', color: '#df679b', group: 'Symbols & Icons' },
  { kind: 'crown', label: 'Crown', color: '#dda633', group: 'Symbols & Icons' },
] as const

export type ThreeDShapeKind = (typeof threeDShapeChoices)[number]['kind']
export const threeDShapeGroups = ['Basic Objects', 'Symbols & Icons', 'Letters & Numbers', 'Emojis'] as const
export const threeDCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
export const threeDEmojiChoices = [
  { emoji: '😃', label: 'Happy', color: '#ffc928', mood: 'smile' },
  { emoji: '😍', label: 'Heart eyes', color: '#ffbf24', mood: 'heart-eyes' },
  { emoji: '😎', label: 'Cool', color: '#f7c43a', mood: 'sunglasses' },
  { emoji: '😂', label: 'Laughing', color: '#ffc928', mood: 'laugh' },
  { emoji: '😢', label: 'Crying', color: '#76c7f2', mood: 'cry' },
  { emoji: '😡', label: 'Angry', color: '#f35d50', mood: 'angry' },
  { emoji: '😮', label: 'Surprised', color: '#ffd34e', mood: 'surprised' },
  { emoji: '😜', label: 'Playful', color: '#ffcb35', mood: 'tongue' },
  { emoji: '😴', label: 'Sleepy', color: '#f1ce7b', mood: 'sleepy' },
  { emoji: '😇', label: 'Angel', color: '#ffd34e', mood: 'smile' },
  { emoji: '🤔', label: 'Thinking', color: '#f3bd55', mood: 'thinking' },
  { emoji: '🥳', label: 'Party', color: '#ffc928', mood: 'laugh' },
] as const

const previewSize = 512
const latestCharacterColorRequest = new WeakMap<FabricImage, number>()
const pendingCharacterColorUpdate = new WeakMap<FabricImage, Promise<void>>()
let nextCharacterColorRequest = 0

type ThreeModule = typeof import('three')

function extrudeShape(THREE: ThreeModule, points: [number, number][]) {
  const shape = new THREE.Shape()
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  })
  shape.closePath()
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.07,
    bevelThickness: 0.07,
  })
}

function createGeometry(THREE: ThreeModule, kind: ThreeDShapeKind): import('three').BufferGeometry {
  switch (kind) {
    case 'sphere':
      return new THREE.SphereGeometry(1, 48, 48)
    case 'cube':
      return new THREE.BoxGeometry(1.65, 1.65, 1.65)
    case 'cone':
      return new THREE.ConeGeometry(0.95, 1.8, 5)
    case 'torus':
      return new THREE.TorusGeometry(0.76, 0.3, 24, 64)
    case 'ring':
      return new THREE.TorusGeometry(0.82, 0.16, 24, 64)
    case 'cylinder':
      return new THREE.CylinderGeometry(0.72, 0.72, 1.65, 48)
    case 'diamond':
      return new THREE.OctahedronGeometry(1.05)
    case 'pyramid':
      return new THREE.ConeGeometry(1, 1.7, 4)
    case 'hexagon':
      return extrudeShape(THREE, Array.from({ length: 6 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI / 3
        return [Math.cos(angle), Math.sin(angle)]
      }))
    case 'capsule':
      return new THREE.CapsuleGeometry(0.5, 0.7, 8, 24)
    case 'arrow':
      return extrudeShape(THREE, [[-1, -0.24], [0.2, -0.24], [0.2, -0.62], [1, 0], [0.2, 0.62], [0.2, 0.24], [-1, 0.24]])
    case 'heart': {
      const shape = new THREE.Shape()
      shape.moveTo(0, -0.82)
      shape.bezierCurveTo(-0.3, -0.48, -1, 0.02, -1, 0.52)
      shape.bezierCurveTo(-1, 1.15, -0.2, 1.2, 0, 0.58)
      shape.bezierCurveTo(0.2, 1.2, 1, 1.15, 1, 0.52)
      shape.bezierCurveTo(1, 0.02, 0.3, -0.48, 0, -0.82)
      return new THREE.ExtrudeGeometry(shape, { depth: 0.38, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.07, bevelThickness: 0.07 })
    }
    case 'star':
      return extrudeShape(THREE, Array.from({ length: 10 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI / 5
        const radius = index % 2 === 0 ? 1 : 0.45
        return [Math.cos(angle) * radius, Math.sin(angle) * radius]
      }))
    case 'sparkle':
      return extrudeShape(THREE, [[0, 1], [0.16, 0.18], [0.8, 0], [0.16, -0.18], [0, -1], [-0.16, -0.18], [-0.8, 0], [-0.16, 0.18]])
    case 'check':
      return extrudeShape(THREE, [[-0.95, -0.02], [-0.63, 0.3], [-0.2, -0.12], [0.58, 0.68], [0.95, 0.31], [-0.2, -0.84]])
    case 'lightning':
      return extrudeShape(THREE, [[0.08, 1], [-0.75, -0.04], [-0.15, -0.04], [-0.38, -1], [0.78, 0.18], [0.16, 0.18]])
    case 'cloud': {
      const shape = new THREE.Shape()
      shape.moveTo(-0.78, -0.42)
      shape.bezierCurveTo(-1.28, -0.42, -1.3, 0.25, -0.8, 0.34)
      shape.bezierCurveTo(-0.72, 0.98, 0.05, 1.02, 0.25, 0.56)
      shape.bezierCurveTo(0.88, 0.82, 1.25, 0.34, 0.92, -0.04)
      shape.bezierCurveTo(1.02, -0.42, 0.62, -0.58, 0.34, -0.48)
      shape.lineTo(-0.78, -0.42)
      return new THREE.ExtrudeGeometry(shape, { depth: 0.38, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.07, bevelThickness: 0.07 })
    }
    case 'speech':
      return extrudeShape(THREE, [[-0.9, 0.68], [0.9, 0.68], [0.9, -0.42], [0.18, -0.42], [-0.34, -0.94], [-0.28, -0.42], [-0.9, -0.42]])
    case 'plus':
      return extrudeShape(THREE, [[-0.3, 1], [0.3, 1], [0.3, 0.3], [1, 0.3], [1, -0.3], [0.3, -0.3], [0.3, -1], [-0.3, -1], [-0.3, -0.3], [-1, -0.3], [-1, 0.3], [-0.3, 0.3]])
    case 'cross':
      return extrudeShape(THREE, [[-0.28, 1], [0.28, 1], [0.28, 0.28], [1, 0.28], [1, -0.28], [0.28, -0.28], [0.28, -1], [-0.28, -1], [-0.28, -0.28], [-1, -0.28], [-1, 0.28], [-0.28, 0.28]])
    case 'play':
      return extrudeShape(THREE, [[-0.65, 0.92], [0.88, 0], [-0.65, -0.92]])
    case 'flower':
      return extrudeShape(THREE, Array.from({ length: 16 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI / 8
        const radius = index % 2 === 0 ? 1 : 0.68
        return [Math.cos(angle) * radius, Math.sin(angle) * radius]
      }))
    case 'crown':
      return extrudeShape(THREE, [[-1, -0.72], [-0.72, 0.68], [-0.22, 0.12], [0, 0.82], [0.26, 0.12], [0.76, 0.68], [1, -0.72]])
  }
}

function createRenderStage(THREE: ThreeModule, cameraPosition: [number, number, number]) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100)
  camera.position.set(...cameraPosition)
  camera.lookAt(0, 0, 0)
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  renderer.setSize(previewSize, previewSize)
  renderer.setPixelRatio(1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15

  scene.add(new THREE.HemisphereLight('#ffffff', '#72809b', 2.2))
  const keyLight = new THREE.DirectionalLight('#ffffff', 3.4)
  keyLight.position.set(-3, 5, 5)
  scene.add(keyLight)
  const rimLight = new THREE.DirectionalLight('#a9d8ff', 2.1)
  rimLight.position.set(4, 2, -4)
  scene.add(rimLight)
  return { scene, camera, renderer }
}

async function renderShape(kind: ThreeDShapeKind, color: string): Promise<string> {
  const THREE = await import('three')
  const { scene, camera, renderer } = createRenderStage(THREE, [4, 3.2, 5.5])

  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.26, metalness: 0.16 })
  const mesh = new THREE.Mesh(createGeometry(THREE, kind), material)
  mesh.rotation.set(-0.16, 0.42, 0.08)
  if (!['sphere', 'cube', 'cone', 'torus', 'ring', 'cylinder', 'diamond', 'pyramid', 'capsule'].includes(kind)) {
    mesh.geometry.translate(0, 0, -0.19)
  }
  scene.add(mesh)
  renderer.render(scene, camera)
  const imageUrl = renderer.domElement.toDataURL('image/png')

  mesh.geometry.dispose()
  material.dispose()
  renderer.dispose()
  return imageUrl
}

async function addRenderedImage(canvas: Canvas, imageUrl: string, label: string, sizeMultiplier = 1, properties: Record<string, string | number> = {}) {
  const image = await FabricImage.fromURL(imageUrl)
  const size = Math.min(340, Math.max(120, Math.min(canvas.getWidth(), canvas.getHeight()) * 0.42 * sizeMultiplier))

  image.set({
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: 'center',
    originY: 'center',
    scaleX: size / previewSize,
    scaleY: size / previewSize,
    name: `3D ${label}`,
    selectable: true,
    evented: true,
    ...properties,
  })
  canvas.add(image)
  canvas.setActiveObject(image)
  canvas.requestRenderAll()
}

export async function addThreeDShape(canvas: Canvas, kind: ThreeDShapeKind, color: string, label: string) {
  await addRenderedImage(canvas, await renderShape(kind, color), label)
}

async function renderThreeDCharacter(character: string, color: string): Promise<string> {
  const THREE = await import('three')
  const { scene, camera, renderer } = createRenderStage(THREE, [3.1, 2.6, 7.5])
  const size = 512
  const font = '800 480px "Avenir Next", "Arial Black", sans-serif'
  const makeGlyphTexture = (fillStyle: string | CanvasGradient, strokeStyle?: string) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not create the 3D letter texture.')
    context.font = font
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.lineJoin = 'round'
    const measured = context.measureText(character)
    const glyphHeight = measured.actualBoundingBoxAscent + measured.actualBoundingBoxDescent
    const fontScale = Math.min(1, 488 / measured.width, 488 / glyphHeight)
    context.translate(size / 2, size / 2)
    context.scale(fontScale, fontScale)
    context.fillStyle = fillStyle
    if (strokeStyle) {
      context.strokeStyle = strokeStyle
      context.lineWidth = 2
      context.strokeText(character, 0, 0)
    }
    context.fillText(character, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    return texture
  }

  const colorValue = new THREE.Color(color)
  const faceTexture = makeGlyphTexture(color)
  const sideTexture = makeGlyphTexture('#fff')
  const planeGeometry = new THREE.PlaneGeometry(2.6, 2.6)
  const sideMaterial = new THREE.MeshBasicMaterial({ map: sideTexture, color: colorValue, transparent: true, side: THREE.DoubleSide, depthWrite: false })
  const faceMaterial = new THREE.MeshBasicMaterial({ map: faceTexture, transparent: true, side: THREE.DoubleSide, depthWrite: false })

  const group = new THREE.Group()
  for (let layer = 0; layer < 7; layer += 1) {
    const side = new THREE.Mesh(planeGeometry, sideMaterial)
    side.position.z = -0.24 + layer * 0.045
    side.renderOrder = layer
    group.add(side)
  }
  const face = new THREE.Mesh(planeGeometry, faceMaterial)
  face.position.z = 0.09
  face.renderOrder = 8
  group.add(face)
  group.rotation.set(-0.16, 0.42, 0.08)
  scene.add(group)
  renderer.render(scene, camera)
  const imageUrl = renderer.domElement.toDataURL('image/png')
  planeGeometry.dispose()
  sideMaterial.dispose()
  faceMaterial.dispose()
  sideTexture.dispose()
  faceTexture.dispose()
  renderer.dispose()
  return imageUrl
}

type ThreeDEmoji = (typeof threeDEmojiChoices)[number]

async function renderThreeDEmoji(emoji: ThreeDEmoji): Promise<string> {
  const THREE = await import('three')
  const { scene, camera, renderer } = createRenderStage(THREE, [1.4, 1.1, 7])
  const emojiCanvas = document.createElement('canvas')
  emojiCanvas.width = previewSize
  emojiCanvas.height = previewSize
  const context = emojiCanvas.getContext('2d')
  if (!context) throw new Error('Could not create the emoji texture.')
  context.font = '400 430px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  const metrics = context.measureText(emoji.emoji)
  const emojiHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  const scale = Math.min(1, 460 / metrics.width, 460 / emojiHeight)
  context.translate(previewSize / 2, previewSize / 2)
  context.scale(scale, scale)
  context.fillText(emoji.emoji, 0, 0)
  const emojiTexture = new THREE.CanvasTexture(emojiCanvas)
  emojiTexture.colorSpace = THREE.SRGBColorSpace

  const silhouetteCanvas = document.createElement('canvas')
  silhouetteCanvas.width = previewSize
  silhouetteCanvas.height = previewSize
  const silhouetteContext = silhouetteCanvas.getContext('2d')
  if (!silhouetteContext) throw new Error('Could not create the 3D emoji backing.')
  silhouetteContext.font = context.font
  silhouetteContext.textAlign = 'center'
  silhouetteContext.textBaseline = 'middle'
  silhouetteContext.translate(previewSize / 2, previewSize / 2)
  silhouetteContext.scale(scale, scale)
  silhouetteContext.fillStyle = '#fff'
  silhouetteContext.fillText(emoji.emoji, 0, 0)
  const silhouetteTexture = new THREE.CanvasTexture(silhouetteCanvas)

  const backingGeometry = new THREE.PlaneGeometry(2.5, 2.5)
  const backingMaterial = new THREE.MeshBasicMaterial({
    map: silhouetteTexture,
    color: '#b57835',
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const faceMaterial = new THREE.MeshBasicMaterial({
    map: emojiTexture,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  const group = new THREE.Group()
  for (let layer = 0; layer < 7; layer += 1) {
    const side = new THREE.Mesh(backingGeometry, backingMaterial)
    side.position.z = -0.24 + layer * 0.04
    side.renderOrder = layer
    group.add(side)
  }
  const face = new THREE.Mesh(backingGeometry, faceMaterial)
  face.position.z = 0.06
  face.renderOrder = 8
  group.add(face)
  group.rotation.set(-0.12, 0.16, 0)
  scene.add(group)
  renderer.render(scene, camera)
  const imageUrl = renderer.domElement.toDataURL('image/png')
  backingGeometry.dispose()
  backingMaterial.dispose()
  faceMaterial.dispose()
  emojiTexture.dispose()
  silhouetteTexture.dispose()
  renderer.dispose()
  return imageUrl
}

export async function addThreeDCharacter(canvas: Canvas, character: string, color = '#8968dc') {
  await addRenderedImage(canvas, await renderThreeDCharacter(character, color), character, 1.35, { threeDColor: color })
}

export async function recolorThreeDCharacter(canvas: Canvas, image: FabricImage, character: string, color: string) {
  const requestId = ++nextCharacterColorRequest
  latestCharacterColorRequest.set(image, requestId)
  const previousUpdate = pendingCharacterColorUpdate.get(image) ?? Promise.resolve()
  const update = previousUpdate.catch(() => undefined).then(async () => {
    if (latestCharacterColorRequest.get(image) !== requestId) return
    const source = await renderThreeDCharacter(character, color)
    if (latestCharacterColorRequest.get(image) !== requestId) return
    await image.setSrc(source)
    image.set('threeDColor', color)
    canvas.requestRenderAll()
    canvas.fire('object:modified', { target: image })
  })
  pendingCharacterColorUpdate.set(image, update)
  await update
}

export async function addThreeDEmoji(canvas: Canvas, emoji: ThreeDEmoji) {
  await addRenderedImage(canvas, await renderThreeDEmoji(emoji), `${emoji.label} emoji`)
}
