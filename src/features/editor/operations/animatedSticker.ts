
import { Canvas } from 'fabric'
import { addAnimatedStickerFrames } from './animatedStickerPlayback'
import { createEmojiStickerFrames, decodeAnimatedSticker } from './animatedStickerFrames'

export async function addAnimatedSticker(
  fabricCanvas: Canvas,
  file: File,
): Promise<void> {
  const { frameCanvases, delays, width, height } = await decodeAnimatedSticker(file)
  await addAnimatedStickerFrames(fabricCanvas, frameCanvases, delays, width, height, {
    kind: 'gif',
    source: file,
  })
}

export function addEmojiSticker(
  fabricCanvas: Canvas,
  emoji: string,
  motion: 'bounce' | 'pulse' | 'spin' | 'wiggle',
): Promise<void> {
  const { frameCanvases, delays, width, height } = createEmojiStickerFrames(emoji, motion)
  return addAnimatedStickerFrames(fabricCanvas, frameCanvases, delays, width, height, {
    kind: 'emoji',
    emoji,
    motion,
  })
}

