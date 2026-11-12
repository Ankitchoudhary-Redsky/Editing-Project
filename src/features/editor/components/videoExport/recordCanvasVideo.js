const FPS = 30
const MAX_WIDTH = 1920
const MAX_HEIGHT = 1080
import { drawProjectWatermark } from '../../operations/projectWatermark'

function createRecordingCanvas(sourceCanvas) {
  const originalWidth = sourceCanvas.width
  const originalHeight = sourceCanvas.height

  if (!originalWidth || !originalHeight) {
    throw new Error('The Fabric canvas has no image dimensions.')
  }

  const scale = Math.min(1, MAX_WIDTH / originalWidth, MAX_HEIGHT / originalHeight)
  const width = Math.max(2, Math.floor((originalWidth * scale) / 2) * 2)
  const height = Math.max(2, Math.floor((originalHeight * scale) / 2) * 2)
  const outputCanvas = document.createElement('canvas')
  outputCanvas.width = width
  outputCanvas.height = height
  const context = outputCanvas.getContext('2d')

  if (!context) {
    throw new Error('Could not create the video canvas.')
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(sourceCanvas, 0, 0, width, height)

  return { outputCanvas, context }
}

export async function recordCanvasVideo(fabricCanvas, durationSeconds, watermark) {
  const sourceCanvas = fabricCanvas.toCanvasElement(1)
  if (watermark) await drawProjectWatermark(sourceCanvas)
  const { outputCanvas, context } = createRecordingCanvas(sourceCanvas)
  const videoStream = outputCanvas.captureStream(FPS)
  const tracks = videoStream.getTracks()
  const mimeType = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ].find((type) => MediaRecorder.isTypeSupported(type))

  if (!mimeType) {
    tracks.forEach((track) => track.stop())
    throw new Error('This browser does not support WebM recording.')
  }

  const recorder = new MediaRecorder(videoStream, { mimeType })
  const chunks = []
  let animationFrame = 0
  let timeoutId

  const cleanup = () => {
    window.clearTimeout(timeoutId)
    cancelAnimationFrame(animationFrame)
    tracks.forEach((track) => track.stop())
  }

  function drawFrame() {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, outputCanvas.width, outputCanvas.height)
    context.drawImage(sourceCanvas, 0, 0, outputCanvas.width, outputCanvas.height)
    animationFrame = requestAnimationFrame(drawFrame)
  }

  const stopRecording = () => new Promise((resolve, reject) => {
    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunks.push(event.data)
    }
    recorder.onerror = () => {
      cleanup()
      reject(new Error('Video recording failed.'))
    }
    recorder.onstop = () => {
      cleanup()
      const blob = new Blob(chunks, { type: mimeType })
      if (blob.size > 0) resolve(blob)
      else reject(new Error('Video recording returned an empty file.'))
    }

    drawFrame()
    recorder.start(1000)
    timeoutId = window.setTimeout(() => {
      if (recorder.state !== 'inactive') recorder.stop()
    }, durationSeconds * 1000 + 300)
  })

  try {
    return await stopRecording()
  } catch (error) {
    cleanup()
    throw error
  }
}
