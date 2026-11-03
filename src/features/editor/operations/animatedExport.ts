import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import type { Canvas } from 'fabric'
import { drawProjectWatermark } from './projectWatermark'

export type AnimatedExportFormat = 'gif' | 'mp4'

export async function exportAnimatedCanvas(
  canvas: Canvas,
  format: AnimatedExportFormat,
  scale: number,
  watermark: boolean,
): Promise<Blob> {
  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
    throw new Error('Animated export is not supported in this browser.')
  }

  const width = Math.max(2, Math.round(canvas.getWidth() * scale))
  const height = Math.max(2, Math.round(canvas.getHeight() * scale))
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = width
  outputCanvas.height = height
  const context = outputCanvas.getContext('2d')
  if (!context) throw new Error('Could not create the animated export canvas.')

  const watermarkCanvas = watermark ? document.createElement('canvas') : null
  if (watermarkCanvas) {
    watermarkCanvas.width = width
    watermarkCanvas.height = height
    await drawProjectWatermark(watermarkCanvas)
  }

  const stream = outputCanvas.captureStream(24)
  const tracks = stream.getTracks()
  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((type) => MediaRecorder.isTypeSupported(type))
  if (!mimeType) {
    tracks.forEach((track) => track.stop())
    throw new Error('This browser cannot record animated exports.')
  }

  const recorder = new MediaRecorder(stream, { mimeType })
  const chunks: BlobPart[] = []
  let animationFrame = 0
  let timeoutId = 0

  const recording = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data)
    }
    recorder.onerror = () => reject(new Error('Could not record the animated canvas.'))
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }))

    const drawFrame = () => {
      context.clearRect(0, 0, width, height)
      if (format === 'mp4') {
        context.fillStyle = '#ffffff'
        context.fillRect(0, 0, width, height)
      }
      context.drawImage(canvas.lowerCanvasEl, 0, 0, width, height)
      if (watermarkCanvas) context.drawImage(watermarkCanvas, 0, 0)
      animationFrame = requestAnimationFrame(drawFrame)
    }

    recorder.start(100)
    drawFrame()
    timeoutId = window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop()
    }, 2800)
  })

  let webm: Blob
  try {
    webm = await recording
  } finally {
    window.clearTimeout(timeoutId)
    cancelAnimationFrame(animationFrame)
    tracks.forEach((track) => track.stop())
  }

  const ffmpeg = new FFmpeg()
  const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  })

  try {
    await ffmpeg.writeFile('input.webm', await fetchFile(webm))
    if (format === 'gif') {
      const gifWidth = Math.min(800, width)
      await ffmpeg.exec([
        '-i', 'input.webm',
        '-filter_complex', `fps=12,scale=${gifWidth}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse`,
        '-loop', '0',
        'output.gif',
      ])
      const output = await ffmpeg.readFile('output.gif')
      const bytes = typeof output === 'string' ? new TextEncoder().encode(output) : Uint8Array.from(output)
      return new Blob([bytes.buffer as ArrayBuffer], { type: 'image/gif' })
    }

    await ffmpeg.exec([
      '-i', 'input.webm',
      '-an',
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-pix_fmt', 'yuv420p',
      '-movflags', '+faststart',
      '-r', '24',
      'output.mp4',
    ])
    const output = await ffmpeg.readFile('output.mp4')
    const bytes = typeof output === 'string' ? new TextEncoder().encode(output) : Uint8Array.from(output)
    return new Blob([bytes.buffer as ArrayBuffer], { type: 'video/mp4' })
  } finally {
    await ffmpeg.terminate()
  }
}