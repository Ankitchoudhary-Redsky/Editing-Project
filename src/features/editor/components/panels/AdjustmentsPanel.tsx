import { RotateCcw } from 'lucide-react'
import { useEditor } from '../../EditorContext'

export function AdjustmentsPanel() {
  const { adjustments, canvas } = useEditor()
  const controls = [
    { label: 'Brightness', value: adjustments.brightness, setValue: adjustments.setBrightness, update: (value: number) => adjustments.apply(value, adjustments.contrast, adjustments.saturation) },
    { label: 'Contrast', value: adjustments.contrast, setValue: adjustments.setContrast, update: (value: number) => adjustments.apply(adjustments.brightness, value, adjustments.saturation) },
    { label: 'Saturation', value: adjustments.saturation, setValue: adjustments.setSaturation, update: (value: number) => adjustments.apply(adjustments.brightness, adjustments.contrast, value) },
  ]

  return (
    <div className="panel-content">
      {!canvas.hasImage && <p className="panel-note">Upload an image to access photo adjustments.</p>}
      {controls.map(({ label, value, setValue, update }) => <label className="range-field" key={label}><span>{label} <b>{value > 0 ? '+' : ''}{value}</b></span><input type="range" min="-100" max="100" value={value} disabled={!canvas.hasImage} onChange={(event) => { const next = Number(event.target.value); setValue(next); update(next) }} /></label>)}
      <button className="secondary-button full-button reset-button" disabled={!canvas.hasImage} onClick={adjustments.reset}><RotateCcw size={15} /> Reset adjustments</button>
    </div>
  )
}