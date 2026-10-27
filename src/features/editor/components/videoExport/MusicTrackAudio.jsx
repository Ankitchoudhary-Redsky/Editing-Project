export function MusicTrackAudio({
  musicUrl,
  audioRef,
  onLoadedMetadata,
  onTimeUpdate,
  onEnded,
  onError,
}) {
  if (!musicUrl) return null
  return (
    <audio
      ref={audioRef}
      src={musicUrl}
      preload="metadata"
      className="music-audio"
      onLoadedMetadata={onLoadedMetadata}
      onTimeUpdate={onTimeUpdate}
      onEnded={onEnded}
      onError={onError}
    />
  )
}
