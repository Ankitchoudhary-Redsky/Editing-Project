import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useEditor } from '../../EditorContext'

type AdjustmentControlsProps = {
  adjustments: ReturnType<typeof useEditor>['adjustments']
  hasImage: boolean
}

function AdjustmentControls({ adjustments, hasImage }: AdjustmentControlsProps) {
  const [values, setValues] = useState({
    brightness: adjustments.brightness,
    contrast: adjustments.contrast,
    saturation: adjustments.saturation,
  })
  const controls: { label: string; key: keyof typeof values; value: number }[] = [
    { label: 'Brightness', key: 'brightness', value: values.brightness },
    { label: 'Contrast', key: 'contrast', value: values.contrast },
    { label: 'Saturation', key: 'saturation', value: values.saturation },
  ]

  const updateValue = (key: keyof typeof values, value: number) => {
    const next = { ...values, [key]: value }
    setValues(next)
    adjustments.apply(next.brightness, next.contrast, next.saturation)
  }

  const finishPreview = () => adjustments.finishPreview(values.brightness, values.contrast, values.saturation)

  return (
    <>
      {controls.map(({ label, key, value }) => <label className="range-field" key={label}><span>{label} <b>{value > 0 ? '+' : ''}{value}</b></span><input type="range" min="-100" max="100" value={value} disabled={!hasImage} onPointerDown={adjustments.beginPreview} onPointerUp={finishPreview} onPointerCancel={finishPreview} onKeyDown={adjustments.beginPreview} onKeyUp={finishPreview} onBlur={finishPreview} onChange={(event) => updateValue(key, Number(event.target.value))} /></label>)}
    </>
  )
}

export function AdjustmentsPanel() {
  const { adjustments, canvas } = useEditor()

  return (
    <div className="panel-content">
      {!canvas.hasImage && <p className="panel-note">Upload an image to access photo adjustments.</p>}
      <AdjustmentControls
        key={`${adjustments.brightness}:${adjustments.contrast}:${adjustments.saturation}`}
        adjustments={adjustments}
        hasImage={canvas.hasImage}
      />
      <button className="secondary-button full-button reset-button" disabled={!canvas.hasImage} onClick={adjustments.reset}><RotateCcw size={15} /> Reset adjustments</button>
    </div>
  )
}