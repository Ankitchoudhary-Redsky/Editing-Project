import { Music2 } from 'lucide-react'
import { editorHeadings } from '../../model/editorCopy'
import { AudioSegmentControls } from './AudioSegmentControls'
import { Mp4ExportStatus } from './Mp4ExportStatus'
import { MusicTrackAudio } from './MusicTrackAudio'
import { MusicTrackInput } from './MusicTrackInput'
import { MusicTrackVolume } from './MusicTrackVolume'
import { VoiceOverControls } from './VoiceOverControls'
import { formatTime } from './videoExportUtils'

export function VideoAudioControls({
  hasCanvasImage,
  musicFile,
  musicUrl,
  audioDuration,
  volume,
  voiceFile,
  voiceUrl,
  voiceDuration,
  voiceVolume,
  startTime,
  endTime,
  sourceDuration,
  segmentDuration,
  validAudioRange,
  startPercent,
  endPercent,
  audioRef,
  voiceAudioRef,
  playback,
  audioActions,
  recorder,
  trim,
  waveformPeaks,
  status,
  progressText,
  error,
  busy,
  exportVideo,
}) {
  return (
    <div className="music-export-controls">
      <div className="music-export-heading">
        <div>
          <span className="music-eyebrow"><Music2 size={13} /> VIDEO STUDIO</span>
          <h2>{editorHeadings.imageToVideo}</h2>
          <p>Add a soundtrack and export your edited image as an MP4.</p>
        </div>
        <span className="mp4-badge">MP4</span>
      </div>
      <MusicTrackInput musicFile={musicFile} busy={busy} onChange={audioActions.handleMusicChange} />
      <VoiceOverControls
        hasImage={hasCanvasImage}
        voiceFile={voiceFile}
        musicFile={musicFile}
        voiceUrl={voiceUrl}
        voiceVolume={voiceVolume}
        isRecordingVoice={recorder.isRecordingVoice}
        busy={busy}
        voiceAudioRef={voiceAudioRef}
        onFileChange={recorder.handleVoiceChange}
        onRecord={recorder.startVoiceRecording}
        onStopRecording={recorder.stopVoiceRecording}
        onRemove={recorder.clearVoiceOver}
        onMetadata={audioActions.handleVoiceMetadata}
        onTimeUpdate={(event) => playback.handleVoiceTimeUpdate(event, musicFile, endTime)}
        onError={audioActions.handleVoiceAudioError}
        onVolumeChange={playback.handleVoiceVolumeChange}
      />
      <MusicTrackAudio
        musicUrl={musicUrl}
        audioRef={audioRef}
        onLoadedMetadata={audioActions.handleAudioMetadata}
        onTimeUpdate={(event) => playback.handlePreviewTimeUpdate(event, endTime)}
        onEnded={() => playback.setIsPreviewing(false)}
        onError={audioActions.handleAudioError}
      />
      <AudioSegmentControls
        sourceDuration={sourceDuration}
        formatTime={formatTime}
        startTime={startTime}
        endTime={endTime}
        validAudioRange={validAudioRange}
        segmentDuration={segmentDuration}
        isDraggingTrim={trim.isDraggingTrim}
        busy={busy}
        waveformRef={trim.waveformRef}
        onTrimPointerDown={trim.handleTrimPointerDown}
        onTrimPointerMove={trim.handleTrimPointerMove}
        onTrimPointerUp={trim.handleTrimPointerUp}
        waveformPeaks={waveformPeaks}
        startPercent={startPercent}
        endPercent={endPercent}
        onTrimKeyDown={trim.handleTrimKeyDown}
        canPlayPreview={Boolean(musicFile || voiceFile)}
        onPlayPreview={() => playback.playPreview(validAudioRange)}
        isPreviewing={playback.isPreviewing}
        onStopPreview={playback.stopPreview}
      />
      <MusicTrackVolume
        musicFile={musicFile}
        volume={volume}
        validAudioRange={validAudioRange}
        segmentDuration={segmentDuration}
        formatTime={formatTime}
        busy={busy}
        onVolumeChange={playback.handleMusicVolumeChange}
      />
      <Mp4ExportStatus
        status={status}
        progressText={progressText}
        error={error}
        onExport={exportVideo}
        disabled={
          !hasCanvasImage ||
          (!musicFile && !voiceFile) ||
          (musicFile && audioDuration <= 0) ||
          (!musicFile && voiceDuration <= 0) ||
          !validAudioRange ||
          busy ||
          recorder.isRecordingVoice
        }
      />
    </div>
  )
}