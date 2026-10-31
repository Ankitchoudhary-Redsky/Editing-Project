import { useEffect, useRef } from 'react'
import { useState } from 'react'
import { ArrowLeft, Download, FileImage, Pause, Play, Volume2, X } from 'lucide-react'
import { useEditor } from '../EditorContext'

function formatPreviewTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(safeSeconds / 60)
  const remainingSeconds = safeSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

function playPreviewTracks(
  music: HTMLAudioElement,
  voice: HTMLAudioElement | null,
  video: NonNullable<ReturnType<typeof useEditor>['preview']['video']>,
): Promise<void[]> {
  const tracks = [music, ...(voice && video.voiceOverUrl ? [voice] : [])]
  const ready = tracks.every(
    (track) => track.readyState >= HTMLMediaElement.HAVE_METADATA,
  )

  if (!ready) {
    return Promise.all(
      tracks.map(
        (track) =>
          new Promise<void>((resolve, reject) => {
            if (track.readyState >= HTMLMediaElement.HAVE_METADATA) {
              resolve()
            } else if (track.error) {
              reject(new Error('Could not load a preview audio track.'))
            } else {
              track.addEventListener('loadedmetadata', () => resolve(), { once: true })
              track.addEventListener('error', () => reject(new Error('Could not load a preview audio track.')), { once: true })
            }
          }),
      ),
    ).then(() => playPreviewTracks(music, voice, video))
  }

  music.currentTime = video.startTime
  music.volume = video.volume / 100

  if (voice && video.voiceOverUrl) {
    voice.currentTime = video.voiceOverStartTime ?? 0
    voice.volume = (video.voiceOverVolume ?? 100) / 100
  }

  return Promise.all([
    music.play(),
    voice && video.voiceOverUrl ? voice.play() : Promise.resolve(),
  ]).catch((error: unknown) => {
    music.pause()
    voice?.pause()
    throw error
  })
}

function VideoPreviewPlayer({ video }: { video: NonNullable<ReturnType<typeof useEditor>['preview']['video']> }) {
  const musicRef = useRef<HTMLAudioElement>(null)
  const voiceRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const duration = Math.max(0, video.endTime - video.startTime)

  useEffect(() => {
    const music = musicRef.current
    const voice = voiceRef.current
    let cancelled = false
    if (!music || !video.audioUrl) return

    void playPreviewTracks(music, voice, video)
      .then(() => {
        if (!cancelled) setIsPlaying(true)
        else {
          music.pause()
          voice?.pause()
        }
      })
      .catch(() => {
        if (!cancelled) setIsPlaying(false)
      })

    return () => {
      cancelled = true
      music.pause()
      voice?.pause()
    }
  }, [video])

  function handleTimeUpdate() {
    const music = musicRef.current
    const voice = voiceRef.current
    if (!music) return

    if (music.currentTime >= video.endTime) {
      music.pause()
      music.currentTime = video.endTime
      voice?.pause()
      setElapsed(duration)
      setIsPlaying(false)
      return
    }

    if (music.currentTime < video.startTime) {
      music.currentTime = video.startTime
      return
    }

    const currentElapsed = Math.min(duration, music.currentTime - video.startTime)
    setElapsed(currentElapsed)

    if (voice && video.voiceOverUrl && !voice.paused && voice.readyState >= HTMLMediaElement.HAVE_METADATA) {
      const expectedVoiceTime = (video.voiceOverStartTime ?? 0) + currentElapsed
      if (expectedVoiceTime < voice.duration && Math.abs(voice.currentTime - expectedVoiceTime) > 0.2) {
        voice.currentTime = expectedVoiceTime
      }
    }
  }

  function togglePlayback() {
    const music = musicRef.current
    const voice = voiceRef.current
    if (!music) return

    if (music.paused) {
      void playPreviewTracks(music, voice, video)
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    } else {
      music.pause()
      voice?.pause()
      setIsPlaying(false)
    }
  }

  function seekPreview(value: number) {
    const music = musicRef.current
    const voice = voiceRef.current
    if (!music) return

    const nextElapsed = Math.max(0, Math.min(duration, value))
    music.currentTime = video.startTime + nextElapsed
    setElapsed(nextElapsed)

    if (nextElapsed >= duration) {
      music.pause()
      voice?.pause()
      setIsPlaying(false)
      return
    }

    if (voice && video.voiceOverUrl) {
      const voiceTime = (video.voiceOverStartTime ?? 0) + nextElapsed
      if (voiceTime < voice.duration) {
        voice.currentTime = voiceTime
        if (isPlaying && voice.paused) void voice.play().catch(() => {})
      } else {
        voice.pause()
      }
    }
  }

  return (
    <div className="video-preview-player">
      <audio
        ref={musicRef}
        src={video.audioUrl}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => voiceRef.current?.pause()}
      />
      {video.voiceOverUrl && (
        <audio
          ref={voiceRef}
          src={video.voiceOverUrl}
          preload="metadata"
        />
      )}
      <div className="video-preview-controls">
        <button
          type="button"
          className="video-preview-play"
          onClick={togglePlayback}
          aria-label={isPlaying ? 'Pause video preview' : 'Play video preview'}
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
        </button>
        <span className="video-preview-time">{formatPreviewTime(elapsed)}</span>
        <input
          className="video-preview-seek"
          type="range"
          min="0"
          max={duration}
          step="0.1"
          value={Math.min(elapsed, duration)}
          onChange={(event) => seekPreview(Number(event.target.value))}
          aria-label="Seek within selected video segment"
        />
        <span className="video-preview-time">{formatPreviewTime(duration)}</span>
        <span className="video-preview-volume" title={`${video.audioTrackLabel ?? 'Music'} ${video.volume}%${video.voiceOverUrl ? `, voice-over ${video.voiceOverVolume ?? 100}%` : ''}`}>
          <Volume2 size={15} /> {video.audioTrackLabel === 'Voice-over' ? 'V' : 'M'} {video.volume}%{video.voiceOverUrl ? ` · V ${video.voiceOverVolume ?? 100}%` : ''}
        </span>
      </div>
    </div>
  )
}

export function PreviewDialog() {
  const { project, canvas, preview } = useEditor()

  if (!preview.open) return null
  const isVideoPreview = preview.mode === 'video'
  const video = preview.video

  return (
    <div className="modal-backdrop" role="presentation" onClick={preview.close}>
      <section className={`preview-modal ${isVideoPreview ? 'video-preview-modal' : ''}`} role="dialog" aria-modal="true" aria-label={isVideoPreview ? 'Image to video preview' : 'Design preview'} onClick={(event) => event.stopPropagation()}>
        <header><div><span className="panel-kicker">{isVideoPreview ? 'VIDEO PREVIEW' : 'PREVIEW'}</span><h2>{isVideoPreview ? 'Image to Video' : project.name}</h2></div><button className="icon-button" onClick={preview.close} aria-label="Return to editor"><X size={19} /></button></header>
        {isVideoPreview ? (
          <div className="preview-stage video-preview-stage">
            <div className="preview-video-frame">
              {video?.imageUrl && <img src={video.imageUrl} alt="Video preview frame" />}
              <span className="preview-video-badge"><Play size={13} fill="currentColor" /> VIDEO</span>
            </div>
            {video?.audioUrl ? (
              <VideoPreviewPlayer key={video.audioUrl} video={video} />
            ) : (
              <p className="preview-audio-empty">Add background music to preview the video soundtrack.</p>
            )}
          </div>
        ) : (
          <div className="preview-stage">{preview.imageUrl && <img src={preview.imageUrl} alt="Current design preview" />}</div>
        )}
        <footer>
          <span>{isVideoPreview && video ? `${formatPreviewTime(video.startTime)} – ${formatPreviewTime(video.endTime)} · ${formatPreviewTime(video.endTime - video.startTime)}` : `${canvas.dimensions.width} × ${canvas.dimensions.height} px`}</span>
          <button className="primary-button" onClick={preview.close}><ArrowLeft size={15} /> Back to editor</button>
        </footer>
      </section>
    </div>
  )
}

export function ExportDialog() {
  const { canvas, export: exportState } = useEditor()
  if (!exportState.open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={() => exportState.setOpen(false)}>
      <section className="export-modal" role="dialog" aria-modal="true" aria-label="Export design" onClick={(event) => event.stopPropagation()}>
        <header><div><span className="panel-kicker">DOWNLOAD FILE</span><h2>Export your design</h2></div><button className="icon-button" onClick={() => exportState.setOpen(false)} aria-label="Close export dialog"><X size={19} /></button></header>
        <label className="field-label">File format<select value={exportState.format} onChange={(event) => exportState.setFormat(event.target.value as 'png' | 'jpeg' | 'gif' | 'mp4')}><option value="png">PNG · transparent background</option><option value="jpeg">JPG · white background</option><option value="gif">GIF · animated</option><option value="mp4">MP4 · animated video</option></select></label>
        <label className="field-label export-scale-label">Output size<select value={exportState.scale} onChange={(event) => exportState.setScale(Number(event.target.value))}><option value={1}>Original · {canvas.dimensions.width} × {canvas.dimensions.height}</option><option value={2}>2× · {canvas.dimensions.width * 2} × {canvas.dimensions.height * 2}</option><option value={3}>3× · {canvas.dimensions.width * 3} × {canvas.dimensions.height * 3}</option></select></label>
        <label className="export-watermark-option"><input type="checkbox" checked={exportState.watermark} onChange={(event) => exportState.setWatermark(event.target.checked)} /><span>Add project watermark</span></label>
        <div className="export-info"><FileImage size={17} /><span>{exportState.format === 'gif' || exportState.format === 'mp4' ? 'Animation effects are included in the exported clip.' : 'Exported locally from the full-resolution document.'}</span></div>
        <button className="download-button full-button" onClick={() => void exportState.download()} disabled={exportState.busy}><Download size={16} /> {exportState.busy ? 'Preparing file…' : 'Download design'}</button>
      </section>
    </div>
  )
}


export function EditorNotice() {
  const { tools } = useEditor()
  if (!tools.notice) return null
  return <div className="toast" role="status"><span>{tools.notice}</span><button onClick={() => tools.setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>
}