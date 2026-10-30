import { useRef, useState } from 'react'
import { Download, Scissors } from 'lucide-react'
import { useEditor } from '../../../editor/EditorContext'

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`
}

export function VideoTrimPanel() {
  const { videoClip } = useEditor()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState('')
  const duration = videoClip.duration
  const trimEnd = videoClip.trimEnd || duration
  const selectedDuration = trimEnd - videoClip.trimStart

  const updateStart = (value: number) => {
    videoClip.setTrimStart(Math.max(0, Math.min(value, trimEnd - 0.1)))
    setError('')
  }

  const updateEnd = (value: number) => {
    videoClip.setTrimEnd(Math.min(duration, Math.max(value, videoClip.trimStart + 0.1)))
    setError('')
  }

  const exportTrim = async () => {
    const video = videoRef.current as (HTMLVideoElement & { captureStream?: () => MediaStream; mozCaptureStream?: () => MediaStream }) | null
    if (!video || !videoClip.file || selectedDuration <= 0) return

    const capture = video.captureStream ?? video.mozCaptureStream
    if (!capture || typeof MediaRecorder === 'undefined') {
      setError('Video recording is not supported in this browser.')
      return
    }

    const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
      .find((type) => MediaRecorder.isTypeSupported(type))
    if (!mimeType) {
      setError('This browser cannot export WebM video.')
      return
    }

    setIsExporting(true)
    videoClip.setTrimming(true)
    setError('')
    video.pause()

    try {
      if (Math.abs(video.currentTime - videoClip.trimStart) > 0.05) {
        await new Promise<void>((resolve) => {
          video.addEventListener('seeked', () => resolve(), { once: true })
          video.currentTime = videoClip.trimStart
        })
      }

      const stream = capture.call(video)
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: BlobPart[] = []
      const recorded = new Promise<Blob>((resolve, reject) => {
        const stopAtTrimEnd = () => {
          if (video.currentTime >= trimEnd && recorder.state !== 'inactive') recorder.stop()
        }
        const stopTimer = window.setTimeout(() => {
          if (recorder.state !== 'inactive') recorder.stop()
        }, selectedDuration * 1000 + 4000)

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunks.push(event.data)
        }
        recorder.onerror = () => {
          window.clearTimeout(stopTimer)
          video.removeEventListener('timeupdate', stopAtTrimEnd)
          stream.getTracks().forEach((track) => track.stop())
          reject(new Error('Could not record this video segment.'))
        }
        recorder.onstop = () => {
          window.clearTimeout(stopTimer)
          video.removeEventListener('timeupdate', stopAtTrimEnd)
          stream.getTracks().forEach((track) => track.stop())
          const blob = new Blob(chunks, { type: mimeType })
          if (blob.size) resolve(blob)
          else reject(new Error('The trimmed video was empty.'))
        }

        video.addEventListener('timeupdate', stopAtTrimEnd)
        recorder.start(250)
      })

      try {
        await video.play()
      } catch (playError) {
        if (recorder.state !== 'inactive') recorder.stop()
        await recorded.catch(() => {})
        throw playError
      }
      const blob = await recorded
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const baseName = videoClip.file.name.replace(/\.[^.]+$/, '') || 'video'
      link.href = downloadUrl
      link.download = `${baseName}-trimmed.webm`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000)
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : 'Video export failed.')
    } finally {
      video.pause()
      setIsExporting(false)
      videoClip.setTrimming(false)
    }
  }

  if (!videoClip.url) {
    return <div className="panel-content"><p className="panel-note">Upload a video before opening the trim tool.</p></div>
  }

  return (
    <div className="panel-content video-trim-content">
      <video
        ref={videoRef}
        className="visually-hidden"
        src={videoClip.url}
        preload="metadata"
        onLoadedMetadata={(event) => videoClip.setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime >= trimEnd) {
            event.currentTarget.pause()
            event.currentTarget.currentTime = videoClip.trimStart
          }
        }}
        aria-hidden="true"
      />
      <div className="video-trim-heading"><Scissors size={16} /><span>Choose a clip range</span></div>
      <div className="video-trim-fields">
        <label>Start <span>{formatTime(videoClip.trimStart)}</span>
          <input type="range" min="0" max={Math.max(duration, 0.1)} step="0.1" value={videoClip.trimStart} onChange={(event) => updateStart(Number(event.target.value))} disabled={!duration || isExporting} />
        </label>
        <label>End <span>{formatTime(trimEnd)}</span>
          <input type="range" min="0" max={Math.max(duration, 0.1)} step="0.1" value={trimEnd} onChange={(event) => updateEnd(Number(event.target.value))} disabled={!duration || isExporting} />
        </label>
      </div>
      <div className="video-trim-summary"><span>Selected duration</span><strong>{selectedDuration > 0 ? formatTime(selectedDuration) : '--:--'}</strong></div>
      <button className="primary-button video-export-button" onClick={() => void exportTrim()} disabled={!duration || selectedDuration <= 0 || isExporting}>
        <Download size={15} />{isExporting ? 'Exporting clip...' : 'Download trimmed WebM'}
      </button>
      <p className="panel-note">The selected segment is exported with its original audio. The source video is not changed.</p>
      {error && <p className="export-error" role="alert">{error}</p>}
    </div>
  )
}