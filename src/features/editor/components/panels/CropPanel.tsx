import { Check, FlipHorizontal2, FlipVertical2, RotateCcw } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { cropRatios } from '../../model/constants'

export function CropPanel() {
  const { crop, canvas } = useEditor()
  return (
    <div className="panel-content">
      <p className="panel-note">Drag the crop frame and its handles to choose the visible area.</p>
      <label className="field-label">Aspect ratio<select value={crop.ratio} onChange={(event) => crop.changeRatio(event.target.value)}>{Object.keys(cropRatios).map((ratio) => <option key={ratio}>{ratio}</option>)}</select></label>
      <div className="control-section">
        <span className="field-label">Flip image</span>
        <div className="button-row crop-flip-controls">
          <button className="secondary-button" onClick={crop.flipHorizontal} disabled={!canvas.hasImage}><FlipHorizontal2 size={15} /> Horizontal</button>
          <button className="secondary-button" onClick={crop.flipVertical} disabled={!canvas.hasImage}><FlipVertical2 size={15} /> Vertical</button>
        </div>
      </div>
      <label className="range-field"><span>Rotate <b>{crop.rotation}°</b></span><input type="range" min="-180" max="180" step="1" value={crop.rotation} disabled={!canvas.hasImage} onChange={(event) => crop.setRotation(Number(event.target.value))} /></label>
      <div className="button-row crop-actions"><button className="secondary-button" onClick={() => void crop.reset()} disabled={!canvas.hasImage}><RotateCcw size={15} /> Reset</button><button className="primary-button" onClick={crop.apply} disabled={!canvas.hasImage}><Check size={15} /> Apply crop</button></div>
    </div>
  )
}