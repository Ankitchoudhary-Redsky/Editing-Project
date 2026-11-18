import type { Canvas } from 'fabric'
import type { ThreeDEmojiAsset } from './threeDEmojiAssets'
import { EditableThreeDEmoji } from './EditableThreeDEmoji'

export async function addThreeDEmoji(canvas: Canvas, asset: ThreeDEmojiAsset, position?: { left: number; top: number }) {
  const size = Math.min(900, Math.max(120, Math.min(canvas.getWidth(), canvas.getHeight()) * 0.63))
  const object = await EditableThreeDEmoji.create(asset, {
    left: position?.left ?? canvas.getWidth() / 2,
    top: position?.top ?? canvas.getHeight() / 2,
    width: size,
    height: size,
    name: `3D Emoji ${asset.displayName}`,
  })
  canvas.add(object)
  canvas.setActiveObject(object)
  canvas.requestRenderAll()
  return object
}
