import { Play, Square } from 'lucide-react'

export function AudioSegmentControls({
  sourceDuration,
  formatTime,
  startTime,
  endTime,
  validAudioRange,
  segmentDuration,
  isDraggingTrim,
  busy,
  waveformRef,
  onTrimPointerDown,
  onTrimPointerMove,
  onTrimPointerUp,
  waveformPeaks,
  startPercent,
  endPercent,
  onTrimKeyDown,
  canPlayPreview,
  onPlayPreview,
  isPreviewing,
  onStopPreview,
}) {
  return (
    <div className="music-segment-section">
      <div className="music-segment-heading">
        <strong>Audio segment</strong>
        <span>
          {sourceDuration > 0 ? formatTime(sourceDuration) : '--:--'} total
        </span>
      </div>

      <div className="music-trim-control" aria-label="Audio trim range">
        <div className="music-trim-readout">
          <div>
            <span>Start</span>
            <strong>{formatTime(startTime)}</strong>
          </div>
          <div>
            <span>Selected</span>
            <strong>{validAudioRange ? formatTime(segmentDuration) : '--:--'}</strong>
          </div>
          <div>
            <span>End</span>
            <strong>{formatTime(endTime)}</strong>
          </div>
        </div>

        <div
          className={`music-waveform ${isDraggingTrim ? 'is-dragging' : ''} ${!sourceDuration || busy ? 'is-disabled' : ''}`}
          ref={waveformRef}
          onPointerDown={onTrimPointerDown}
          onPointerMove={onTrimPointerMove}
          onPointerUp={onTrimPointerUp}
          onPointerCancel={onTrimPointerUp}
          role="group"
          aria-label="Drag the trim handles to choose the audio segment"
        >
          {waveformPeaks.length > 0 ? (
            <div className="music-waveform-bars" aria-hidden="true">
              {waveformPeaks.map((peak, index) => (
                <span key={index} style={{ height: `${Math.max(8, peak * 100)}%` }} />
              ))}
            </div>
          ) : (
            <span className="music-waveform-placeholder">
              {sourceDuration ? 'Waveform unavailable' : 'Upload audio to trim'}
            </span>
          )}

          <div className="music-waveform-dim is-before" style={{ width: `${startPercent}%` }} />
          <div className="music-waveform-dim is-after" style={{ left: `${endPercent}%` }} />

          <div className="music-trim-selection" style={{ left: `${startPercent}%`, width: `${endPercent - startPercent}%` }}>
            <div className="music-trim-window" data-trim-part="move" title="Drag to move the selected segment" />
            <button
              type="button"
              className="music-trim-handle is-start"
              data-trim-part="start"
              style={{ left: 0 }}
              role="slider"
              aria-label="Audio start time"
              aria-valuemin={0}
              aria-valuemax={Math.max(0, endTime - 1)}
              aria-valuenow={Math.round(startTime)}
              aria-valuetext={formatTime(startTime)}
              onKeyDown={(event) => onTrimKeyDown(event, 'start')}
              disabled={!sourceDuration || busy}
            >
              <span />
            </button>
            <button
              type="button"
              className="music-trim-handle is-end"
              data-trim-part="end"
              style={{ right: 0 }}
              role="slider"
              aria-label="Audio end time"
              aria-valuemin={Math.min(sourceDuration, startTime + 1)}
              aria-valuemax={sourceDuration}
              aria-valuenow={Math.round(endTime)}
              aria-valuetext={formatTime(endTime)}
              onKeyDown={(event) => onTrimKeyDown(event, 'end')}
              disabled={!sourceDuration || busy}
            >
              <span />
            </button>
          </div>
        </div>

        <div className="music-waveform-scale" aria-hidden="true">
          <span>00:00</span>
          <span>{formatTime(sourceDuration)}</span>
        </div>
      </div>

      <div className="music-preview-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onPlayPreview}
          disabled={!canPlayPreview || !validAudioRange || busy}
        >
          <Play size={14} />
          Play preview
        </button>
        <button
          type="button"
          className="secondary-button"
          onClick={onStopPreview}
          disabled={!isPreviewing || busy}
        >
          <Square size={13} />
          Stop preview
        </button>
      </div>
    </div>
  )
}
