import type { Canvas } from 'fabric'
import '../../editor/operations/EditableThreeDShape'
import '../../editor/operations/EditableThreeDEmoji'
import type { EditorTemplate } from '../model/template.types'
import { loadTemplateAsset } from '../services/templateStorage'
import { hydrateTemplateFabricData } from '../services/templateSerializer'

const loadGeneration = new WeakMap<Canvas, number>()
const loadQueue = new WeakMap<Canvas, Promise<void>>()

export async function loadTemplate(canvas: Canvas, template: EditorTemplate): Promise<boolean> {
  const generation = (loadGeneration.get(canvas) ?? 0) + 1
  loadGeneration.set(canvas, generation)
  const previousLoad = loadQueue.get(canvas) ?? Promise.resolve()

  const operation = previousLoad.catch(() => {}).then(async () => {
    if (loadGeneration.get(canvas) !== generation) return false
    const fabricData = await hydrateTemplateFabricData(template, loadTemplateAsset)
    const scene = fabricData.scene
    if (!Array.isArray(scene.objects)) throw new Error('This template has no editable Fabric objects.')
    const previous = {
      width: canvas.getWidth(),
      height: canvas.getHeight(),
      scene: canvas.toObject([
        'name', 'textAnimation', 'shapeId', 'textParentId', 'textParentWidth',
        'textParentHeight', 'textParentFontSize', 'imageParentId', 'threeDType',
        'threeDShapeKind', 'threeDCharacter', 'threeDEmoji', 'threeDColor',
        'threeDRotationX', 'threeDRotationY', 'threeDRotationZ', 'emojiId',
        'emojiModelPath', 'emojiRotationX', 'emojiRotationY', 'emojiRotationZ',
      ]),
    }

    try {
      canvas.discardActiveObject()
      canvas.setDimensions({ width: fabricData.width, height: fabricData.height })
      await canvas.loadFromJSON(scene as Parameters<Canvas['loadFromJSON']>[0])
      if (loadGeneration.get(canvas) !== generation) return false
      canvas.getObjects().forEach((object) => object.setCoords())
      canvas.requestRenderAll()
      return true
    } catch (error) {
      canvas.setDimensions({ width: previous.width, height: previous.height })
      try {
        await canvas.loadFromJSON(previous.scene as Parameters<Canvas['loadFromJSON']>[0])
        canvas.requestRenderAll()
      } catch {
        throw new Error('The template could not be loaded and the previous design could not be restored.')
      }
      throw new Error(error instanceof Error ? error.message : 'This template could not be loaded.', { cause: error })
    }
  })

  loadQueue.set(canvas, operation.then(() => undefined, () => undefined))
  return operation
}