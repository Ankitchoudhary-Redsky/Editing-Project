import { FabricImage, type Canvas } from 'fabric'
import emojiHappy3D from '@lobehub/fluent-emoji-3d/assets/1f603.webp'
import emojiHeartEyes3D from '@lobehub/fluent-emoji-3d/assets/1f60d.webp'
import emojiLaughing3D from '@lobehub/fluent-emoji-3d/assets/1f602.webp'
import emojiSad3D from '@lobehub/fluent-emoji-3d/assets/1f622.webp'
import emojiAngry3D from '@lobehub/fluent-emoji-3d/assets/1f621.webp'
import emojiSurprised3D from '@lobehub/fluent-emoji-3d/assets/1f62e.webp'
import emojiPlayful3D from '@lobehub/fluent-emoji-3d/assets/1f61c.webp'
import emojiSleepy3D from '@lobehub/fluent-emoji-3d/assets/1f634.webp'
import emojiAngel3D from '@lobehub/fluent-emoji-3d/assets/1f607.webp'
import emojiThinking3D from '@lobehub/fluent-emoji-3d/assets/1f914.webp'
import emojiParty3D from '@lobehub/fluent-emoji-3d/assets/1f973.webp'
import emojiSeeNoEvil3D from '@lobehub/fluent-emoji-3d/assets/1f648.webp'

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
  '😃': emojiHappy3D,
  '😍': emojiHeartEyes3D,
  '😂': emojiLaughing3D,
  '😢': emojiSad3D,
  '😡': emojiAngry3D,
  '😮': emojiSurprised3D,
  '😜': emojiPlayful3D,
  '😴': emojiSleepy3D,
  '😇': emojiAngel3D,
  '🤔': emojiThinking3D,
  '🥳': emojiParty3D,
  '🙈': emojiSeeNoEvil3D,
}

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
  await addRenderedImage(canvas, await renderShape(kind, color), label)
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
