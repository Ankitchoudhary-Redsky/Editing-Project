import { useEditor } from '../../EditorContext'
import { resizePresets } from '../../model/constants'

export function ResizePanel() {
  const { canvas, resize } = useEditor()
  return (
    <div className="panel-content">
      <fieldset className="panel-control-group" disabled={!canvas.hasImage}>
        <div className="dimensions-fields">
          <label className="field-label">Width<input type="number" min="1" max="12000" value={resize.width} onChange={(event) => resize.setWidth(Number(event.target.value))} /></label>
          <span className="dimension-x">×</span>
          <label className="field-label">Height<input type="number" min="1" max="12000" value={resize.height} onChange={(event) => resize.setHeight(Number(event.target.value))} /></label>
        </div>
        <label className="check-row"><input type="checkbox" checked={resize.keepRatio} onChange={(event) => resize.setKeepRatio(event.target.checked)} /> Keep aspect ratio</label>
        <label className="check-row"><input type="checkbox" checked={resize.scaleArtwork} onChange={(event) => resize.setScaleArtwork(event.target.checked)} /> Scale artwork with canvas</label>
        <div className="panel-label-row presets-heading"><span>Canvas presets</span></div>
        <div className="preset-grid">{resizePresets.map(({ label, width, height }) => <button key={label} className="preset-button" onClick={() => { resize.setWidth(width); resize.setHeight(height); resize.setKeepRatio(false) }}><span className={`preset-shape ${label.toLowerCase()}`} /><span>{label}</span></button>)}</div>
        <button className="primary-button full-button" onClick={resize.apply}>Apply dimensions</button>
      </fieldset>
      <p className="panel-note">{canvas.hasImage ? 'Canvas size is separate from artwork scaling. Artwork is cropped by the document edges.' : 'Upload an image to resize it.'}</p>
    </div>
  )
}