export function MusicTrackInput({ musicFile, busy, onChange }) {
  return (
    <div className="music-export-field">
      <label htmlFor="background-music">Background music (optional)</label>
      <input
        id="background-music"
        type="file"
        accept="audio/*"
        onChange={onChange}
        disabled={busy}
      />
      {musicFile && <p className="music-file-name">Selected: {musicFile.name}</p>}
    </div>
  )
}
