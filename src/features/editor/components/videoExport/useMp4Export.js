import { useEffect, useRef, useState } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { recordCanvasVideo } from './recordCanvasVideo'
import { FPS, getAudioExtension } from './videoExportUtils'

export function useMp4Export({
  fabricCanvas,
  hasCanvasImage,
  audioRef,
  voiceAudioRef,
  musicFile,
  voiceFile,
  audioDuration,
  voiceDuration,
  validAudioRange,
  startTime,
  endTime,
  volume,
  voiceVolume,
  stopPreview,
  setError,
}) {
  const [status, setStatus] = useState('idle')
  const [progressText, setProgressText] = useState('')
  const ffmpegRef = useRef(null)
  const ffmpegLoadedRef = useRef(false)
  const segmentDuration = endTime - startTime
  const busy = status === 'recording' || status === 'converting'

  useEffect(() => () => {
    ffmpegRef.current?.terminate()
  }, [])

  async function loadFFmpeg() {
    if (ffmpegLoadedRef.current) return ffmpegRef.current

    setProgressText('Loading MP4 converter...')
    const ffmpeg = new FFmpeg()
    ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message)
    })

    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm'
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    })

    ffmpegRef.current = ffmpeg
    ffmpegLoadedRef.current = true
    return ffmpeg
  }

  async function exportVideo() {
    if (!hasCanvasImage) {
      setError('Please add an image to the editor before exporting.')
      return
    }

    if (
      (!musicFile && !voiceFile) ||
      (musicFile && (!audioRef.current || audioDuration <= 0)) ||
      (!musicFile && (!voiceAudioRef.current || voiceDuration <= 0))
    ) {
      setError('Please add background music or a voice-over first.')
      return
    }

    if (!validAudioRange) {
      setError('Choose a valid audio segment before exporting.')
      return
    }

    if (
      typeof fabricCanvas.toCanvasElement !== 'function' ||
      typeof HTMLCanvasElement.prototype.captureStream !== 'function' ||
      typeof MediaRecorder === 'undefined'
    ) {
      setError('Canvas video recording is not supported in this browser.')
      return
    }

    let ffmpeg
    const temporaryFiles = []

    try {
      stopPreview()
      setError('')
      setStatus('recording')
      setProgressText('Rendering edited image...')

      const webmBlob = await recordCanvasVideo(fabricCanvas, segmentDuration + 2)
      setStatus('converting')
      ffmpeg = await loadFFmpeg()
      setProgressText(
        musicFile && voiceFile
          ? 'Mixing music and voice-over, then converting to MP4...'
          : musicFile
            ? 'Trimming music and converting to MP4...'
            : 'Trimming voice-over and converting to MP4...'
      )

      await ffmpeg.writeFile('input.webm', await fetchFile(webmBlob))
      temporaryFiles.push('input.webm')
      const ffmpegArgs = ['-y', '-i', 'input.webm']

      if (musicFile) {
        const audioInput = `input-audio.${getAudioExtension(musicFile)}`
        await ffmpeg.writeFile(audioInput, await fetchFile(musicFile))
        temporaryFiles.push(audioInput)
        ffmpegArgs.push('-i', audioInput)
      } else {
        const voiceInput = `input-voice.${getAudioExtension(voiceFile)}`
        await ffmpeg.writeFile(voiceInput, await fetchFile(voiceFile))
        temporaryFiles.push(voiceInput)
        ffmpegArgs.push('-i', voiceInput)
      }

      let audioFilter
      if (musicFile && voiceFile) {
        const voiceInput = `input-voice.${getAudioExtension(voiceFile)}`
        await ffmpeg.writeFile(voiceInput, await fetchFile(voiceFile))
        temporaryFiles.push(voiceInput)
        ffmpegArgs.push('-i', voiceInput)
        audioFilter =
          `[1:a:0]atrim=start=${startTime}:end=${endTime},` +
          `asetpts=PTS-STARTPTS,volume=${volume / 100}[music];` +
          `[2:a:0]atrim=duration=${segmentDuration},` +
          `asetpts=PTS-STARTPTS,volume=${voiceVolume / 100}[voice];` +
          '[music][voice]amix=inputs=2:duration=first:' +
          'dropout_transition=0:normalize=0[audio]'
      } else if (musicFile) {
        audioFilter =
          `[1:a:0]atrim=start=${startTime}:end=${endTime},` +
          `asetpts=PTS-STARTPTS,volume=${volume / 100}[audio]`
      } else {
        audioFilter =
          `[1:a:0]atrim=start=${startTime}:end=${endTime},` +
          `asetpts=PTS-STARTPTS,volume=${voiceVolume / 100}[audio]`
      }

      ffmpegArgs.push('-filter_complex', audioFilter, '-map', '0:v:0', '-map', '[audio]')
      temporaryFiles.push('output.mp4')
      await ffmpeg.exec([
        ...ffmpegArgs,
        '-t',
        String(segmentDuration),
        '-c:v',
        'libx264',
        '-preset',
        'ultrafast',
        '-pix_fmt',
        'yuv420p',
        '-r',
        String(FPS),
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        '-ar',
        '44100',
        '-movflags',
        '+faststart',
        'output.mp4',
      ])

      const output = await ffmpeg.readFile('output.mp4')
      const mp4Blob = new Blob([output], { type: 'video/mp4' })
      if (!mp4Blob.size) throw new Error('MP4 conversion returned an empty file.')

      const previewUrl = URL.createObjectURL(mp4Blob)
      const link = document.createElement('a')
      link.href = previewUrl
      link.download = `photo-video-${Math.floor(startTime)}-${Math.floor(endTime)}.mp4`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setStatus('done')
      setProgressText('MP4 video downloaded successfully.')
      window.setTimeout(() => URL.revokeObjectURL(previewUrl), 60000)
    } catch (error) {
      console.error('Video export failed:', error)
      setStatus('error')
      setError(error?.message || 'Video export failed. Try a smaller image or a supported audio file.')
      setProgressText('')
    } finally {
      if (ffmpeg) {
        await Promise.all(temporaryFiles.map((file) => ffmpeg.deleteFile(file).catch(() => {})))
      }
    }
  }

  function resetExportState() {
    setStatus('idle')
    setProgressText('')
  }

  return { status, progressText, busy, exportVideo, resetExportState }
}
