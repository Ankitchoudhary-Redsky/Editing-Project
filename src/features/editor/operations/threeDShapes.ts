import { FabricImage, FabricObject, type Canvas } from 'fabric'
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
  { kind: 'diamond', label: 'Diamond', color: '#8968dc', group: 'Basic Objects' },
  { kind: 'hexagon', label: 'Hexagon', color: '#32a6b0', group: 'Basic Objects' },
] as const

export type { ThreeDShapeKind }
export const threeDShapeGroups = ['Basic Objects', 'Advanced Shapes', 'Symbols & Icons', 'Letters & Numbers', 'Emojis'] as const
export const threeDCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')
export const threeDEmojiChoices = [
  { emoji: '😃', label: 'Smiling Face', color: '#ffc928', mood: 'smile', category: 'Faces' },
  { emoji: '😂', label: 'Laughing Face', color: '#ffc928', mood: 'laugh', category: 'Faces' },
  { emoji: '😍', label: 'Heart Eyes', color: '#ffbf24', mood: 'heart-eyes', category: 'Faces' },
  { emoji: '😎', label: 'Sunglasses', color: '#f7c43a', mood: 'sunglasses', category: 'Faces' },
  { emoji: '😭', label: 'Crying Face', color: '#76c7f2', mood: 'loud-cry', category: 'Faces' },
  { emoji: '😡', label: 'Angry Face', color: '#f35d50', mood: 'angry', category: 'Faces' },
  { emoji: '😉', label: 'Winking Face', color: '#ffc928', mood: 'wink', category: 'Faces' },
  { emoji: '😮', label: 'Surprised Face', color: '#ffd34e', mood: 'surprised', category: 'Faces' },
  { emoji: '😏', label: 'Cool Face', color: '#f7c43a', mood: 'cool', category: 'Faces' },
  { emoji: '🤔', label: 'Thinking Face', color: '#f3bd55', mood: 'thinking', category: 'Faces' },
  { emoji: '😢', label: 'Sad Face', color: '#76c7f2', mood: 'cry', category: 'Faces' },
  { emoji: '😜', label: 'Playful Face', color: '#ffcb35', mood: 'tongue', category: 'Faces' },
  { emoji: '😴', label: 'Sleepy Face', color: '#f1ce7b', mood: 'sleepy', category: 'Faces' },
  { emoji: '😇', label: 'Angel Face', color: '#ffd34e', mood: 'angel', category: 'Faces' },
  { emoji: '🥳', label: 'Party Face', color: '#ffc928', mood: 'laugh', category: 'Faces' },
  { emoji: '😆', label: 'Grinning Face', color: '#ffc928', mood: 'laugh', category: 'Faces' },
  { emoji: '😋', label: 'Savoring Face', color: '#ffc928', mood: 'tongue', category: 'Faces' },
  { emoji: '🥰', label: 'Smiling Face with Hearts', color: '#ffc928', mood: 'heart-eyes', category: 'Faces' },
  { emoji: '🤩', label: 'Star-Struck', color: '#ffc928', mood: 'star-eyes', category: 'Faces' },
  { emoji: '🥹', label: 'Holding Back Tears', color: '#f5cb67', mood: 'loud-cry', category: 'Faces' },
  { emoji: '😱', label: 'Screaming Face', color: '#ffd34e', mood: 'surprised', category: 'Faces' },
  { emoji: '🙈', label: 'See No Evil', color: '#9b5b39', mood: 'monkey', category: 'Faces' },
  { emoji: '💖', label: 'Love', color: '#f36b8c', mood: 'love', category: 'Faces' },
  { emoji: '❤️', label: 'Red Heart', color: '#ef4565', mood: 'heart-symbol', category: 'Symbols' },
  { emoji: '🧡', label: 'Orange Heart', color: '#f18442', mood: 'heart-symbol', category: 'Symbols' },
  { emoji: '💛', label: 'Yellow Heart', color: '#f0c343', mood: 'heart-symbol', category: 'Symbols' },
  { emoji: '💚', label: 'Green Heart', color: '#35a977', mood: 'heart-symbol', category: 'Symbols' },
  { emoji: '💙', label: 'Blue Heart', color: '#4b8ee8', mood: 'heart-symbol', category: 'Symbols' },
  { emoji: '💜', label: 'Purple Heart', color: '#9867c9', mood: 'heart-symbol', category: 'Symbols' },
  { emoji: '🔥', label: 'Fire', color: '#ff6a24', mood: 'fire', category: 'Symbols' },
  { emoji: '⭐', label: 'Star', color: '#ffc93e', mood: 'star', category: 'Symbols' },
  { emoji: '🤖', label: 'Robot', color: '#9db7c7', mood: 'robot', category: 'Objects' },
] as const
export const threeDEmojiCategories = ['Faces', 'Symbols', 'Objects'] as const

const previewSize = 512
const rotationPreviewSize = 256
const characterRotationPreviewSize = 160
const latestCharacterColorRequest = new WeakMap<FabricImage, number>()
const pendingCharacterColorUpdate = new WeakMap<FabricImage, Promise<void>>()
let nextCharacterColorRequest = 0
let sharedRenderer: import('three').WebGLRenderer | null = null
let sharedEmojiEnvironment: import('three').Texture | null = null
const rendererSizeByInstance = new WeakMap<import('three').WebGLRenderer, number>()
const rotationCanvasByImage = new WeakMap<FabricImage, HTMLCanvasElement>()

const threeDRotationProperties = [
  'threeDType',
  'threeDShapeKind',
  'threeDCharacter',
  'threeDEmoji',
  'threeDColor',
  'threeDRotationX',
  'threeDRotationY',
  'threeDRotationZ',
]
FabricObject.customProperties = Array.from(new Set([...FabricObject.customProperties, ...threeDRotationProperties]))

export type ThreeDRotation = { x: number; y: number; z: number }

const degrees = (radians: number) => (radians * 180) / Math.PI
const radians = (degreesValue: number) => (degreesValue * Math.PI) / 180
const normalizeDegrees = (value: number) => (value % 360 + 360) % 360
const initialShapeRotation = {
  x: normalizeDegrees(degrees(-0.16)),
  y: normalizeDegrees(degrees(0.42)),
  z: normalizeDegrees(degrees(0.08)),
}
const initialCharacterRotation = {
  x: normalizeDegrees(degrees(-0.04)),
  y: normalizeDegrees(degrees(0.04)),
  z: normalizeDegrees(degrees(0.02)),
}
const initialEmojiRotation = { x: 0, y: 0, z: 0 }

type ThreeModule = typeof import('three')

function ensureRendererSize(renderer: import('three').WebGLRenderer, size: number) {
  if (rendererSizeByInstance.get(renderer) === size) return
  renderer.setSize(size, size)
  rendererSizeByInstance.set(renderer, size)
}

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

function createThreeDEmojiGroup(THREE: ThreeModule, emoji: string) {
  const group = new THREE.Group()
    const geometries: import('three').BufferGeometry[] = []
    const materials: import('three').Material[] = []
    const choice = threeDEmojiChoices.find((item) => item.emoji === emoji)
    const mood = choice?.mood ?? 'smile'
    const baseColor = choice?.color ?? '#ffc928'
    const material = (color: string, roughness = 0.28, metalness = 0, clearcoat = 0.55) => {
      const value = new THREE.MeshPhysicalMaterial({ color, roughness, metalness, clearcoat, clearcoatRoughness: 0.18 })
      materials.push(value)
      return value
    }
    const addMesh = (
      geometry: import('three').BufferGeometry,
      surface: import('three').Material,
      position: [number, number, number],
      scale: [number, number, number] = [1, 1, 1],
      rotation: [number, number, number] = [0, 0, 0],
    ) => {
      geometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, surface)
      mesh.position.set(...position)
      mesh.scale.set(...scale)
      mesh.rotation.set(...rotation)
      group.add(mesh)
      return mesh
    }
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 24)
    geometries.push(sphereGeometry)
    const addSphere = (
      surface: import('three').Material,
      position: [number, number, number],
      scale: [number, number, number],
    ) => {
      const mesh = new THREE.Mesh(sphereGeometry, surface)
      mesh.position.set(...position)
      mesh.scale.set(...scale)
      group.add(mesh)
      return mesh
    }
    const addTube = (points: Array<[number, number, number]>, radius: number, surface: import('three').Material) => {
      const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)))
      return addMesh(new THREE.TubeGeometry(curve, 32, radius, 10, false), surface, [0, 0, 0])
    }
    const makeHeart = (size: number) => {
      const heart = new THREE.Shape()
      heart.moveTo(0, -size * 0.85)
      heart.bezierCurveTo(-size * 0.25, -size * 0.35, -size, size * 0.05, -size, size * 0.48)
      heart.bezierCurveTo(-size, size * 1.05, -size * 0.2, size * 1.1, 0, size * 0.55)
      heart.bezierCurveTo(size * 0.2, size * 1.1, size, size * 1.05, size, size * 0.48)
      heart.bezierCurveTo(size, size * 0.05, size * 0.25, -size * 0.35, 0, -size * 0.85)
      heart.closePath()
      return new THREE.ExtrudeGeometry(heart, { depth: 0.075, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.025, bevelThickness: 0.025, curveSegments: 12 })
    }
    const heartMaterial = material('#e94366', 0.22, 0.03, 0.78)
    const whiteMaterial = material('#fff8e9', 0.18, 0, 0.5)
    const pupilMaterial = material('#201c1c', 0.13, 0, 0.82)
    const glintMaterial = material('#ffffff', 0.12, 0, 0.82)
    const browMaterial = material('#3a2925', 0.25, 0, 0.58)
    const tongueMaterial = material('#e94f72', 0.24, 0, 0.58)
    const cheekMaterial = material('#f07a72', 0.45, 0, 0.22)
    const mouthMaterial = material('#321b22', 0.22, 0, 0.46)
    const faceMaterial = material(baseColor, 0.24, 0.02, 0.72)
    const eyeSurfaceZ = (x: number, y: number) => 0.97 * Math.sqrt(Math.max(0.08, 1 - x * x - y * y))

    if (mood === 'star') {
      const starPoints = Array.from({ length: 10 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI / 5
        const radius = index % 2 === 0 ? 1 : 0.48
        return [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number]
      })
      const starGeometry = extrudeShape(THREE, starPoints)
      starGeometry.computeVertexNormals()
      const gold = material('#ffbe2f', 0.2, 0.08, 0.84)
      const star = addMesh(starGeometry, gold, [0, 0, 0], [1.02, 1.02, 1.15])
      star.rotation.z = -0.12
      addSphere(glintMaterial, [-0.28, 0.34, 0.28], [0.09, 0.09, 0.04])
    } else if (mood === 'fire') {
      const flameShape = new THREE.Shape()
      flameShape.moveTo(-0.72, -0.78)
      flameShape.bezierCurveTo(-1.05, -0.12, -0.22, 0.06, -0.26, 0.88)
      flameShape.bezierCurveTo(0.35, 0.54, 0.17, 0.18, 0.52, 0.02)
      flameShape.bezierCurveTo(0.88, 0.3, 0.74, 0.72, 0.92, 0.78)
      flameShape.bezierCurveTo(1.32, -0.22, 0.78, -0.74, 0.48, -0.88)
      flameShape.bezierCurveTo(0.12, -0.68, -0.24, -0.62, -0.72, -0.78)
      flameShape.closePath()
      const flame = new THREE.ExtrudeGeometry(flameShape, { depth: 0.22, bevelEnabled: true, bevelSegments: 5, bevelSize: 0.07, bevelThickness: 0.06, curveSegments: 16 })
      const fireMaterial = material('#ed4b23', 0.24, 0.02, 0.78)
      const goldMaterial = material('#ffb52e', 0.22, 0.02, 0.7)
      addMesh(flame, fireMaterial, [0, 0, -0.11], [0.82, 0.98, 1])
      const innerShape = new THREE.Shape()
      innerShape.moveTo(-0.38, -0.55)
      innerShape.bezierCurveTo(-0.54, -0.06, 0.02, 0.12, 0.04, 0.58)
      innerShape.bezierCurveTo(0.55, 0.2, 0.47, -0.32, 0.27, -0.55)
      innerShape.bezierCurveTo(0.02, -0.4, -0.16, -0.46, -0.38, -0.55)
      innerShape.closePath()
      addMesh(new THREE.ExtrudeGeometry(innerShape, { depth: 0.08, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.03, bevelThickness: 0.03 }), goldMaterial, [0, -0.02, 0.14], [0.74, 0.8, 1])
    } else if (mood === 'heart-symbol') {
      const heartColor = material(baseColor, 0.22, 0.03, 0.82)
      addMesh(makeHeart(0.86), heartColor, [0, 0, 0], [1, 1, 1])
      addSphere(glintMaterial, [-0.34, 0.48, 0.11], [0.09, 0.09, 0.035])
    } else if (mood === 'robot') {
      const metal = material('#9db8c8', 0.23, 0.48, 0.72)
      const trim = material('#547489', 0.22, 0.6, 0.7)
      const led = material('#46d7ee', 0.15, 0.16, 0.9)
      const headGeometry = createRoundedRectangle(THREE, 1.72, 1.5, 0.22)
      addMesh(headGeometry, metal, [0, -0.02, 0], [1, 1, 1])
      addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.28, 16), trim, [0, 0.88, 0.02])
      addSphere(led, [0, 1.04, 0.02], [0.12, 0.12, 0.12])
      for (const side of [-1, 1]) {
        addSphere(led, [side * 0.42, 0.16, 0.42], [0.12, 0.14, 0.08])
        addMesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 12), trim, [side * 0.93, -0.08, 0], [1, 1, 1], [0, 0, Math.PI / 2])
      }
      addMesh(createRoundedRectangle(THREE, 0.6, 0.12, 0.055), trim, [0, -0.42, 0.46])
      for (const x of [-0.2, 0, 0.2]) addSphere(led, [x, -0.42, 0.53], [0.045, 0.045, 0.025])
    } else {
      addSphere(faceMaterial, [0, 0, 0], [1, 1, 0.91])
      for (const side of [-1, 1]) {
        const x = side * 0.36
        const y = 0.2
        if (mood === 'heart-eyes' || mood === 'love') {
          addMesh(makeHeart(0.19), heartMaterial, [x, y, eyeSurfaceZ(x, y) + 0.045], [1, 1, 0.82])
        } else if (mood === 'star-eyes') {
          const points = Array.from({ length: 10 }, (_, index) => {
            const angle = -Math.PI / 2 + index * Math.PI / 5
            const radius = index % 2 === 0 ? 1 : 0.48
            return [Math.cos(angle) * radius, Math.sin(angle) * radius] as [number, number]
          })
          addMesh(extrudeShape(THREE, points), material('#f3a927', 0.2, 0.04, 0.78), [x, y, eyeSurfaceZ(x, y) + 0.045], [0.18, 0.18, 0.82])
        } else if (mood === 'sunglasses') {
          const lensFrame = material('#101116', 0.18, 0.12, 0.88)
          const lens = material('#151923', 0.13, 0.1, 0.95)
          const lensZ = eyeSurfaceZ(x, 0.12)
          addMesh(createRoundedRectangle(THREE, 0.78, 0.5, 0.16), lensFrame, [x, 0.12, lensZ], [1, 1, 0.76])
          addMesh(createRoundedRectangle(THREE, 0.64, 0.37, 0.12), lens, [x, 0.13, lensZ + 0.055], [1, 1, 0.76])
          addSphere(glintMaterial, [x - 0.17, 0.2, lensZ + 0.12], [0.1, 0.035, 0.018])
        } else if (mood === 'wink' && side === 1) {
          const winkZ = eyeSurfaceZ(x, y) + 0.025
          addTube([[x - 0.15, y, winkZ], [x, y - 0.07, winkZ + 0.025], [x + 0.15, y, winkZ]], 0.035, pupilMaterial)
        } else if (mood === 'sleepy') {
          const sleepyZ = eyeSurfaceZ(x, y) + 0.02
          addTube([[x - 0.15, y - 0.02, sleepyZ], [x, y - 0.1, sleepyZ + 0.025], [x + 0.15, y - 0.02, sleepyZ]], 0.045, pupilMaterial)
        } else {
          const eyeScale = mood === 'surprised' ? 0.19 : mood === 'angry' ? 0.14 : 0.16
          const eyeZ = eyeSurfaceZ(x, y)
          addSphere(whiteMaterial, [x, y, eyeZ + 0.02], [eyeScale, eyeScale * 1.18, 0.085])
          const gazeX = mood === 'thinking' ? -side * 0.035 : 0
          addSphere(pupilMaterial, [x + gazeX, y - 0.005, eyeZ + 0.09], [eyeScale * 0.48, eyeScale * 0.63, 0.05])
          addSphere(glintMaterial, [x + gazeX - 0.025, y + 0.045, eyeZ + 0.13], [0.035, 0.035, 0.022])
        }
      }

      if (mood === 'sunglasses') {
        const bridge = material('#101116', 0.16, 0.1, 0.9)
        addMesh(new THREE.BoxGeometry(0.24, 0.075, 0.08), bridge, [0, 0.12, 1.02])
        const arm = material('#101116', 0.19, 0.08, 0.78)
        for (const side of [-1, 1]) {
          addTube([[side * 0.68, 0.24, 0.91], [side * 0.84, 0.18, 0.72], [side * 0.94, 0.04, 0.28]], 0.045, arm)
        }
      } else if (mood === 'angry') {
        for (const side of [-1, 1]) {
          const x = side * 0.36
          const z = eyeSurfaceZ(x, 0.42) + 0.03
          addTube([[x - side * 0.16, 0.48, z], [x, 0.39, z + 0.04], [x + side * 0.16, 0.34, z]], 0.045, browMaterial)
        }
      } else {
        for (const side of [-1, 1]) {
          const x = side * 0.36
          const browY = mood === 'surprised' ? 0.49 : 0.43
          const z = eyeSurfaceZ(x, browY) + 0.015
          addTube([[x - 0.13, browY, z], [x, browY + 0.065, z + 0.025], [x + 0.13, browY, z]], 0.032, browMaterial)
        }
      }

      const mouthX = 0.3
      const mouthY = mood === 'surprised' ? -0.36 : -0.4
      const mouthZ = eyeSurfaceZ(0, mouthY) + 0.025
      if (mood === 'surprised') {
        addSphere(mouthMaterial, [0, mouthY, mouthZ], [0.13, 0.19, 0.075])
        addMesh(new THREE.SphereGeometry(1, 24, 16), tongueMaterial, [0, mouthY - 0.1, mouthZ + 0.025], [0.075, 0.055, 0.025])
      } else if (mood === 'laugh' || mood === 'loud-cry') {
        addSphere(mouthMaterial, [0, mouthY, mouthZ], [mood === 'laugh' ? 0.27 : 0.2, mood === 'laugh' ? 0.23 : 0.29, 0.08])
        if (mood === 'laugh') addMesh(createRoundedRectangle(THREE, 0.32, 0.08, 0.03), whiteMaterial, [0, mouthY + 0.11, mouthZ + 0.06])
        addSphere(tongueMaterial, [0, mouthY - 0.11, mouthZ + 0.045], [0.13, 0.065, 0.035])
      } else {
        const points: Array<[number, number, number]> = []
        const isSad = mood === 'cry'
        for (let step = 0; step <= 12; step += 1) {
          const x = -mouthX + (step / 12) * mouthX * 2
          const curve = 1 - (x * x) / (mouthX * mouthX)
          const y = isSad ? mouthY + curve * 0.1 : mouthY - curve * 0.12
          points.push([x, y, eyeSurfaceZ(x, y) + 0.025])
        }
        addTube(points, 0.032, mouthMaterial)
      }

      if (mood === 'cry' || mood === 'loud-cry') {
        const tear = material('#45c9f1', 0.12, 0.03, 0.94)
        for (const side of [-1, 1]) {
          addSphere(tear, [side * 0.46, -0.04, eyeSurfaceZ(side * 0.46, -0.04) + 0.06], [0.055, 0.14, 0.05])
        }
      }
      if (mood === 'smile' || mood === 'laugh' || mood === 'heart-eyes' || mood === 'love' || mood === 'angel' || mood === 'monkey') {
        for (const side of [-1, 1]) addSphere(cheekMaterial, [side * 0.57, -0.18, eyeSurfaceZ(side * 0.57, -0.18) + 0.012], [0.13, 0.07, 0.025])
      }
      if (mood === 'thinking') {
        addSphere(material('#d89458', 0.36), [0.65, -0.46, 0.58], [0.18, 0.22, 0.14])
        addSphere(material('#d89458', 0.36), [0.51, -0.33, 0.7], [0.1, 0.16, 0.12])
      }
      if (mood === 'angel') {
        const haloMaterial = material('#f8df7b', 0.18, 0.35, 0.9)
        addMesh(new THREE.TorusGeometry(0.32, 0.045, 12, 48), haloMaterial, [0, 1.18, 0], [1, 1, 0.72])
      }
      if (mood === 'monkey') {
        for (const side of [-1, 1]) {
          addSphere(material('#7c472e', 0.4), [side * 0.92, 0.12, 0], [0.28, 0.3, 0.19])
          addSphere(material('#c9895e', 0.38), [side * 0.94, 0.12, 0.12], [0.16, 0.18, 0.1])
        }
      }
      if (mood === 'love') {
        addMesh(makeHeart(0.15), heartMaterial, [0.72, 0.63, 0.28], [1, 1, 0.9], [0, 0, -0.3])
        addMesh(makeHeart(0.1), heartMaterial, [-0.78, 0.78, 0.22], [1, 1, 0.9], [0, 0, 0.25])
      }
    }

    return { group, geometries, materials }
}

function createGeometry(THREE: ThreeModule, kind: ThreeDShapeKind): import('three').BufferGeometry {
  switch (kind) {
    case 'sphere':
      return new THREE.SphereGeometry(1, 48, 48)
    case 'cube':
    case 'box':
    case 'roundedBox':
      return new THREE.BoxGeometry(1.65, 1.65, 1.65)
    case 'cone':
      return new THREE.ConeGeometry(0.95, 1.8, 5)
    case 'torus':
      return new THREE.TorusGeometry(0.76, 0.3, 24, 64)
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(0.62, 0.2, 96, 16)
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
    case 'plane':
      return new THREE.PlaneGeometry(1.6, 1.6)
    case 'circle':
      return new THREE.CylinderGeometry(0.8, 0.8, 0.16, 48)
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(1.05)
    case 'octahedron':
      return new THREE.OctahedronGeometry(1.05)
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(1.05)
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(1.05)
    case 'triangularPrism':
      return new THREE.CylinderGeometry(0.85, 0.85, 1.4, 3)
    case 'pentagonalPrism':
      return new THREE.CylinderGeometry(0.85, 0.85, 1.4, 5)
    case 'hexagonalPrism':
      return new THREE.CylinderGeometry(0.85, 0.85, 1.4, 6)
    case 'starExtrusion':
      return extrudeShape(THREE, Array.from({ length: 10 }, (_, index) => {
        const angle = -Math.PI / 2 + index * Math.PI / 5
        const radius = index % 2 === 0 ? 1 : 0.45
        return [Math.cos(angle) * radius, Math.sin(angle) * radius]
      }))
    case 'heartExtrusion': {
      const shape = new THREE.Shape()
      shape.moveTo(0, -0.82)
      shape.bezierCurveTo(-0.3, -0.48, -1, 0.02, -1, 0.52)
      shape.bezierCurveTo(-1, 1.15, -0.2, 1.2, 0, 0.58)
      shape.bezierCurveTo(0.2, 1.2, 1, 1.15, 1, 0.52)
      shape.bezierCurveTo(1, 0.02, 0.3, -0.48, 0, -0.82)
      return new THREE.ExtrudeGeometry(shape, { depth: 0.38, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: 0.07, bevelThickness: 0.07 })
    }
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

function createRenderStage(THREE: ThreeModule, cameraPosition: [number, number, number], renderSize = previewSize) {
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100)
  camera.position.set(...cameraPosition)
  camera.lookAt(0, 0, 0)
  const renderer = sharedRenderer ?? new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
  sharedRenderer = renderer
  ensureRendererSize(renderer, renderSize)
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

type ThreeDShapeRotationRuntime = {
  kind: ThreeDShapeKind
  color: string
  scene: import('three').Scene
  camera: import('three').PerspectiveCamera
  renderer: import('three').WebGLRenderer
  mesh: import('three').Mesh
}

const shapeRotationRuntimeByImage = new WeakMap<FabricImage, Promise<ThreeDShapeRotationRuntime>>()

async function getShapeRotationRuntime(image: FabricImage, kind: ThreeDShapeKind, color: string) {
  const cachedRuntime = shapeRotationRuntimeByImage.get(image)
  if (cachedRuntime) {
    const runtime = await cachedRuntime
    if (runtime.kind === kind && runtime.color === color) return runtime
  }

  const runtime = (async () => {
    const THREE = await import('three')
    const { scene, camera, renderer } = createRenderStage(THREE, [4, 3.2, 5.5], 256)
    const geometry = createGeometry(THREE, kind)
    if (!['sphere', 'cube', 'cone', 'torus', 'ring', 'cylinder', 'diamond', 'pyramid', 'capsule'].includes(kind)) {
      geometry.translate(0, 0, -0.19)
    }
    const material = new THREE.MeshStandardMaterial({ color, roughness: 0.26, metalness: 0.16 })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    return { kind, color, scene, camera, renderer, mesh }
  })()
  shapeRotationRuntimeByImage.set(image, runtime)
  return runtime
}

async function renderShapeRotationFrame(
  image: FabricImage,
  kind: ThreeDShapeKind,
  color: string,
  rotation: ThreeDRotation,
  renderSize: number,
): Promise<HTMLCanvasElement> {
  const runtime = await getShapeRotationRuntime(image, kind, color)
  ensureRendererSize(runtime.renderer, renderSize)
  runtime.mesh.rotation.set(radians(rotation.x), radians(rotation.y), radians(rotation.z))
  runtime.renderer.render(runtime.scene, runtime.camera)
  return runtime.renderer.domElement
}

async function renderShape(kind: ThreeDShapeKind, color: string, rotation: ThreeDRotation, outputCanvas?: HTMLCanvasElement, renderSize = previewSize): Promise<string> {
  const THREE = await import('three')
  const { scene, camera, renderer } = createRenderStage(THREE, [4, 3.2, 5.5], renderSize)

  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.26, metalness: 0.16 })
  const mesh = new THREE.Mesh(createGeometry(THREE, kind), material)
  mesh.rotation.set(radians(rotation.x), radians(rotation.y), radians(rotation.z))
  if (!['sphere', 'cube', 'cone', 'torus', 'ring', 'cylinder', 'diamond', 'pyramid', 'capsule'].includes(kind)) {
    mesh.geometry.translate(0, 0, -0.19)
  }
  scene.add(mesh)
  renderer.render(scene, camera)
  let imageUrl = ''
  if (outputCanvas) {
    const context = outputCanvas.getContext('2d')
    if (!context) throw new Error('Could not update the 3D preview.')
    context.clearRect(0, 0, outputCanvas.width, outputCanvas.height)
    context.drawImage(renderer.domElement, 0, 0, outputCanvas.width, outputCanvas.height)
  } else {
    imageUrl = renderer.domElement.toDataURL('image/png')
  }

  mesh.geometry.dispose()
  material.dispose()
  return imageUrl
}

async function addRenderedImage(canvas: Canvas, imageUrl: string, label: string, sizeMultiplier = 1, properties: Record<string, string | number> = {}, maxSize = 340): Promise<FabricImage> {
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
  return image
}

export async function addThreeDShape(canvas: Canvas, kind: ThreeDShapeKind, color: string, label: string) {
  await addRenderedImage(canvas, await renderShape(kind, color, initialShapeRotation), label, 1, {
    threeDType: 'shape',
    threeDShapeKind: kind,
    threeDColor: color,
    threeDRotationX: initialShapeRotation.x,
    threeDRotationY: initialShapeRotation.y,
    threeDRotationZ: initialShapeRotation.z,
  })
}

export function addEditableThreeDShape(
  canvas: Canvas,
  kind: ThreeDShapeKind,
  color: string,
  label: string,
  bounds = {
    left: canvas.getWidth() / 2 - 110,
    top: canvas.getHeight() / 2 - 95,
    width: 220,
    height: 190,
  },
) {
  const object = new EditableThreeDShape({
    ...bounds,
    originX: 'left',
    originY: 'top',
    threeDKind: kind,
    threeDColor: color,
    name: `3D ${label}`,
  })
  canvas.add(object)
  canvas.setActiveObject(object)
  canvas.requestRenderAll()
  return object
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

type ThreeDCharacterRuntime = {
  scene: import('three').Scene
  camera: import('three').PerspectiveCamera
  renderer: import('three').WebGLRenderer
  mesh: import('three').Mesh
  frontMaterial: import('three').MeshPhysicalMaterial
  sideMaterial: import('three').MeshStandardMaterial
  previewFrontMaterial: import('three').MeshStandardMaterial
  previewSideMaterial: import('three').MeshStandardMaterial
  fullQualityMaterials: import('three').Material[]
  previewMaterials: import('three').Material[]
  sideTint: import('three').Color
  color: string
}

const characterRotationRuntimeByCharacter = new Map<string, Promise<ThreeDCharacterRuntime>>()

async function createThreeDCharacterRuntime(character: string, color: string): Promise<ThreeDCharacterRuntime> {
  const THREE = await import('three')
  const { scene, camera, renderer } = createRenderStage(THREE, [3.1, 2.6, 7.5], previewSize)
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
    .map((contour) => simplifyGlyphContour(contour, 1.8))
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
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.11,
    bevelThickness: 0.12,
    curveSegments: 6,
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
  const previewFrontMaterial = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 0.32, metalness: 0.02 })
  const previewSideMaterial = new THREE.MeshStandardMaterial({ color: sideColor, roughness: 0.4, metalness: 0 })
  const fullQualityMaterials = [frontMaterial, sideMaterial]
  const previewMaterials = [previewFrontMaterial, previewSideMaterial]
  const letter = new THREE.Mesh(geometry, fullQualityMaterials)
  scene.add(letter)
  return {
    scene,
    camera,
    renderer,
    mesh: letter,
    frontMaterial,
    sideMaterial,
    previewFrontMaterial,
    previewSideMaterial,
    fullQualityMaterials,
    previewMaterials,
    sideTint: new THREE.Color('#8f3c83'),
    color,
  }

}

async function getThreeDCharacterRuntime(character: string, color: string): Promise<ThreeDCharacterRuntime> {
  let runtime = characterRotationRuntimeByCharacter.get(character)
  if (!runtime) {
    runtime = createThreeDCharacterRuntime(character, color)
    characterRotationRuntimeByCharacter.set(character, runtime)
  }
  return runtime
}

async function renderThreeDCharacterFrame(character: string, color: string, rotation: ThreeDRotation, renderSize: number): Promise<HTMLCanvasElement> {
  const runtime = await getThreeDCharacterRuntime(character, color)
  ensureRendererSize(runtime.renderer, renderSize)
  if (runtime.color !== color) {
    runtime.frontMaterial.color.set(color)
    runtime.sideMaterial.color.copy(runtime.frontMaterial.color).lerp(runtime.sideTint, 0.58)
    runtime.previewFrontMaterial.color.copy(runtime.frontMaterial.color)
    runtime.previewSideMaterial.color.copy(runtime.sideMaterial.color)
    runtime.color = color
  }
  runtime.mesh.material = renderSize < previewSize ? runtime.previewMaterials : runtime.fullQualityMaterials
  runtime.mesh.rotation.set(radians(rotation.x), radians(rotation.y), radians(rotation.z))
  runtime.renderer.render(runtime.scene, runtime.camera)
  return runtime.renderer.domElement
}

async function renderThreeDCharacter(character: string, color: string, rotation: ThreeDRotation): Promise<string> {
  const frame = await renderThreeDCharacterFrame(character, color, rotation, previewSize)
  return frame.toDataURL('image/png')
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

export async function renderReferenceEmoji(character: '😎' | '😭'): Promise<string> {
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
  return imageUrl
}

type ThreeDEmojiRuntime = {
  scene: import('three').Scene
  camera: import('three').PerspectiveCamera
  renderer: import('three').WebGLRenderer
  group: import('three').Group
  geometries: import('three').BufferGeometry[]
  materials: import('three').Material[]
}

const threeDEmojiRuntimeByImage = new WeakMap<FabricImage, Promise<ThreeDEmojiRuntime>>()

function createEmojiStudioEnvironment(THREE: ThreeModule) {
  const environmentCanvas = document.createElement('canvas')
  environmentCanvas.width = 512
  environmentCanvas.height = 256
  const context = environmentCanvas.getContext('2d')
  if (!context) throw new Error('Could not create the emoji environment lighting.')
  const ambient = context.createLinearGradient(0, 0, 0, environmentCanvas.height)
  ambient.addColorStop(0, '#9fb6d3')
  ambient.addColorStop(0.3, '#f3f5f8')
  ambient.addColorStop(0.58, '#ffffff')
  ambient.addColorStop(0.82, '#bbc5d2')
  ambient.addColorStop(1, '#535e6e')
  context.fillStyle = ambient
  context.fillRect(0, 0, environmentCanvas.width, environmentCanvas.height)
  for (const [x, width, tint] of [[48, 34, '#ffffff'], [224, 52, '#fff3d4'], [405, 28, '#d6edff']] as const) {
    const softbox = context.createLinearGradient(x, 0, x + width, 0)
    softbox.addColorStop(0, 'rgba(255,255,255,0)')
    softbox.addColorStop(0.5, tint)
    softbox.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = softbox
    context.fillRect(x, 28, width, 166)
  }
  const texture = new THREE.CanvasTexture(environmentCanvas)
  texture.mapping = THREE.EquirectangularReflectionMapping
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
}

async function createThreeDEmojiRuntime(emoji: string): Promise<ThreeDEmojiRuntime> {
  const THREE = await import('three')
  const { scene, camera, renderer } = createRenderStage(THREE, [0, 0, 4.2])
  sharedEmojiEnvironment ??= createEmojiStudioEnvironment(THREE)
  scene.environment = sharedEmojiEnvironment
  scene.environmentIntensity = 0.72
  const { group, geometries, materials } = createThreeDEmojiGroup(THREE, emoji)
  scene.add(group)
  return { scene, camera, renderer, group, geometries, materials }
}

async function renderEmojiRotationFrame(
  image: FabricImage,
  emoji: string,
  rotation: ThreeDRotation,
  renderSize: number,
): Promise<HTMLCanvasElement> {
  let runtime = threeDEmojiRuntimeByImage.get(image)
  if (!runtime) {
    runtime = createThreeDEmojiRuntime(emoji)
    threeDEmojiRuntimeByImage.set(image, runtime)
  }
  const sceneRuntime = await runtime
  ensureRendererSize(sceneRuntime.renderer, renderSize)
  sceneRuntime.group.rotation.set(radians(rotation.x), radians(rotation.y), radians(rotation.z))
  sceneRuntime.renderer.render(sceneRuntime.scene, sceneRuntime.camera)
  return sceneRuntime.renderer.domElement
}

async function renderEmojiPreview(emoji: string, rotation: ThreeDRotation) {
  const runtime = await createThreeDEmojiRuntime(emoji)
  runtime.group.rotation.set(radians(rotation.x), radians(rotation.y), radians(rotation.z))
  runtime.renderer.render(runtime.scene, runtime.camera)
  return { imageUrl: runtime.renderer.domElement.toDataURL('image/png'), runtime }
}

const threeDEmojiThumbnailCache = new Map<string, Promise<string>>()

export function renderThreeDEmojiThumbnail(emoji: string): Promise<string> {
  let thumbnail = threeDEmojiThumbnailCache.get(emoji)
  if (!thumbnail) {
    thumbnail = createThreeDEmojiRuntime(emoji).then((runtime) => {
      runtime.group.rotation.set(radians(-8), radians(18), 0)
      runtime.renderer.render(runtime.scene, runtime.camera)
      const thumbnailCanvas = document.createElement('canvas')
      thumbnailCanvas.width = 112
      thumbnailCanvas.height = 112
      const context = thumbnailCanvas.getContext('2d')
      if (!context) throw new Error('Could not create an emoji preview canvas.')
      context.drawImage(runtime.renderer.domElement, 0, 0, 112, 112)
      const imageUrl = thumbnailCanvas.toDataURL('image/png')
      runtime.geometries.forEach((geometry) => geometry.dispose())
      runtime.materials.forEach((material) => material.dispose())
      return imageUrl
    })
    threeDEmojiThumbnailCache.set(emoji, thumbnail)
  }
  return thumbnail
}

export async function addThreeDCharacter(canvas: Canvas, character: string, color = '#e879bf') {
  await addRenderedImage(canvas, await renderThreeDCharacter(character, color, initialCharacterRotation), character, 1.35, {
    threeDType: 'character',
    threeDCharacter: character,
    threeDColor: color,
    threeDRotationX: initialCharacterRotation.x,
    threeDRotationY: initialCharacterRotation.y,
    threeDRotationZ: initialCharacterRotation.z,
  })
}

function resolveThreeDRotationSource(image: FabricImage) {
  const type = String(image.get('threeDType') ?? '')
  const shapeKind = String(image.get('threeDShapeKind') ?? '')
  const character = String(image.get('threeDCharacter') ?? '')
  const emoji = String(image.get('threeDEmoji') ?? '')
  const color = String(image.get('threeDColor') ?? '')

  if (type === 'shape' && threeDShapeChoices.some((shape) => shape.kind === shapeKind)) {
    return { type: 'shape' as const, shapeKind: shapeKind as ThreeDShapeKind, color: color || '#5588ee' }
  }
  if (type === 'character' && /^[A-Z0-9]$/.test(character)) {
    return { type: 'character' as const, character, color: color || '#e879bf' }
  }
  if (type === 'emoji' && threeDEmojiChoices.some((choice) => choice.emoji === emoji)) {
    return { type: 'emoji' as const, emoji }
  }

  const label = String(image.get('name') ?? '').replace(/^(?:3D )+/, '')
  const legacyShape = threeDShapeChoices.find((shape) => shape.label === label)
  if (legacyShape) {
    image.set({
      threeDType: 'shape',
      threeDShapeKind: legacyShape.kind,
      threeDColor: legacyShape.color,
      threeDRotationX: initialShapeRotation.x,
      threeDRotationY: initialShapeRotation.y,
      threeDRotationZ: initialShapeRotation.z,
    })
    return { type: 'shape' as const, shapeKind: legacyShape.kind, color: legacyShape.color }
  }
  if (/^[A-Z0-9]$/.test(label)) {
    const characterColor = color || '#e879bf'
    image.set({
      threeDType: 'character',
      threeDCharacter: label,
      threeDColor: characterColor,
      threeDRotationX: initialCharacterRotation.x,
      threeDRotationY: initialCharacterRotation.y,
      threeDRotationZ: initialCharacterRotation.z,
    })
    return { type: 'character' as const, character: label, color: characterColor }
  }
  const legacyEmoji = threeDEmojiChoices.find((choice) => `${choice.label} emoji` === label)
  if (legacyEmoji) {
    image.set({
      threeDType: 'emoji',
      threeDEmoji: legacyEmoji.emoji,
      threeDRotationX: initialEmojiRotation.x,
      threeDRotationY: initialEmojiRotation.y,
      threeDRotationZ: initialEmojiRotation.z,
    })
    return { type: 'emoji' as const, emoji: legacyEmoji.emoji }
  }
  return null
}

export function isThreeDRotatable(image: FabricImage) {
  return resolveThreeDRotationSource(image) !== null
}

export function getThreeDRotation(image: FabricImage): ThreeDRotation | null {
  const source = resolveThreeDRotationSource(image)
  if (!source) return null
  const defaults = source.type === 'shape'
    ? initialShapeRotation
    : source.type === 'character' ? initialCharacterRotation : initialEmojiRotation
  return {
    x: Number(image.get('threeDRotationX') ?? defaults.x),
    y: Number(image.get('threeDRotationY') ?? defaults.y),
    z: Number(image.get('threeDRotationZ') ?? defaults.z),
  }
}

const pendingRotationByImage = new WeakMap<FabricImage, ThreeDRotation>()
const activeRotationUpdateByImage = new WeakMap<FabricImage, Promise<void>>()
const pendingRotationCommitByImage = new WeakMap<FabricImage, boolean>()
const rotationGenerationByImage = new WeakMap<FabricImage, number>()

export function disposeThreeDRotationRuntime(canvas: Canvas, image: FabricImage) {
  const source = resolveThreeDRotationSource(image)
  if (!source) return

  rotationGenerationByImage.set(image, (rotationGenerationByImage.get(image) ?? 0) + 1)
  pendingRotationByImage.delete(image)
  pendingRotationCommitByImage.delete(image)
  rotationCanvasByImage.delete(image)

  const activeUpdate = activeRotationUpdateByImage.get(image)
  const shapeRuntime = shapeRotationRuntimeByImage.get(image)
  const emojiRuntime = threeDEmojiRuntimeByImage.get(image)
  shapeRotationRuntimeByImage.delete(image)
  threeDEmojiRuntimeByImage.delete(image)

  const character = source.type === 'character' ? source.character : null
  const characterRuntime = character
    && !canvas.getObjects().some((object) => object instanceof FabricImage && object.get('threeDCharacter') === character)
    ? characterRotationRuntimeByCharacter.get(character)
    : undefined
  if (character && characterRuntime) characterRotationRuntimeByCharacter.delete(character)

  void Promise.all([
    activeUpdate?.catch(() => undefined),
    shapeRuntime?.catch(() => null),
    emojiRuntime?.catch(() => null),
    characterRuntime?.catch(() => null),
  ]).then(([, shape, emoji, character]) => {
    if (shape) {
      shape.mesh.geometry.dispose()
      const materials = Array.isArray(shape.mesh.material) ? shape.mesh.material : [shape.mesh.material]
      materials.forEach((material) => material.dispose())
    }
    if (emoji) {
      emoji.geometries.forEach((geometry) => geometry.dispose())
      emoji.materials.forEach((material) => material.dispose())
    }
    if (character) {
      character.mesh.geometry.dispose()
      character.frontMaterial.dispose()
      character.sideMaterial.dispose()
      character.previewFrontMaterial.dispose()
      character.previewSideMaterial.dispose()
    }
  })
}

export async function updateThreeDRotation(
  canvas: Canvas,
  image: FabricImage,
  rotation: ThreeDRotation,
  commit = true,
): Promise<void> {
  if (!resolveThreeDRotationSource(image)) return
  const generation = rotationGenerationByImage.get(image) ?? 0
  pendingRotationByImage.set(image, rotation)
  if (commit) pendingRotationCommitByImage.set(image, true)
  const activeUpdate = activeRotationUpdateByImage.get(image)
  if (activeUpdate) return activeUpdate

  const update = (async () => {
    let outputCanvas = rotationCanvasByImage.get(image)
    if (!outputCanvas) {
      outputCanvas = document.createElement('canvas')
      outputCanvas.width = previewSize
      outputCanvas.height = previewSize
      rotationCanvasByImage.set(image, outputCanvas)
    }

    while (pendingRotationByImage.has(image)) {
      const nextRotation = pendingRotationByImage.get(image)!
      pendingRotationByImage.delete(image)
      const source = resolveThreeDRotationSource(image)
      if (!source) break
      const renderSize = pendingRotationCommitByImage.get(image)
        ? previewSize
        : source.type === 'character' ? characterRotationPreviewSize : rotationPreviewSize
      const frame = source.type === 'shape'
        ? await renderShapeRotationFrame(image, source.shapeKind, source.color, nextRotation, renderSize)
        : source.type === 'character'
          ? await renderThreeDCharacterFrame(source.character, source.color, nextRotation, renderSize)
          : await renderEmojiRotationFrame(image, source.emoji, nextRotation, renderSize)
      if ((rotationGenerationByImage.get(image) ?? 0) !== generation) break
      if (pendingRotationByImage.has(image)) continue
      const context = outputCanvas.getContext('2d')
      if (!context) throw new Error('Could not update the 3D preview.')
      context.clearRect(0, 0, outputCanvas.width, outputCanvas.height)
      context.drawImage(frame, 0, 0, outputCanvas.width, outputCanvas.height)
      if (image.getElement() !== outputCanvas) image.setElement(outputCanvas)
      image.set({
        threeDRotationX: nextRotation.x,
        threeDRotationY: nextRotation.y,
        threeDRotationZ: nextRotation.z,
        dirty: true,
      })
      image.setCoords()
      canvas.requestRenderAll()
    }
    if (pendingRotationCommitByImage.get(image)) {
      pendingRotationCommitByImage.delete(image)
      canvas.fire('object:modified', { target: image })
    }
  })()
  activeRotationUpdateByImage.set(image, update)
  try {
    await update
  } finally {
    activeRotationUpdateByImage.delete(image)
    if (pendingRotationByImage.has(image)) void updateThreeDRotation(canvas, image, pendingRotationByImage.get(image)!)
  }
}

export async function recolorThreeDCharacter(canvas: Canvas, image: FabricImage, character: string, color: string) {
  const requestId = ++nextCharacterColorRequest
  latestCharacterColorRequest.set(image, requestId)
  const previousUpdate = pendingCharacterColorUpdate.get(image) ?? Promise.resolve()
  const update = previousUpdate.catch(() => undefined).then(async () => {
    if (latestCharacterColorRequest.get(image) !== requestId) return
    const rotation = getThreeDRotation(image) ?? initialCharacterRotation
    const source = await renderThreeDCharacter(character, color, rotation)
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
  const { imageUrl, runtime } = await renderEmojiPreview(emoji.emoji, initialEmojiRotation)
  const image = await addRenderedImage(canvas, imageUrl, `${emoji.label} emoji`, 1.5, {
    threeDType: 'emoji',
    threeDEmoji: emoji.emoji,
    threeDRotationX: initialEmojiRotation.x,
    threeDRotationY: initialEmojiRotation.y,
    threeDRotationZ: initialEmojiRotation.z,
  }, 900)
  threeDEmojiRuntimeByImage.set(image, Promise.resolve(runtime))
}
