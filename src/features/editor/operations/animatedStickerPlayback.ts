import { Canvas, FabricImage, FabricObject } from 'fabric'
import type { StickerAnimationAsset } from '../model/types'
import { createEmojiStickerFrames, decodeAnimatedSticker } from './animatedStickerFrames'
import { loadStickerAnimation, saveStickerAnimation } from './projectStorage'

const stickerAnimationProperty = 'stickerAnimationId'
const stickerAnimations = new Map<
  string,
  { frames: HTMLCanvasElement[]; delays: number[] }
>()

FabricObject.customProperties = Array.from(
  new Set([...FabricObject.customProperties, stickerAnimationProperty]),
)

let nextStickerAnimationId = 1
const animationGeneration = new WeakMap<FabricImage, number>()

export async function addAnimatedStickerFrames(
  fabricCanvas: Canvas,
  frameCanvases: HTMLCanvasElement[],
  delays: number[],
  width: number,
  height: number,
  asset: StickerAnimationAsset,
): Promise<void> {
  const animationId = `sticker-animation-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${nextStickerAnimationId++}`}`
  await saveStickerAnimation(animationId, asset)
  stickerAnimations.set(animationId, { frames: frameCanvases, delays })

  const sticker = new FabricImage(frameCanvases[0], {
    left: Math.max(0, (fabricCanvas.getWidth() - width) / 2),
    top: Math.max(0, (fabricCanvas.getHeight() - height) / 2),
    scaleX: Math.min(1, 180 / width),
    scaleY: Math.min(1, 180 / height),
    selectable: true,
    evented: true,
  })
  sticker.set(stickerAnimationProperty, animationId)

  fabricCanvas.add(sticker)
  fabricCanvas.setActiveObject(sticker)
  fabricCanvas.requestRenderAll()
  startStickerAnimation(fabricCanvas, sticker, frameCanvases, delays)
}

export async function restartAnimatedStickers(canvas: Canvas): Promise<void> {
  await Promise.all(canvas.getObjects().map(async (object) => {
    const animationId = object.get(stickerAnimationProperty)
    if (typeof animationId !== 'string' || !(object instanceof FabricImage)) return

    let animation = stickerAnimations.get(animationId)
    if (!animation) {
      try {
        const asset = await loadStickerAnimation(animationId)
        if (!asset || !canvas.getObjects().includes(object)) return
        const decoded = asset.kind === 'gif'
          ? await decodeAnimatedSticker(asset.source)
          : createEmojiStickerFrames(asset.emoji, asset.motion)
        animation = { frames: decoded.frameCanvases, delays: decoded.delays }
        stickerAnimations.set(animationId, animation)
      } catch {
        return
      }
    }

    if (canvas.getObjects().includes(object)) {
      startStickerAnimation(canvas, object, animation.frames, animation.delays)
    }
  }))
}

function startStickerAnimation(
  canvas: Canvas,
  sticker: FabricImage,
  frameCanvases: HTMLCanvasElement[],
  delays: number[],
): void {
  const generation = (animationGeneration.get(sticker) ?? 0) + 1
  animationGeneration.set(sticker, generation)
  let frameIndex = 0
  let elapsed = 0
  let lastTime = performance.now()

  sticker.setElement(frameCanvases[0])
  sticker.set('dirty', true)
  canvas.requestRenderAll()

  const animate = (now: number) => {
    if (animationGeneration.get(sticker) !== generation) return
    if (!canvas.getObjects().includes(sticker)) {
      animationGeneration.set(sticker, generation + 1)
      return
    }

    elapsed += now - lastTime
    lastTime = now
    const delay = Math.max(20, delays[frameIndex] || 100)
    if (elapsed >= delay) {
      elapsed %= delay
      frameIndex = (frameIndex + 1) % frameCanvases.length
      sticker.setElement(frameCanvases[frameIndex])
      sticker.set('dirty', true)
      canvas.requestRenderAll()
    }
    requestAnimationFrame(animate)
  }

  requestAnimationFrame(animate)
}