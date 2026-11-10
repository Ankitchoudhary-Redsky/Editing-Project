import { FabricImage, type Canvas } from 'fabric'
import { EditableThreeDShape } from './EditableThreeDShape'
import type { ThreeDShapeKind } from '../model/types'

export const threeDShapeChoices = [
  { kind: 'cube', label: 'Cube', color: '#5588ee', group: 'Basic Objects' },
  { kind: 'box', label: 'Box', color: '#5e9c88', group: 'Basic Objects' },
  { kind: 'sphere', label: 'Sphere', color: '#18a78b', group: 'Basic Objects' },
  { kind: 'cylinder', label: 'Cylinder', color: '#e5ad36', group: 'Basic Objects' },
  { kind: 'cone', label: 'Cone', color: '#f18442', group: 'Basic Objects' },
  { kind: 'torus', label: 'Torus', color: '#eb6687', group: 'Basic Objects' },
  { kind: 'torusKnot', label: 'Torus knot', color: '#b064ca', group: 'Basic Objects' },
  { kind: 'capsule', label: 'Capsule', color: '#6185d8', group: 'Basic Objects' },
  { kind: 'plane', label: 'Plane', color: '#4ca8b0', group: 'Basic Objects' },
  { kind: 'circle', label: 'Circle', color: '#4e9e9a', group: 'Basic Objects' },
  { kind: 'ring', label: 'Ring', color: '#d15d9b', group: 'Basic Objects' },
  { kind: 'tetrahedron', label: 'Tetrahedron', color: '#ce8050', group: 'Basic Objects' },
  { kind: 'octahedron', label: 'Octahedron', color: '#8968dc', group: 'Basic Objects' },
  { kind: 'dodecahedron', label: 'Dodecahedron', color: '#3e95b7', group: 'Basic Objects' },
  { kind: 'icosahedron', label: 'Icosahedron', color: '#c95f6e', group: 'Basic Objects' },
  { kind: 'roundedBox', label: 'Rounded box', color: '#6c9a61', group: 'Basic Objects' },
  { kind: 'pyramid', label: 'Pyramid', color: '#d77645', group: 'Advanced Shapes' },
  { kind: 'triangularPrism', label: 'Triangular prism', color: '#4787c5', group: 'Advanced Shapes' },
  { kind: 'pentagonalPrism', label: 'Pentagonal prism', color: '#ab6dce', group: 'Advanced Shapes' },
  { kind: 'hexagonalPrism', label: 'Hexagonal prism', color: '#32a6b0', group: 'Advanced Shapes' },
  { kind: 'starExtrusion', label: 'Star extrusion', color: '#e5a92e', group: 'Advanced Shapes' },
  { kind: 'heartExtrusion', label: 'Heart extrusion', color: '#ec5276', group: 'Advanced Shapes' },
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

export type { ThreeDShapeKind }
export const threeDShapeGroups = ['Basic Objects', 'Advanced Shapes', 'Symbols & Icons', 'Letters & Numbers', 'Emojis'] as const
export const threeDCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
export const threeDEmojiChoices = [
  { emoji: '😃', label: 'Happy', color: '#ffc928', mood: 'smile' },
  { emoji: '😍', label: 'Heart eyes', color: '#ffbf24', mood: 'heart-eyes' },
  { emoji: '😎', label: 'Cool', color: '#f7c43a', mood: 'sunglasses' },
  { emoji: '😂', label: 'Laughing', color: '#ffc928', mood: 'laugh' },
  { emoji: '😭', label: 'Crying', color: '#76c7f2', mood: 'loud-cry' },
  { emoji: '😢', label: 'Sad', color: '#76c7f2', mood: 'cry' },
  { emoji: '😡', label: 'Angry', color: '#f35d50', mood: 'angry' },
  { emoji: '😮', label: 'Surprised', color: '#ffd34e', mood: 'surprised' },
  { emoji: '😜', label: 'Playful', color: '#ffcb35', mood: 'tongue' },
  { emoji: '😴', label: 'Sleepy', color: '#f1ce7b', mood: 'sleepy' },
  { emoji: '😇', label: 'Angel', color: '#ffd34e', mood: 'smile' },
  { emoji: '🤔', label: 'Thinking', color: '#f3bd55', mood: 'thinking' },
  { emoji: '🥳', label: 'Party', color: '#ffc928', mood: 'laugh' },
  { emoji: '🙈', label: 'See no evil', color: '#9b5b39', mood: 'monkey' },
] as const

const threeDEmojiAssets: Record<string, string> = {
  '😃': '/emoji-3d/1f603.webp',
  '😍': '/emoji-3d/1f60d.webp',
  '😂': '/emoji-3d/1f602.webp',
  '😢': '/emoji-3d/1f622.webp',
  '😡': '/emoji-3d/1f621.webp',
  '😮': '/emoji-3d/1f62e.webp',
  '😜': '/emoji-3d/1f61c.webp',
  '😴': '/emoji-3d/1f634.webp',
  '😇': '/emoji-3d/1f607.webp',
  '🤔': '/emoji-3d/1f914.webp',
  '🥳': '/emoji-3d/1f973.webp',
  '🙈': '/emoji-3d/1f648.webp',
}

const previewSize = 512
const latestCharacterColorRequest = new WeakMap<FabricImage, number>()
const pendingCharacterColorUpdate = new WeakMap<FabricImage, Promise<void>>()
let nextCharacterColorRequest = 0

type ThreeModule = typeof import('three')

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

async function addRenderedImage(canvas: Canvas, imageUrl: string, label: string, sizeMultiplier = 1, properties: Record<string, string | number> = {}, maxSize = 340) {
  const image = await FabricImage.fromURL(imageUrl)
  const size = Math.min(maxSize, Math.max(120, Math.min(canvas.getWidth(), canvas.getHeight()) * 0.42 * sizeMultiplier))
  const imageScale = size / Math.max(image.width, image.height)

  image.set({
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: 'center',
    originY: 'center',
    scaleX: imageScale,
    scaleY: imageScale,
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
  const object = new EditableThreeDShape({
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    width: 220,
    height: 190,
    threeDKind: kind,
    threeDColor: color,
    name: `3D ${label}`,
  })
  canvas.add(object)
  canvas.setActiveObject(object)
  canvas.requestRenderAll()
}

type GlyphPoint = [number, number]

function traceGlyphContours(imageData: ImageData): GlyphPoint[][] {
  const { data, width, height } = imageData
  const vertexWidth = width + 1
  const edges: Array<{ from: number; to: number; used: boolean }> = []
  const edgesFrom = new Map<number, number[]>()
  const isFilled = (pixelX: number, pixelY: number) =>
    pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height
    && data[(pixelY * width + pixelX) * 4 + 3] >= 128
  const addEdge = (fromX: number, fromY: number, toX: number, toY: number) => {
    const from = fromY * vertexWidth + fromX
    const to = toY * vertexWidth + toX
    const edgeIndex = edges.length
    edges.push({ from, to, used: false })
    edgesFrom.set(from, [...(edgesFrom.get(from) ?? []), edgeIndex])
  }

  for (let pixelY = 0; pixelY < height; pixelY += 1) {
    for (let pixelX = 0; pixelX < width; pixelX += 1) {
      if (!isFilled(pixelX, pixelY)) continue
      if (!isFilled(pixelX, pixelY - 1)) addEdge(pixelX, pixelY, pixelX + 1, pixelY)
      if (!isFilled(pixelX + 1, pixelY)) addEdge(pixelX + 1, pixelY, pixelX + 1, pixelY + 1)
      if (!isFilled(pixelX, pixelY + 1)) addEdge(pixelX + 1, pixelY + 1, pixelX, pixelY + 1)
      if (!isFilled(pixelX - 1, pixelY)) addEdge(pixelX, pixelY + 1, pixelX, pixelY)
    }
  }

  const getDirection = (edge: { from: number; to: number }) => {
    const fromX = edge.from % vertexWidth
    const fromY = Math.floor(edge.from / vertexWidth)
    const toX = edge.to % vertexWidth
    const toY = Math.floor(edge.to / vertexWidth)
    if (toX > fromX) return 0
    if (toY > fromY) return 1
    if (toX < fromX) return 2
    return 3
  }
  const turnPriority = [1, 0, 3, 2]
  const contours: GlyphPoint[][] = []

  for (let firstEdge = 0; firstEdge < edges.length; firstEdge += 1) {
    if (edges[firstEdge].used) continue
    const startVertex = edges[firstEdge].from
    const points: GlyphPoint[] = []
    let edgeIndex = firstEdge
    let closed = false

    for (let steps = 0; steps <= edges.length; steps += 1) {
      const edge = edges[edgeIndex]
      if (edge.used) break
      edge.used = true
      points.push([edge.from % vertexWidth, Math.floor(edge.from / vertexWidth)])
      if (edge.to === startVertex) {
        closed = true
        break
      }

      const candidates = (edgesFrom.get(edge.to) ?? []).filter((candidate) => !edges[candidate].used)
      if (candidates.length === 0) break
      const currentDirection = getDirection(edge)
      candidates.sort((left, right) => {
        const leftTurn = (getDirection(edges[left]) - currentDirection + 4) % 4
        const rightTurn = (getDirection(edges[right]) - currentDirection + 4) % 4
        return turnPriority.indexOf(leftTurn) - turnPriority.indexOf(rightTurn)
      })
      edgeIndex = candidates[0]
    }

    if (closed && points.length >= 3) contours.push(points)
  }

  return contours
}

function simplifyGlyphContour(points: GlyphPoint[], tolerance: number): GlyphPoint[] {
  const ring = [...points, points[0]]
  const keptIndices = new Set([0, ring.length - 1])
  const simplifyRange = (startIndex: number, endIndex: number) => {
    const [startX, startY] = ring[startIndex]
    const [endX, endY] = ring[endIndex]
    const deltaX = endX - startX
    const deltaY = endY - startY
    const lengthSquared = deltaX * deltaX + deltaY * deltaY
    let furthestIndex = -1
    let furthestDistance = tolerance

    for (let pointIndex = startIndex + 1; pointIndex < endIndex; pointIndex += 1) {
      const [pointX, pointY] = ring[pointIndex]
      const projection = lengthSquared === 0
        ? 0
        : Math.max(0, Math.min(1, ((pointX - startX) * deltaX + (pointY - startY) * deltaY) / lengthSquared))
      const distance = Math.hypot(pointX - (startX + projection * deltaX), pointY - (startY + projection * deltaY))
      if (distance > furthestDistance) {
        furthestDistance = distance
        furthestIndex = pointIndex
      }
    }

    if (furthestIndex >= 0) {
      keptIndices.add(furthestIndex)
      simplifyRange(startIndex, furthestIndex)
      simplifyRange(furthestIndex, endIndex)
    }
  }

  simplifyRange(0, ring.length - 1)
  return [...keptIndices].sort((left, right) => left - right).slice(0, -1).map((index) => ring[index])
}

async function renderThreeDCharacter(character: string, color: string): Promise<string> {
  const THREE = await import('three')
  const { scene, camera, renderer } = createRenderStage(THREE, [3.1, 2.6, 7.5])
  const size = 512
  const glyphCanvas = document.createElement('canvas')
  glyphCanvas.width = size
  glyphCanvas.height = size
  const context = glyphCanvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Could not create the 3D letter outline.')
  context.font = '900 480px "Arial Rounded MT Bold", "Avenir Next", "Arial Black", sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillStyle = '#fff'
  const metrics = context.measureText(character)
  const glyphHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
  const fontScale = Math.min(1, 488 / metrics.width, 488 / glyphHeight)
  context.translate(size / 2, size / 2)
  context.scale(fontScale, fontScale)
  context.fillText(character, 0, 0)

  const contours = traceGlyphContours(context.getImageData(0, 0, size, size))
    .map((contour) => simplifyGlyphContour(contour, 1.2))
    .filter((contour) => contour.length >= 3)
  if (contours.length === 0) throw new Error('Could not trace the 3D letter outline.')
  const contourAreas = contours.map((contour) => Math.abs(contour.reduce((sum, point, index) => {
    const next = contour[(index + 1) % contour.length]
    return sum + point[0] * next[1] - next[0] * point[1]
  }, 0)))
  const outerContourIndex = contourAreas.reduce((largest, area, index) => area > contourAreas[largest] ? index : largest, 0)
  const bounds = contours.flat().reduce((result, [pointX, pointY]) => ({
    minX: Math.min(result.minX, pointX),
    maxX: Math.max(result.maxX, pointX),
    minY: Math.min(result.minY, pointY),
    maxY: Math.max(result.maxY, pointY),
  }), { minX: size, maxX: 0, minY: size, maxY: 0 })
  const shapeScale = 3.6 / Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY)
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const toShapePoint = ([pointX, pointY]: GlyphPoint): GlyphPoint => [(pointX - centerX) * shapeScale, (centerY - pointY) * shapeScale]
  const outerPoints = contours[outerContourIndex].map(toShapePoint)
  const shape = new THREE.Shape()
  shape.moveTo(...outerPoints[0])
  outerPoints.slice(1).forEach(([pointX, pointY]) => shape.lineTo(pointX, pointY))
  shape.closePath()
  contours.forEach((contour, index) => {
    if (index === outerContourIndex) return
    const holePoints = contour.map(toShapePoint)
    const hole = new THREE.Path()
    hole.moveTo(...holePoints[0])
    holePoints.slice(1).forEach(([pointX, pointY]) => hole.lineTo(pointX, pointY))
    hole.closePath()
    shape.holes.push(hole)
  })

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 1.15,
    bevelEnabled: true,
    bevelSegments: 8,
    steps: 1,
    bevelSize: 0.11,
    bevelThickness: 0.12,
    curveSegments: 8,
  })
  geometry.computeBoundingBox()
  const geometryCenter = geometry.boundingBox?.getCenter(new THREE.Vector3()) ?? new THREE.Vector3()
  geometry.translate(-geometryCenter.x, -geometryCenter.y, -geometryCenter.z)

  const baseColor = new THREE.Color(color)
  const sideColor = baseColor.clone().lerp(new THREE.Color('#8f3c83'), 0.58)
  const frontMaterial = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    roughness: 0.24,
    metalness: 0.03,
    clearcoat: 0.5,
    clearcoatRoughness: 0.18,
  })
  const sideMaterial = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.32, metalness: 0.02 })
  const letter = new THREE.Mesh(geometry, [frontMaterial, sideMaterial])
  letter.rotation.set(-0.04, 0.04, 0.02)
  scene.add(letter)
  renderer.render(scene, camera)
  const imageUrl = renderer.domElement.toDataURL('image/png')
  geometry.dispose()
  frontMaterial.dispose()
  sideMaterial.dispose()
  renderer.dispose()
  return imageUrl
}

type ThreeDEmoji = (typeof threeDEmojiChoices)[number]

function createRoundedRectangle(THREE: ThreeModule, width: number, height: number, radius: number) {
  const left = -width / 2
  const right = width / 2
  const bottom = -height / 2
  const top = height / 2
  const shape = new THREE.Shape()
  shape.moveTo(left + radius, bottom)
  shape.lineTo(right - radius, bottom)
  shape.quadraticCurveTo(right, bottom, right, bottom + radius)
  shape.lineTo(right, top - radius)
  shape.quadraticCurveTo(right, top, right - radius, top)
  shape.lineTo(left + radius, top)
  shape.quadraticCurveTo(left, top, left, top - radius)
  shape.lineTo(left, bottom + radius)
  shape.quadraticCurveTo(left, bottom, left + radius, bottom)
  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.055,
    bevelEnabled: true,
    bevelSegments: 4,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    curveSegments: 6,
  })
}

async function renderReferenceEmoji(character: '😎' | '😭'): Promise<string> {
  const THREE = await import('three')
  const { scene, camera, renderer } = createRenderStage(THREE, [0.6, 0.35, 4.4])
  const group = new THREE.Group()
  const geometries: import('three').BufferGeometry[] = []
  const materials: import('three').Material[] = []
  const addMesh = (
    geometry: import('three').BufferGeometry,
    material: import('three').Material,
    position: [number, number, number],
    scale: [number, number, number] = [1, 1, 1],
  ) => {
    geometries.push(geometry)
    materials.push(material)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    mesh.scale.set(...scale)
    group.add(mesh)
    return mesh
  }
  const addTube = (points: Array<[number, number, number]>, radius: number, color: string) => {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
    const material = new THREE.MeshPhysicalMaterial({ color, roughness: 0.24, clearcoat: 0.65 })
    return addMesh(new THREE.TubeGeometry(curve, 32, radius, 10, false), material, [0, 0, 0])
  }
  const faceCanvas = document.createElement('canvas')
  faceCanvas.width = 64
  faceCanvas.height = 256
  const faceContext = faceCanvas.getContext('2d')
  if (!faceContext) throw new Error('Could not create the emoji face shading.')
  const faceGradient = faceContext.createLinearGradient(0, 0, 0, faceCanvas.height)
  faceGradient.addColorStop(0, '#ffdc77')
  faceGradient.addColorStop(0.52, '#f0b747')
  faceGradient.addColorStop(1, '#d77f32')
  faceContext.fillStyle = faceGradient
  faceContext.fillRect(0, 0, faceCanvas.width, faceCanvas.height)
  const faceTexture = new THREE.CanvasTexture(faceCanvas)
  faceTexture.colorSpace = THREE.SRGBColorSpace
  const faceMaterial = new THREE.MeshPhysicalMaterial({
    map: faceTexture,
    roughness: 0.28,
    clearcoat: 0.42,
    clearcoatRoughness: 0.2,
  })
  materials.push(faceMaterial)
  addMesh(new THREE.SphereGeometry(1.04, 64, 48), faceMaterial, [0, 0, 0])

  const browMaterial = new THREE.MeshPhysicalMaterial({ color: '#30251d', roughness: 0.32 })
  materials.push(browMaterial)
  for (const side of [-1, 1]) {
    const browCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.68, 0.52, 0.77),
      new THREE.Vector3(side * 0.43, 0.68, 0.82),
      new THREE.Vector3(side * 0.2, 0.57, 0.91),
    ])
    addMesh(new THREE.TubeGeometry(browCurve, 24, 0.035, 10, false), browMaterial, [0, 0, 0])
  }

  if (character === '😎') {
    const frameMaterial = new THREE.MeshPhysicalMaterial({ color: '#100f0e', roughness: 0.2, clearcoat: 0.72 })
    const lensMaterial = new THREE.MeshPhysicalMaterial({ color: '#191817', roughness: 0.14, clearcoat: 0.9, clearcoatRoughness: 0.12 })
    const bridgeMaterial = new THREE.MeshPhysicalMaterial({ color: '#100f0e', roughness: 0.2, clearcoat: 0.7 })
    materials.push(frameMaterial, lensMaterial, bridgeMaterial)
    for (const side of [-1, 1]) {
      const lensPosition: [number, number, number] = [side * 0.38, 0.12, 0.99]
      addMesh(createRoundedRectangle(THREE, 0.76, 0.5, 0.14), frameMaterial, lensPosition)
      addMesh(createRoundedRectangle(THREE, 0.67, 0.41, 0.12), lensMaterial, [lensPosition[0], lensPosition[1] - 0.005, 1.055])
      const armCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.73, 0.25, 0.99),
        new THREE.Vector3(side * 0.88, 0.22, 0.88),
        new THREE.Vector3(side * 0.98, 0.1, 0.64),
      ])
      addMesh(new THREE.TubeGeometry(armCurve, 20, 0.045, 10, false), frameMaterial, [0, 0, 0])
    }
    addMesh(new THREE.BoxGeometry(0.2, 0.075, 0.09), bridgeMaterial, [0, 0.14, 1.055])
    addTube([[-0.2, -0.43, 0.94], [0, -0.5, 0.98], [0.2, -0.43, 0.94]], 0.026, '#a35b2d')
  } else {
    const tearMaterial = new THREE.MeshPhysicalMaterial({ color: '#45bfe8', roughness: 0.17, clearcoat: 0.88, clearcoatRoughness: 0.12 })
    const mouthMaterial = new THREE.MeshPhysicalMaterial({ color: '#211711', roughness: 0.3 })
    const toothMaterial = new THREE.MeshPhysicalMaterial({ color: '#fff3d4', roughness: 0.22, clearcoat: 0.35 })
    const puddleMaterial = new THREE.MeshPhysicalMaterial({ color: '#51c6e7', roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.1 })
    materials.push(tearMaterial, mouthMaterial, toothMaterial, puddleMaterial)
    for (const side of [-1, 1]) {
      const centerX = side * 0.42
      const tearShape = new THREE.Shape()
      tearShape.moveTo(centerX - 0.065, 0.42)
      tearShape.bezierCurveTo(centerX - 0.15, 0.36, centerX - 0.11, 0.16, centerX - 0.11, -0.12)
      tearShape.lineTo(centerX - 0.11, -0.77)
      tearShape.quadraticCurveTo(centerX, -0.94, centerX + 0.11, -0.77)
      tearShape.lineTo(centerX + 0.11, -0.12)
      tearShape.bezierCurveTo(centerX + 0.11, 0.16, centerX + 0.15, 0.36, centerX + 0.065, 0.42)
      tearShape.closePath()
      const tearGeometry = new THREE.ExtrudeGeometry(tearShape, {
        depth: 0.055,
        bevelEnabled: true,
        bevelSegments: 5,
        bevelSize: 0.025,
        bevelThickness: 0.02,
        curveSegments: 10,
      })
      addMesh(tearGeometry, tearMaterial, [0, 0, 0.88])
    }
    addMesh(new THREE.SphereGeometry(1, 32, 24), puddleMaterial, [0, -1.02, 0.5], [1.15, 0.13, 0.32])
    addMesh(new THREE.SphereGeometry(1, 40, 32), mouthMaterial, [0, -0.36, 0.91], [0.22, 0.29, 0.09])
    addMesh(createRoundedRectangle(THREE, 0.27, 0.07, 0.035), toothMaterial, [0, -0.16, 1.08])
  }

  group.rotation.set(-0.04, 0.1, 0)
  scene.add(group)
  renderer.render(scene, camera)
  const imageUrl = renderer.domElement.toDataURL('image/png')
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  faceTexture.dispose()
  renderer.dispose()
  return imageUrl
}

export async function addThreeDCharacter(canvas: Canvas, character: string, color = '#e879bf') {
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
  const imageUrl = emoji.emoji === '😎' || emoji.emoji === '😭'
    ? await renderReferenceEmoji(emoji.emoji)
    : threeDEmojiAssets[emoji.emoji]
  await addRenderedImage(canvas, imageUrl, `${emoji.label} emoji`, 1.5, {}, 900)
}
