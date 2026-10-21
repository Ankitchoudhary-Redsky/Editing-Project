
import { Canvas, FabricImage, FabricObject } from 'fabric'
import { parseGIF, decompressFrames } from 'gifuct-js'

const stickerAnimationProperty = 'stickerAnimationId'
const stickerAnimations = new Map<
  string,
  { frames: HTMLCanvasElement[]; delays: number[] }
>()

FabricObject.customProperties = Array.from(
  new Set([...FabricObject.customProperties, stickerAnimationProperty]),
)

let nextStickerAnimationId = 1

type GifFrame = {
  dims: {
    left: number
    top: number
    width: number
    height: number
  }
  patch: Uint8ClampedArray
  delay: number
  disposalType?: number
}

type GifData = {
  lsd: {
    width: number
    height: number
  }
}

export async function addAnimatedSticker(
  fabricCanvas: Canvas,
  file: File,
): Promise<void> {
  const buffer = await file.arrayBuffer()
  const gif = parseGIF(buffer) as GifData
  const frames = decompressFrames(
    gif as Parameters<typeof decompressFrames>[0],
    true,
  ) as GifFrame[]

  if (!frames.length) {
    throw new Error('The GIF contains no frames.')
  }

  const width = gif.lsd.width
  const height = gif.lsd.height

  if (!width || !height) {
    throw new Error('Invalid GIF dimensions.')
  }

  const frameCanvases: HTMLCanvasElement[] = []
  const composedCanvas = document.createElement('canvas')
  composedCanvas.width = width
  composedCanvas.height = height
  const context = composedCanvas.getContext('2d')

  if (!context) {
    throw new Error('Could not create GIF frame canvas.')
  }

  let previousFrame: GifFrame | undefined
  let previousRestore: HTMLCanvasElement | undefined

  for (const frame of frames) {
    if (previousFrame?.disposalType === 2) {
      context.clearRect(
        previousFrame.dims.left,
        previousFrame.dims.top,
        previousFrame.dims.width,
        previousFrame.dims.height,
      )
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
    if (!patchContext) {
      throw new Error('Could not create GIF patch canvas.')
    }

    const imageData = new ImageData(
      new Uint8ClampedArray(frame.patch),
      frame.dims.width,
      frame.dims.height,
    )
    patchContext.putImageData(imageData, 0, 0)
    context.drawImage(patchCanvas, frame.dims.left, frame.dims.top)

    const frameCanvas = document.createElement('canvas')
    frameCanvas.width = width
    frameCanvas.height = height
    frameCanvas.getContext('2d')?.drawImage(composedCanvas, 0, 0)
    frameCanvases.push(frameCanvas)
    previousFrame = frame
    previousRestore = restoreCanvas
  }

  addAnimatedStickerFrames(
    fabricCanvas,
    frameCanvases,
    frames.map((frame) => frame.delay),
    width,
    height,
  )
}

export function addEmojiSticker(
  fabricCanvas: Canvas,
  emoji: string,
  motion: 'bounce' | 'pulse' | 'spin' | 'wiggle',
): void {
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
    const rotation = motion === 'spin'
      ? phase
      : motion === 'wiggle'
        ? wave * 0.18
        : 0
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

  addAnimatedStickerFrames(
    fabricCanvas,
    frameCanvases,
    frameCanvases.map(() => 70),
    180,
    180,
  )
}

function addAnimatedStickerFrames(
  fabricCanvas: Canvas,
  frameCanvases: HTMLCanvasElement[],
  delays: number[],
  width: number,
  height: number,
): void {
  const animationId = `sticker-animation-${nextStickerAnimationId++}`
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

export function restartAnimatedStickers(canvas: Canvas): void {
  canvas.getObjects().forEach((object) => {
    const animationId = object.get(stickerAnimationProperty)
    if (typeof animationId !== 'string') return

    const animation = stickerAnimations.get(animationId)
    if (!animation || !(object instanceof FabricImage)) return

    startStickerAnimation(
      canvas,
      object,
      animation.frames,
      animation.delays,
    )
  })
}

function startStickerAnimation(
  canvas: Canvas,
  sticker: FabricImage,
  frameCanvases: HTMLCanvasElement[],
  delays: number[],
): void {
  let frameIndex = 0
  let elapsed = 0
  let lastTime = performance.now()

  sticker.setElement(frameCanvases[0])
  sticker.set('dirty', true)
  canvas.requestRenderAll()

  const animate = (now: number) => {
    if (!canvas.getObjects().includes(sticker)) return

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
