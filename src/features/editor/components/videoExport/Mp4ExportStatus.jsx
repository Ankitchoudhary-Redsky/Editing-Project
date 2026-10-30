export function Mp4ExportStatus({
  status,
  progressText,
  error,
  disabled,
  onExport,
}) {
  return (
    <>
      <button
        type="button"
        className="export-mp4-button"
        onClick={onExport}
        disabled={disabled}
      >
        {status === 'recording'
          ? 'Rendering video...'
          : status === 'converting'
            ? 'Converting to MP4...'
            : 'Export MP4 Video'}
      </button>

      {progressText && <p className="export-status" role="status">{progressText}</p>}
      {status === 'done' && (
        <p className="export-success" role="status">Your MP4 export is ready.</p>
      )}
      {error && <p className="export-error" role="alert">{error}</p>}
      <p className="export-note">
        Large videos can take time to process. Keep this tab open until the download starts.
      </p>
    </>
  )
}
