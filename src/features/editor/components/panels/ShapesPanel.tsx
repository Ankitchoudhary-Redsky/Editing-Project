import { useRef } from 'react'
import { ArrowRight, Circle, FileImage, ImagePlus, Minus, Pentagon, Shapes, Spline, Square, Star, Trash2, Type } from 'lucide-react'
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

const lineStyles = [
  { style: 'straight', label: 'Straight', icon: Minus },
  { style: 'curve-up', label: 'Curve up', icon: Spline },
  { style: 'curve-down', label: 'Curve down', icon: Spline },
] as const

export function ShapesPanel() {
  const { canvas, shapes } = useEditor()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const selectedShapeName = String(shapes.selected?.get('name') ?? '').toLowerCase()
  const canAddImage = shapes.isSelectedShape && !/^line|^arrow/.test(selectedShapeName)
  return (
    <div className="panel-content">
      <input
        ref={imageInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) void shapes.addImage(file)
          event.currentTarget.value = ''
        }}
      />
      <fieldset className="panel-control-group" disabled={!canvas.hasImage}>
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
        {shapes.kind === 'line' && <section className="control-section">
          <span className="field-label">Line style</span>
          <div className="line-style-grid" role="group" aria-label="Line style">
            {lineStyles.map(({ style, label, icon: Icon }) => (
              <button
                key={style}
                type="button"
                className={`line-style-option ${shapes.lineStyle === style ? 'selected' : ''} ${style === 'curve-down' ? 'curve-down' : ''}`}
                aria-pressed={shapes.lineStyle === style}
                onClick={() => shapes.setLineStyle(style)}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </section>}
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
        {shapes.isSelectedShape && <>
          <div className="shape-content-actions">
            <button type="button" className="secondary-button" onClick={shapes.addText}><Type size={15} /> Add text</button>
            <button type="button" className="secondary-button" disabled={!canAddImage} onClick={() => imageInputRef.current?.click()}><ImagePlus size={15} /> Add image</button>
          </div>
          <div className="object-actions"><button className="secondary-button" onClick={() => void shapes.duplicate()}><FileImage size={15} /> Duplicate</button><button className="secondary-button danger-action" onClick={shapes.delete}><Trash2 size={15} /> Delete</button></div>
        </>}
      </fieldset>
      <p className="panel-note draw-hint">{canvas.hasImage ? `Drag on the image to draw a ${shapeNames[shapes.kind].toLowerCase()}.` : 'Upload an image to use shape tools.'}</p>
    </div>
  )
}