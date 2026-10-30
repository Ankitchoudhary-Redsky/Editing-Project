import { useState } from 'react'
import { FabricImage, type Canvas as FabricCanvas, type FabricObject } from 'fabric'
import { ArrowRight, Circle, FileImage, Minus, Pentagon, Shapes, Square, Spline, Star, Trash2, Type } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { shapeNames } from '../../model/constants'
import type { ShapeKind } from '../../model/types'
import {
  addThreeDCharacter,
  addThreeDEmoji,
  addThreeDShape,
  recolorThreeDCharacter,
  threeDCharacters,
  threeDEmojiChoices,
  threeDShapeChoices,
  threeDShapeGroups,
} from '../../operations/threeDShapes'

const lineStyles = [
  { style: 'straight', label: 'Straight', icon: Minus },
  { style: 'curve-up', label: 'Curve up', icon: Spline },
  { style: 'curve-down', label: 'Curve down', icon: Spline },
] as const

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
  const { canvas, fabricCanvas, shapes, tools } = useEditor()
  const [mode, setMode] = useState<'2d' | '3d'>('2d')
  const [addingShape, setAddingShape] = useState(false)
  const [threeDSearch, setThreeDSearch] = useState('')
  const [active3DGroup, setActive3DGroup] = useState<(typeof threeDShapeGroups)[number]>(threeDShapeGroups[0])
  const selectedThreeDName = String(canvas.selected?.get('name') ?? '')
  const hasSelectedThreeDObject = selectedThreeDName.startsWith('3D ')

  const filteredThreeDChoices = threeDShapeChoices.filter((shape) =>
    shape.label.toLowerCase().includes(threeDSearch.trim().toLowerCase()),
  )

  const add3DElement = async (label: string, render: () => Promise<void>) => {
    if (!fabricCanvas || addingShape) return

    try {
      setAddingShape(true)
      await render()
      tools.setNotice(`${label} added to the canvas.`)
    } catch (error) {
      console.error('Failed to add 3D element:', error)
      tools.setNotice('Could not render this 3D element. Try another item or browser.')
    } finally {
      setAddingShape(false)
    }
  }

  return (
    <div className="panel-content">
      <div className="shape-mode-switch" role="group" aria-label="Shape type">
        <button type="button" disabled={!canvas.hasImage} className={mode === '2d' ? 'selected' : ''} aria-pressed={mode === '2d'} onClick={() => setMode('2d')}>2D shapes</button>
        <button type="button" disabled={!canvas.hasImage} className={mode === '3d' ? 'selected' : ''} aria-pressed={mode === '3d'} onClick={() => setMode('3d')}>3D shapes</button>
      </div>
      <fieldset className="panel-control-group" disabled={!canvas.hasImage}>
        {mode === '2d' ? <>
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
            {lineStyles.map(({ style, label, icon: Icon }) =>
              <button
                key={style}
                type="button"
                className={`line-style-option ${shapes.lineStyle === style ? 'selected' : ''} ${style === 'curve-down' ? 'curve-down' : ''}`}
                aria-pressed={shapes.lineStyle === style}
                onClick={() => shapes.setLineStyle(style)}
              >
                <Icon size={17} />
                <span>{label}</span>
              </button>,
            )}
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
        {shapes.isSelectedShape && <div className="object-actions"><button className="secondary-button" onClick={shapes.addText}><Type size={15} /> Add text</button><button className="secondary-button" onClick={() => void shapes.duplicate()}><FileImage size={15} /> Duplicate</button><button className="secondary-button danger-action" onClick={shapes.delete}><Trash2 size={15} /> Delete</button></div>}
        </> : <section className="three-d-shapes-section">
          <input
            className="three-d-shape-search"
            type="search"
            aria-label="Search 3D shapes"
            placeholder="Search 3D shapes"
            value={threeDSearch}
            onChange={(event) => setThreeDSearch(event.target.value)}
          />
          <div className="three-d-category-tabs" role="group" aria-label="3D element categories">
            {threeDShapeGroups.map((group) => (
              <button
                key={group}
                type="button"
                className={active3DGroup === group ? 'selected' : ''}
                aria-pressed={active3DGroup === group}
                onClick={() => setActive3DGroup(group)}
              >
                {group === 'Basic Objects' ? 'Objects' : group === 'Symbols & Icons' ? 'Icons' : group === 'Letters & Numbers' ? 'A-Z' : 'Emoji'}
              </button>
            ))}
          </div>
          {hasSelectedThreeDObject && canvas.selected instanceof FabricImage && fabricCanvas && <ThreeDCharacterControls
            key={`${selectedThreeDName}-${fabricCanvas.getObjects().indexOf(canvas.selected)}`}
            object={canvas.selected}
            fabricCanvas={fabricCanvas}
            setNotice={tools.setNotice}
          />}
          {active3DGroup === 'Basic Objects' || active3DGroup === 'Symbols & Icons' ? (
            <section className="three-d-shape-group">
              <span className="field-label">{active3DGroup}</span>
              <div className="three-d-shape-grid">
                {filteredThreeDChoices.filter((shape) => shape.group === active3DGroup).map((shape) => (
                  <button
                    key={shape.kind}
                    type="button"
                    className="three-d-shape-choice"
                    disabled={addingShape}
                    onClick={() => void add3DElement(shape.label, () => addThreeDShape(fabricCanvas!, shape.kind, shape.color, shape.label))}
                    title={`Add ${shape.label}`}
                  >
                    <span className={`three-d-shape-preview model-${shape.kind}`} style={{ '--shape-color': shape.color } as React.CSSProperties} aria-hidden="true" />
                    <span>{shape.label}</span>
                  </button>
                ))}
              </div>
            </section>
          ) : active3DGroup === 'Letters & Numbers' ? (
            <section className="three-d-shape-group">
              <span className="field-label">Extruded characters</span>
              <div className="three-d-character-grid">
                {threeDCharacters.filter((character) => character.includes(threeDSearch.trim().toUpperCase())).map((character) => (
                  <button
                    key={character}
                    type="button"
                    className="three-d-character-choice"
                    disabled={addingShape}
                    onClick={() => void add3DElement(character, () => addThreeDCharacter(fabricCanvas!, character))}
                    aria-label={`Add 3D ${character}`}
                  >{character}</button>
                ))}
              </div>
            </section>
          ) : (
            <section className="three-d-shape-group">
              <span className="field-label">3D emoji faces</span>
              <div className="three-d-emoji-grid">
                {threeDEmojiChoices.filter((emoji) => `${emoji.label} ${emoji.emoji}`.toLowerCase().includes(threeDSearch.trim().toLowerCase())).map((emoji) => (
                  <button
                    key={emoji.label}
                    type="button"
                    className="three-d-emoji-choice"
                    disabled={addingShape}
                    onClick={() => void add3DElement(emoji.label, () => addThreeDEmoji(fabricCanvas!, emoji))}
                    aria-label={`Add 3D ${emoji.label} emoji`}
                    title={`Add ${emoji.label}`}
                  >
                    <span aria-hidden="true">{emoji.emoji}</span>
                    <small>{emoji.label}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
          {active3DGroup === 'Basic Objects' || active3DGroup === 'Symbols & Icons'
            ? filteredThreeDChoices.filter((shape) => shape.group === active3DGroup).length === 0 && <p className="panel-note">No matching 3D elements.</p>
            : active3DGroup === 'Letters & Numbers'
              ? threeDCharacters.filter((character) => character.includes(threeDSearch.trim().toUpperCase())).length === 0 && <p className="panel-note">No matching characters.</p>
              : threeDEmojiChoices.filter((emoji) => `${emoji.label} ${emoji.emoji}`.toLowerCase().includes(threeDSearch.trim().toLowerCase())).length === 0 && <p className="panel-note">No matching emojis.</p>}
        </section>}
      </fieldset>
      <p className="panel-note draw-hint">{!canvas.hasImage ? 'Upload an image to use shape tools.' : mode === '2d' ? `Drag on the image to draw a ${shapeNames[shapes.kind].toLowerCase()}. Drag again to add another.` : 'Click a shape to add it. Select it on the canvas to move, resize, or rotate.'}</p>
    </div>
  )
}

function ThreeDCharacterControls({
  object,
  fabricCanvas,
  setNotice,
}: {
  object: FabricObject
  fabricCanvas: FabricCanvas
  setNotice: (message: string) => void
}) {
  const [color, setColor] = useState(String(object.get('threeDColor') ?? '#8968dc'))
  const character = String(object.get('name') ?? '').match(/^(?:3D )+([A-Z0-9])$/)?.[1]

  const updateColor = async (value: string) => {
    if (!character || !(object instanceof FabricImage)) return
    try {
      await recolorThreeDCharacter(fabricCanvas, object, character, value)
    } catch (error) {
      console.error('Failed to recolor 3D character:', error)
      setNotice('Could not recolor this character.')
    }
  }

  return (
    <section className="three-d-object-controls">
      {character && <div className="three-d-character-color">
        <label className="field-label color-field">Letter color
          <input
            type="color"
            value={color}
            onChange={(event) => {
              const nextColor = event.target.value
              setColor(nextColor)
              void updateColor(nextColor)
            }}
          />
        </label>
      </div>}
    </section>
  )
}