import { FabricObject, Rect, classRegistry, type RectProps, type TPointerEvent } from 'fabric'
import type * as THREE_TYPES from 'three'
import {
  createSharedThreeDScene,
  createThreeDRotationControl,
  prepareThreeDShapes,
  renderSharedThreeDScene,
} from './EditableThreeDShape'
import { getThreeDEmojiAsset, type ThreeDEmojiAsset } from './threeDEmojiAssets'
import { loadThreeDEmojiModel } from './threeDEmojiLoader'

type EditableThreeDEmojiOptions = Partial<RectProps> & {
  name?: string
  emojiId?: string
  emojiModelPath?: string
  emojiRotationX?: number
  emojiRotationY?: number
  emojiRotationZ?: number
}

const customProperties = ['emojiId', 'emojiModelPath', 'emojiRotationX', 'emojiRotationY', 'emojiRotationZ']
FabricObject.customProperties = Array.from(new Set([...FabricObject.customProperties, ...customProperties]))

type RotationAxis = 'xy' | 'z'

function getClientPoint(event: TPointerEvent) {
  if ('clientX' in event) return { x: event.clientX, y: event.clientY }
  const touch = event.changedTouches[0]
  return touch ? { x: touch.clientX, y: touch.clientY } : null
}

function disposeModel(model: THREE_TYPES.Object3D) {
  const geometries = new Set<THREE_TYPES.BufferGeometry>()
  const materials = new Set<THREE_TYPES.Material>()
  const textures = new Set<THREE_TYPES.Texture>()
  model.traverse((object) => {
    if (!(object instanceof getThreeTypes().Mesh)) return
    geometries.add(object.geometry)
    const list = Array.isArray(object.material) ? object.material : [object.material]
    list.forEach((material) => {
      materials.add(material)
      Object.values(material).forEach((value) => {
        if (value instanceof getThreeTypes().Texture) textures.add(value)
      })
    })
  })
  geometries.forEach((geometry) => geometry.dispose())
  materials.forEach((material) => material.dispose())
  textures.forEach((texture) => texture.dispose())
}

let threeTypes: typeof import('three') | null = null

function getThreeTypes() {
  if (!threeTypes) throw new Error('Three.js emoji dependencies are not ready.')
  return threeTypes
}

export class EditableThreeDEmoji extends Rect {
  static type = 'EditableThreeDEmoji'
  static cacheProperties = [...Rect.cacheProperties, ...customProperties]

  emojiId: string
  emojiModelPath: string
  emojiRotationX: number
  emojiRotationY: number
  emojiRotationZ: number
  private scene: THREE_TYPES.Scene
  private camera: THREE_TYPES.PerspectiveCamera
  private model: THREE_TYPES.Object3D | null = null
  private rotationDrag: { axis: RotationAxis; lastX: number; lastY: number } | null = null
  private disposed = false

  private constructor(asset: ThreeDEmojiAsset, options: EditableThreeDEmojiOptions = {}) {
    super({
      width: 200,
      height: 200,
      fill: 'rgba(0,0,0,0)',
      stroke: null,
      originX: 'center',
      originY: 'center',
      lockUniScaling: true,
      ...options,
    } as Partial<RectProps>)
    const THREE = getThreeTypes()
    this.emojiId = asset.id
    this.emojiModelPath = asset.modelPath
    this.emojiRotationX = options.emojiRotationX ?? -8
    this.emojiRotationY = options.emojiRotationY ?? 12
    this.emojiRotationZ = options.emojiRotationZ ?? 0
    this.scene = createSharedThreeDScene()
    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100)
    this.camera.position.set(0, 0, 4.2)
    this.camera.lookAt(0, 0, 0)
    this.controls = {
      ...this.controls,
      rotate3d: createThreeDRotationControl(
        (object): object is EditableThreeDEmoji => object instanceof EditableThreeDEmoji,
      ),
    }
  }

  static async create(asset: ThreeDEmojiAsset, options: EditableThreeDEmojiOptions = {}) {
    await prepareThreeDShapes()
    const module = await import('three')
    threeTypes = module
    const object = new EditableThreeDEmoji(asset, options)
    await object.loadModel()
    return object
  }

  private async loadModel() {
    const THREE = getThreeTypes()
    const gltf = await loadThreeDEmojiModel(this.emojiId)
    if (this.disposed) {
      disposeModel(gltf.scene)
      return
    }
    const bounds = new THREE.Box3().setFromObject(gltf.scene)
    const center = bounds.getCenter(new THREE.Vector3())
    const size = bounds.getSize(new THREE.Vector3())
    const maxDimension = Math.max(size.x, size.y, size.z, 0.001)
    gltf.scene.position.sub(center)
    gltf.scene.scale.multiplyScalar(1.75 / maxDimension)
    this.model = gltf.scene
    this.scene.add(gltf.scene)
    this.updateModelRotation()
    this.dirty = true
    this.setCoords()
  }

  private updateModelRotation() {
    const THREE = getThreeTypes()
    if (!this.model) return
    this.model.rotation.set(
      THREE.MathUtils.degToRad(this.emojiRotationX),
      THREE.MathUtils.degToRad(this.emojiRotationY),
      THREE.MathUtils.degToRad(this.emojiRotationZ),
    )
  }

  rotateFromDrag(deltaX: number, deltaY: number, rotateAroundZ = false) {
    const degreesPerPixel = 0.7
    if (rotateAroundZ) this.emojiRotationZ += (deltaX - deltaY) * degreesPerPixel
    else {
      this.emojiRotationY += deltaX * degreesPerPixel
      this.emojiRotationX += deltaY * degreesPerPixel
    }
    this.updateModelRotation()
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
    this.rotateFromDrag(deltaX, deltaY, 'shiftKey' in event && event.shiftKey === true)
    this.canvas?.requestRenderAll()
    return true
  }

  finishRotationDrag() {
    this.rotationDrag = null
  }

  _render(context: CanvasRenderingContext2D) {
    if (!this.model) return
    const THREE = getThreeTypes()
    this.camera.aspect = Math.max(0.1, this.width / Math.max(1, this.height))
    this.camera.position.set(0, 0, 4.2)
    this.camera.lookAt(0, 0, 0)
    this.camera.updateProjectionMatrix()
    void THREE
    renderSharedThreeDScene(context, this.scene, this.camera, this.width, this.height)
  }

  releaseThreeDResources() {
    if (this.disposed) return
    this.disposed = true
    if (this.model) disposeModel(this.model)
    this.model?.removeFromParent()
    this.model = null
    this.rotationDrag = null
  }

  override dispose() {
    this.releaseThreeDResources()
    super.dispose()
  }

  static async fromObject(object: Record<string, unknown>) {
    const properties = { ...object }
    delete properties.type
    const emojiId = String(properties.emojiId ?? '')
    const asset = getThreeDEmojiAsset(emojiId)
    if (!asset) throw new Error(`Saved 3D emoji asset is unavailable: ${emojiId}`)
    return EditableThreeDEmoji.create(asset, properties as EditableThreeDEmojiOptions)
  }
}

classRegistry.setClass(EditableThreeDEmoji)