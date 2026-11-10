import { useState } from 'react'
import { FabricImage, type Canvas as FabricCanvas, type FabricObject } from 'fabric'
import { useRef } from 'react'
import { ArrowRight, Circle, FileImage, ImagePlus, Minus, MousePointer2, Heart, Cross, Pentagon, Shapes, Spline, Square, Star, Trash2, Type, Triangle, TriangleRight, Diamond, Hexagon, Octagon, MoveHorizontal, X, ChevronRight, MessageSquare, Cloud, Disc } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { BACKGROUND_IMAGE_NAME, shapeNames } from '../../model/constants'
import type { ShapeKind } from '../../model/types'
import { prepareThreeDShapes } from '../../operations/EditableThreeDShape'
import {
  addThreeDCharacter,
  recolorThreeDCharacter,
  threeDCharacters,
  threeDShapeChoices,
  threeDShapeGroups,
} from '../../operations/threeDShapes'
import { threeDEmojiAssets, threeDEmojiCategories, type ThreeDEmojiCategory } from '../../operations/threeDEmojiAssets'
import { addThreeDEmoji } from '../../operations/threeDEmojis'

const lineStyles = [
  { style: 'straight', label: 'Straight', icon: Minus },
  { style: 'curve-up', label: 'Curve up', icon: Spline },
  { style: 'curve-down', label: 'Curve down', icon: Spline },
] as const

const shapeChoices = [
  { label: 'Basic', choices: [
    { kind: 'rect', icon: Square }, { kind: 'roundRect', icon: Square }, { kind: 'square', icon: Square },
    { kind: 'circle', icon: Circle }, { kind: 'ellipse', icon: Circle }, { kind: 'triangle', icon: Triangle },
    { kind: 'rightTriangle', icon: TriangleRight }, { kind: 'diamond', icon: Diamond }, { kind: 'pentagon', icon: Pentagon },
    { kind: 'hexagon', icon: Hexagon }, { kind: 'octagon', icon: Octagon }, { kind: 'star', icon: Star },
  ] },
  { label: 'Lines & Arrows', choices: [
    { kind: 'line', icon: Minus }, { kind: 'dashedLine', icon: Minus }, { kind: 'dottedLine', icon: Minus },
    { kind: 'arrow', icon: ArrowRight }, { kind: 'doubleArrow', icon: MoveHorizontal }, { kind: 'curvedArrow', icon: Spline },
  ] },
  { label: 'Custom', choices: [
    { kind: 'heart', icon: Heart }, { kind: 'cross', icon: X }, { kind: 'plus', icon: Cross },
    { kind: 'minus', icon: Minus }, { kind: 'chevron', icon: ChevronRight },
    { kind: 'parallelogram', icon: Shapes }, { kind: 'speechBubble', icon: MessageSquare }, { kind: 'cloud', icon: Cloud },
    { kind: 'ring', icon: Disc }, { kind: 'donut', icon: Disc }, { kind: 'arc', icon: Spline },
  ] },
] as const

export function ShapesPanel() {
  const { canvas, fabricCanvas, shapes, tools } = useEditor()
  const { mode, setMode } = shapes
  const [addingShape, setAddingShape] = useState(false)
  const [threeDSearch, setThreeDSearch] = useState('')
  const [active3DGroup, setActive3DGroup] = useState<(typeof threeDShapeGroups)[number]>(threeDShapeGroups[0])
  const [activeEmojiCategory, setActiveEmojiCategory] = useState<ThreeDEmojiCategory | 'All'>('All')
  const [loadingEmojiId, setLoadingEmojiId] = useState<string | null>(null)
  const selectedThreeDName = String(canvas.selected?.get('name') ?? '')
  const hasSelectedThreeDObject = selectedThreeDName.startsWith('3D ')

  const filteredThreeDChoices = threeDShapeChoices.filter((shape) =>
    shape.label.toLowerCase().includes(threeDSearch.trim().toLowerCase()),
  )
  const filteredThreeDEmojis = threeDEmojiAssets.filter((emoji) =>
    (activeEmojiCategory === 'All' || emoji.category === activeEmojiCategory) &&
    `${emoji.displayName} ${emoji.category}`.toLowerCase().includes(threeDSearch.trim().toLowerCase()),
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

  const chooseThreeDShape = async (kind: (typeof threeDShapeChoices)[number]['kind'], label: string) => {
    if (addingShape) return
    try {
      setAddingShape(true)
      await prepareThreeDShapes()
      shapes.setThreeDKind(kind)
      tools.setActive('shapes')
      tools.setNotice(`${label} selected. Drag on the canvas to draw it.`)
    } catch (error) {
      console.error('Failed to prepare 3D shape tools:', error)
      tools.setNotice('Could not initialize Three.js in this browser.')
    } finally {
      setAddingShape(false)
    }
  }

  const addEmoji = async (emoji: (typeof threeDEmojiAssets)[number]) => {
    if (!fabricCanvas || addingShape) return
    setAddingShape(true)
    setLoadingEmojiId(emoji.id)
    try {
      await addThreeDEmoji(fabricCanvas, emoji)
      tools.setNotice(`${emoji.displayName} 3D emoji added.`)
    } catch (error) {
      console.error(`Could not load 3D emoji ${emoji.id}:`, error)
      tools.setNotice(`Could not load the ${emoji.displayName} 3D model.`)
    } finally {
      setLoadingEmojiId(null)
      setAddingShape(false)
    }
  }

  const imageInputRef = useRef<HTMLInputElement>(null)
  const selectedShapeName = String(shapes.selected?.get('name') ?? '').toLowerCase()
  const canAddImage = shapes.isSelectedShape && !/^line|^arrow/.test(selectedShapeName)
  const backgroundLayer = canvas.objects.find((object) => object.get('name') === BACKGROUND_IMAGE_NAME)
  return (
    <div className="panel-content">
      <div className="shape-mode-switch" role="group" aria-label="Shape type">
        <button type="button" disabled={!canvas.hasDocument} className={mode === '2d' ? 'selected' : ''} aria-pressed={mode === '2d'} onClick={() => { setMode('2d'); tools.setActive('shapes') }}>2D shapes</button>
        <button type="button" disabled={!canvas.hasDocument} className={mode === '3d' ? 'selected' : ''} aria-pressed={mode === '3d'} onClick={() => { setMode('3d'); fabricCanvas?.discardActiveObject(); fabricCanvas?.requestRenderAll(); tools.setActive('shapes') }}>3D shapes</button>
      </div>
      {mode === '2d' && backgroundLayer && (
        <button
          type="button"
          className="secondary-button full-button"
          onClick={() => {
            backgroundLayer.set({ selectable: true, evented: true })
            shapes.selectLayer(backgroundLayer)
            tools.setActive('layers')
          }}
        >
          <MousePointer2 size={15} />
          Select and move background
        </button>
      )}
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
      <fieldset className="panel-control-group" disabled={!canvas.hasDocument}>
        {mode === '2d' ? <>
        {shapeChoices.map(({ label, choices }) => <section key={label} className="control-section">
          <span className="field-label">{label}</span>
          <div className="shape-grid">
            {choices.map(({ kind, icon: Icon }) =>
              <button
                key={kind}
                type="button"
                className={`shape-choice ${shapes.kind === kind ? 'selected' : ''}`}
                onClick={() => shapes.setKind(kind as ShapeKind)}
                title={shapeNames[kind]}
                aria-pressed={shapes.kind === kind}
              >
                <Icon size={22} strokeWidth={1.7} />
                <span>{shapeNames[kind]}</span>
              </button>
            )}
          </div>
        </section>)}
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
            step="0.1"
            value={shapes.isSelectedShape && shapes.selected ? shapes.selected.strokeWidth : shapes.strokeWidth}
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
          <div className="object-actions"><button className="secondary-button" onClick={shapes.addText}><Type size={15} /> Add text</button><button className="secondary-button" onClick={() => void shapes.duplicate()}><FileImage size={15} /> Duplicate</button><button className="secondary-button danger-action" onClick={shapes.delete}><Trash2 size={15} /> Delete</button></div>
        </>}
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
                {group === 'Basic Objects' ? 'Basic' : group === 'Advanced Shapes' ? 'Advanced' : group === 'Symbols & Icons' ? 'Icons' : group === 'Letters & Numbers' ? 'A-Z' : 'Emoji'}
              </button>
            ))}
          </div>
          {hasSelectedThreeDObject && canvas.selected instanceof FabricImage && fabricCanvas && <ThreeDCharacterControls
            key={`${selectedThreeDName}-${fabricCanvas.getObjects().indexOf(canvas.selected)}`}
            object={canvas.selected}
            fabricCanvas={fabricCanvas}
            setNotice={tools.setNotice}
          />}
          {active3DGroup === 'Basic Objects' || active3DGroup === 'Advanced Shapes' || active3DGroup === 'Symbols & Icons' ? (
            <section className="three-d-shape-group">
              <span className="field-label">{active3DGroup}</span>
              <div className="three-d-shape-grid">
                {filteredThreeDChoices.filter((shape) => shape.group === active3DGroup).map((shape) => (
                  <button
                    key={shape.kind}
                    type="button"
                    className={`three-d-shape-choice ${shapes.threeDKind === shape.kind ? 'selected' : ''}`}
                    disabled={addingShape}
                    onClick={() => void chooseThreeDShape(shape.kind, shape.label)}
                    title={`Select ${shape.label} drawing tool`}
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
              <span className="field-label">3D Emoji</span>
              <div className="three-d-emoji-category-tabs" role="group" aria-label="3D emoji categories">
                {(['All', ...threeDEmojiCategories] as const).map((category) => (
                  <button
                    key={category}
                    type="button"
                    className={activeEmojiCategory === category ? 'selected' : ''}
                    aria-pressed={activeEmojiCategory === category}
                    onClick={() => setActiveEmojiCategory(category)}
                  >{category}</button>
                ))}
              </div>
              {loadingEmojiId && <p className="three-d-loading" role="status">Loading {threeDEmojiAssets.find((emoji) => emoji.id === loadingEmojiId)?.displayName} model…</p>}
              <div className="three-d-emoji-grid">
                {filteredThreeDEmojis.map((emoji) => (
                  <button
                    key={emoji.id}
                    type="button"
                    className="three-d-emoji-choice"
                    disabled={addingShape}
                    onClick={() => void addEmoji(emoji)}
                    aria-label={`Add 3D ${emoji.displayName} emoji`}
                    title={`Add ${emoji.displayName}`}
                  >
                    <img src={emoji.thumbnail} alt="" />
                    <small>{emoji.displayName}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
          {active3DGroup === 'Basic Objects' || active3DGroup === 'Advanced Shapes' || active3DGroup === 'Symbols & Icons'
            ? filteredThreeDChoices.filter((shape) => shape.group === active3DGroup).length === 0 && <p className="panel-note">No matching 3D elements.</p>
            : active3DGroup === 'Letters & Numbers'
              ? threeDCharacters.filter((character) => character.includes(threeDSearch.trim().toUpperCase())).length === 0 && <p className="panel-note">No matching characters.</p>
              : filteredThreeDEmojis.length === 0 && <p className="panel-note">No matching 3D emojis.</p>}
        </section>}
      </fieldset>
      <p className="panel-note draw-hint">{!canvas.hasDocument ? 'Add a layer to use shape tools.' : mode === '2d' ? `Drag to draw a ${shapeNames[shapes.kind].toLowerCase()}; hold Shift to constrain proportions.` : `Drag to draw a 3D ${threeDShapeChoices.find((shape) => shape.kind === shapes.threeDKind)?.label.toLowerCase() ?? 'shape'}. Drag the center rotate handle for X/Y; drag the Z handle for Z.`}</p>
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
  const [color, setColor] = useState(String(object.get('threeDColor') ?? '#e879bf'))
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