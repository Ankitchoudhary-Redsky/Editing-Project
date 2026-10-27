import { Mic, MicOff, Trash2 } from 'lucide-react'

export function VoiceOverControls({
  voiceFile,
  musicFile,
  voiceUrl,
  voiceVolume,
  isRecordingVoice,
  busy,
  voiceAudioRef,
  onFileChange,
  onRecord,
  onStopRecording,
  onRemove,
  onVolumeChange,
  onMetadata,
  onTimeUpdate,
  onError,
}) {
  return (
    <div className="voice-over-section">
      <div className="voice-over-heading">
        <Mic size={16} aria-hidden="true" />
        <h3>Voice-over</h3>
      </div>

      <p className="voice-over-description">
        Record your voice or upload an existing recording. Add background
        music too, or use the voice-over as the only audio track.
      </p>

      <div className="voice-over-file">
        <label htmlFor="voice-over-audio">Upload voice-over audio</label>
        <input
          id="voice-over-audio"
          type="file"
          accept="audio/*"
          onChange={onFileChange}
          disabled={busy || isRecordingVoice}
        />
      </div>

      <div className="voice-over-actions">
        {!isRecordingVoice ? (
          <button
            type="button"
            className="voice-over-button voice-over-button--record"
            onClick={onRecord}
            disabled={busy}
          >
            <Mic size={14} />
            Record voice-over
          </button>
        ) : (
          <button
            type="button"
            className="voice-over-button voice-over-button--recording"
            onClick={onStopRecording}
            disabled={busy}
          >
            <MicOff size={14} />
            Stop recording
          </button>
        )}

        {voiceFile && (
          <button
            type="button"
            className="voice-over-button"
            onClick={onRemove}
            disabled={busy || isRecordingVoice}
          >
            <Trash2 size={14} />
            Remove voice-over
          </button>
        )}
      </div>

      {voiceFile && (
        <p className="voice-over-file-name">Selected: {voiceFile.name}</p>
      )}

      <p className="voice-over-status" role="status">
        {isRecordingVoice
          ? 'Recording in progress. Speak into your microphone, then select Stop recording.'
          : voiceFile
            ? musicFile
              ? 'Voice-over ready. It will mix with the selected background music.'
              : 'Voice-over ready as the only audio track. Add music if you want a background soundtrack.'
            : 'Optional: record a voice-over or upload an audio file (50 MB maximum). It can be used by itself or mixed with music.'}
      </p>

      {voiceUrl && (
        <audio
          ref={voiceAudioRef}
          src={voiceUrl}
          preload="metadata"
          className="voice-over-audio"
          onLoadedMetadata={onMetadata}
          onTimeUpdate={onTimeUpdate}
          onError={onError}
        />
      )}

      {voiceFile && (
        <div className="voice-over-volume">
          <div className="voice-over-volume-label">
            <label htmlFor="voice-over-volume">Voice-over volume</label>
            <strong>{voiceVolume}%</strong>
          </div>
          <input
            id="voice-over-volume"
            type="range"
            min="0"
            max="100"
            value={voiceVolume}
            onChange={onVolumeChange}
            disabled={busy}
          />
        </div>
      )}
    </div>
  )
}
