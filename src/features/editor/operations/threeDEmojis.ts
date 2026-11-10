import type { Canvas } from 'fabric'
import type { ThreeDEmojiAsset } from './threeDEmojiAssets'
import { EditableThreeDEmoji } from './EditableThreeDEmoji'

export async function addThreeDEmoji(canvas: Canvas, asset: ThreeDEmojiAsset) {
  const object = await EditableThreeDEmoji.create(asset, {
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    width: 200,
    height: 200,
    name: `3D Emoji ${asset.displayName}`,
  })
  canvas.add(object)
  canvas.setActiveObject(object)
  canvas.requestRenderAll()
  return object
}
