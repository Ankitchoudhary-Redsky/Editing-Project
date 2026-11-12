export function MusicTrackVolume({
  musicFile,
  volume,
  validAudioRange,
  segmentDuration,
  formatTime,
  busy,
  onVolumeChange,
}) {
  return (
    musicFile && (
      <div className="music-export-field">
        <label htmlFor="music-volume">Music volume: {volume}%</label>
        <input
          id="music-volume"
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={onVolumeChange}
          disabled={busy}
        />
        <p className="field-hint">
          Video duration: {validAudioRange ? formatTime(segmentDuration) : '--:--'}
        </p>
      </div>
    )
  )
}
