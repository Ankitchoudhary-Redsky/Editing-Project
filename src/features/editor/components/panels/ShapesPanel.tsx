import { ArrowRight, Circle, FileImage, Minus, Pentagon, Shapes, Square, Star, Trash2 } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { shapeNames } from '../../model/constants'
import type { ShapeKind } from '../../model/types'

const shapeChoices = [
  { kind: 'rect', icon: Square },
  { kind: 'roundRect', icon: Square },
  { kind: 'circle', icon: Circle },
  { kind: 'ellipse', icon: Circle },
  { kind: 'line', icon: Minus },
  { kind: 'arrow', icon: ArrowRight },
  { kind: 'triangle', icon: Shapes },
  { kind: 'star', icon: Star },
  { kind: 'pentagon', icon: Pentagon },
] as const

export function ShapesPanel() {
  const { shapes } = useEditor()
  return (
    <div className="panel-content">
      <span className="field-label">Choose a shape</span>
      <div className="shape-grid">
        {shapeChoices.map(({ kind, icon: Icon }) =>
          <button
            key={kind}
            className={`shape-choice ${shapes.kind === kind ? 'selected' : ''}`}
            onClick={() => shapes.setKind(kind as ShapeKind)}
            title={shapeNames[kind]}
          >
            <Icon size={22} strokeWidth={1.7} />
            <span>{shapeNames[kind]}</span>
          </button>
        )}
      </div>
      <div className="dimensions-fields">
        <label className="field-label color-field">Fill
          <input
            type="color"
            value={shapes.fill}
            onChange={(event) => {
              shapes.setFill(event.target.value);
              if (shapes.isSelectedShape && !shapes.transparentFill)
                shapes.updateAppearance('fill', event.target.value)
            }}
          />
        </label>
        <label className="field-label color-field">Stroke
          <input
            type="color"
            value={shapes.stroke}
            onChange={(event) => {
              shapes.setStroke(event.target.value);
              if (shapes.isSelectedShape)
                shapes.updateAppearance('stroke', event.target.value)
            }}
          />
        </label>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={shapes.transparentFill}
          onChange={(event) => {
            shapes.setTransparentFill(event.target.checked);
            if (shapes.isSelectedShape)
              shapes.updateAppearance('fill', event.target.checked ? 'rgba(0,0,0,0)' : shapes.fill)
          }}
        /> Transparent fill
      </label>
      <label className="field-label">Stroke width
        <input
          type="number"
          min="0"
          max="40"
          value={shapes.strokeWidth}
          onChange={(event) => {
            const value = Number(event.target.value);
            shapes.setStrokeWidth(value);
            if (shapes.isSelectedShape)
              shapes.updateAppearance('strokeWidth', value)
          }}
        />
      </label>
      <label className="range-field">
        <span>Opacity <b>{shapes.isSelectedShape && shapes.selected ? Math.round(shapes.selected.opacity * 100) : shapes.opacity}%</b></span>
        <input
          type="range"
          min="0"
          max="100"
          value={
            shapes.isSelectedShape && shapes.selected ? Math.round(shapes.selected.opacity * 100) : shapes.opacity
          }
          onChange={(event) => { const value = Number(event.target.value); shapes.setOpacity(value); if (shapes.isSelectedShape) shapes.updateAppearance('opacity', value / 100) }}
        />
      </label>
      <p className="panel-note draw-hint">Drag on the image to draw a {shapeNames[shapes.kind].toLowerCase()}.</p>
      {shapes.isSelectedShape && <div className="object-actions"><button className="secondary-button" onClick={() => void shapes.duplicate()}><FileImage size={15} /> Duplicate</button><button className="secondary-button danger-action" onClick={shapes.delete}><Trash2 size={15} /> Delete</button></div>}
    </div>
  )
}