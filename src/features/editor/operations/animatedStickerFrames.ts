import { decompressFrames, parseGIF } from 'gifuct-js'
import type { AnimatedStickerFrames, GifData, GifFrame } from '../model/types'

export async function decodeAnimatedSticker(source: Blob): Promise<AnimatedStickerFrames> {
  const buffer = await source.arrayBuffer()
  const gif = parseGIF(buffer) as GifData
  const frames = decompressFrames(
    gif as Parameters<typeof decompressFrames>[0],
    true,
  ) as GifFrame[]

  if (!frames.length) throw new Error('The GIF contains no frames.')
  const width = gif.lsd.width
  const height = gif.lsd.height
  if (!width || !height) throw new Error('Invalid GIF dimensions.')

  const frameCanvases: HTMLCanvasElement[] = []
  const composedCanvas = document.createElement('canvas')
  composedCanvas.width = width
  composedCanvas.height = height
  const context = composedCanvas.getContext('2d')
  if (!context) throw new Error('Could not create GIF frame canvas.')

  let previousFrame: GifFrame | undefined
  let previousRestore: HTMLCanvasElement | undefined

  for (const frame of frames) {
    if (previousFrame?.disposalType === 2) {
      context.clearRect(previousFrame.dims.left, previousFrame.dims.top, previousFrame.dims.width, previousFrame.dims.height)
    } else if (previousFrame?.disposalType === 3 && previousRestore) {
      context.clearRect(0, 0, width, height)
      context.drawImage(previousRestore, 0, 0)
    }

    let restoreCanvas: HTMLCanvasElement | undefined
    if (frame.disposalType === 3) {
      restoreCanvas = document.createElement('canvas')
      restoreCanvas.width = width
      restoreCanvas.height = height
      restoreCanvas.getContext('2d')?.drawImage(composedCanvas, 0, 0)
    }

    const patchCanvas = document.createElement('canvas')
    patchCanvas.width = frame.dims.width
    patchCanvas.height = frame.dims.height
    const patchContext = patchCanvas.getContext('2d')
    if (!patchContext) throw new Error('Could not create GIF patch canvas.')
    patchContext.putImageData(
      new ImageData(new Uint8ClampedArray(frame.patch), frame.dims.width, frame.dims.height),
      0,
      0,
    )
    context.drawImage(patchCanvas, frame.dims.left, frame.dims.top)

    const frameCanvas = document.createElement('canvas')
    frameCanvas.width = width
    frameCanvas.height = height
    frameCanvas.getContext('2d')?.drawImage(composedCanvas, 0, 0)
    frameCanvases.push(frameCanvas)
    previousFrame = frame
    previousRestore = restoreCanvas
  }

  return { frameCanvases, delays: frames.map((frame) => frame.delay), width, height }
}

export function createEmojiStickerFrames(
  emoji: string,
  motion: 'bounce' | 'pulse' | 'spin' | 'wiggle',
): AnimatedStickerFrames {
  const frameCount = 12
  const frameCanvases = Array.from({ length: frameCount }, (_, index) => {
    const frameCanvas = document.createElement('canvas')
    frameCanvas.width = 180
    frameCanvas.height = 180
    const context = frameCanvas.getContext('2d')
    if (!context) throw new Error('Could not create sticker frame canvas.')

    const phase = (index / frameCount) * Math.PI * 2
    const wave = Math.sin(phase)
    const scale = motion === 'pulse' ? 1 + (wave + 1) * 0.07 : 1
    const rotation = motion === 'spin' ? phase : motion === 'wiggle' ? wave * 0.18 : 0
    const offsetY = motion === 'bounce' ? -Math.abs(wave) * 15 : 0
    context.translate(90, 90 + offsetY)
    context.rotate(rotation)
    context.scale(scale, scale)
    context.font = '132px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'
    context.textAlign = 'center'
    context.textBaseline = 'middle'
    context.fillText(emoji, 0, 0)
    return frameCanvas
  })

  return { frameCanvases, delays: frameCanvases.map(() => 70), width: 180, height: 180 }
}