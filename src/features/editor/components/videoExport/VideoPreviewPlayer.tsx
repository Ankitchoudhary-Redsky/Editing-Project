import { Pause, Play, Volume2 } from 'lucide-react'
import type { VideoPreviewData } from '../../model/types'
import { formatTime } from './videoExportUtils'
import { useVideoPreviewPlayback } from './useVideoPreviewPlayback'

export function VideoPreviewPlayer({ video }: { video: VideoPreviewData }) {
  const {
    musicRef,
    voiceRef,
    isPlaying,
    elapsed,
    duration,
    setIsPlaying,
    handleTimeUpdate,
    togglePlayback,
    seekPreview,
  } = useVideoPreviewPlayback(video)

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
        <audio ref={voiceRef} src={video.voiceOverUrl} preload="metadata" />
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
        <span className="video-preview-time">{formatTime(elapsed)}</span>
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
        <span className="video-preview-time">{formatTime(duration)}</span>
        <span
          className="video-preview-volume"
          title={`${video.audioTrackLabel ?? 'Music'} ${video.volume}%${video.voiceOverUrl ? `, voice-over ${video.voiceOverVolume ?? 100}%` : ''}`}
        >
          <Volume2 size={15} /> {video.audioTrackLabel === 'Voice-over' ? 'V' : 'M'} {video.volume}%{video.voiceOverUrl ? ` · V ${video.voiceOverVolume ?? 100}%` : ''}
        </span>
      </div>
    </div>
  )
}