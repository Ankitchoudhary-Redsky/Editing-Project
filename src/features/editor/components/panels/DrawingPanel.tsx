import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { useEditor } from '../../EditorContext'
import type { DrawingMode } from '../../model/types'
import { Brush, ChevronDown, Eraser, Highlighter, Lasso, Minus, Pencil, Trash2, WandSparkles } from 'lucide-react'

const toolDescriptions: Record<DrawingMode, string> = {
  pencil: 'Draw freehand strokes on your image.',
  sketch: 'Create light, fine sketch strokes.',
  marker: 'Draw bold, opaque marker strokes.',
  highlighter: 'Add broad, translucent highlight strokes.',
  eraser: 'Erase pencil strokes from your design.',
  'magic-remover': 'Brush over image areas to remove them.',
  lasso: 'Draw around an image area to select it.',
}

const brushModes = [
  { id: 'sketch', label: 'Sketch', sample: 'sketch', icon: Pencil },
  { id: 'marker', label: 'Marker', sample: 'marker', icon: Brush },
  { id: 'highlighter', label: 'Highlighter', sample: 'highlighter', icon: Highlighter },
] as const

export function DrawingPanel() {
  const { canvas, drawing, table, tools } = useEditor()
  const isDisabled = !canvas.hasImage
  const [brushMenuOpen, setBrushMenuOpen] = useState(false)
  const [brushMenuPosition, setBrushMenuPosition] = useState({ left: 8, top: 8 })
  const brushTriggerRef = useRef<HTMLButtonElement>(null)
  const brushMenuRef = useRef<HTMLDivElement>(null)
  const modes = [
    { id: 'pencil', label: 'Pencil', icon: Pencil },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'magic-remover', label: 'Object removal', icon: WandSparkles },
    { id: 'lasso', label: 'Freehand Select', icon: Lasso },
  ] as const

  useEffect(() => {
    if (!brushMenuOpen) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (
        !brushTriggerRef.current?.contains(event.target as Node) &&
        !brushMenuRef.current?.contains(event.target as Node)
      ) setBrushMenuOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [brushMenuOpen])

  const toggleBrushMenu = () => {
    if (!brushMenuOpen) {
      const bounds = brushTriggerRef.current?.getBoundingClientRect()
      if (bounds) {
        const sidebarBounds = brushTriggerRef.current?.closest('.tool-panel')?.getBoundingClientRect()
        const leftEdge = (sidebarBounds?.right ?? bounds.right) + 8
        setBrushMenuPosition({
          left: Math.max(8, Math.min(window.innerWidth - 132, leftEdge)),
          top: Math.max(8, Math.min(window.innerHeight - 122, bounds.top + bounds.height / 2 - 57)),
        })
      }
      drawing.setActiveMode('pencil')
      tools.setActive('draw-remove')
    }
    setBrushMenuOpen((open) => !open)
  }

  const chooseBrush = (mode: DrawingMode) => {
    drawing.setActiveMode(mode)
    tools.setActive('draw-remove')
  }

  return (
    <div className="panel-content">
      <div className="drawing-mode-grid" role="group" aria-label="Drawing mode">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isBrushMode = ['pencil', 'sketch', 'marker', 'highlighter'].includes(drawing.activeMode)
          const isActive = !table.editing && (mode.id === 'pencil' ? isBrushMode : drawing.activeMode === mode.id)

          return (
            <button
              key={mode.id}
              ref={mode.id === 'pencil' ? brushTriggerRef : undefined}
              type="button"
              className={isActive ? 'drawing-mode-button active' : 'drawing-mode-button'}
              aria-pressed={isActive}
              aria-expanded={mode.id === 'pencil' ? brushMenuOpen : undefined}
              disabled={isDisabled || table.editing}
              onClick={() => mode.id === 'pencil' ? toggleBrushMenu() : chooseBrush(mode.id as DrawingMode)}
            >
              <span className="drawing-mode-icon">
                <Icon size={16} />
                {mode.id === 'pencil' && (
                  <ChevronDown
                    className={`drawing-mode-chevron${brushMenuOpen ? ' open' : ''}`}
                    size={14}
                    strokeWidth={2.25}
                    aria-hidden="true"
                  />
                )}
              </span>
              <span>{mode.label}</span>
            </button>
          )
        })}
      </div>
      {brushMenuOpen && createPortal(
        <div
          ref={brushMenuRef}
          className="retouch-brush-popover"
          role="group"
          aria-label="Brush type"
          style={{ left: brushMenuPosition.left, top: brushMenuPosition.top }}
        >
          {brushModes.map(({ id, label, sample, icon: BrushIcon }) => (
            <button
              key={id}
              type="button"
              className={`retouch-brush-option ${drawing.activeMode === id ? 'selected' : ''}`}
              aria-label={label}
              aria-pressed={drawing.activeMode === id}
              title={label}
              onClick={() => chooseBrush(id)}
            >
              <BrushIcon size={14} aria-hidden="true" />
              <span className={`retouch-brush-sample ${sample}`} aria-hidden="true" />
              <span className="visually-hidden">{label}</span>
            </button>
          ))}
        </div>,
        document.body,
      )}
      <p className="panel-note">
        {table.editing ? 'Table editing' : isDisabled ? 'Upload an image to enable drawing tools.' : toolDescriptions[drawing.activeMode]}
      </p>
      {drawing.activeMode !== 'lasso' && !table.editing && (
        <>
          {drawing.activeMode !== 'eraser' && drawing.activeMode !== 'magic-remover' && (
            <label className="field-label">
              Stroke color
              <input
                type="color"
                value={drawing.color}
                disabled={isDisabled}
                onChange={(event) => drawing.setColor(event.target.value)}
              />
            </label>
          )}
          <label className="range-field">
            <span>Brush size <b>{drawing.brushSize}px</b></span>
            <input
              type="range"
              min="2"
              max="80"
              value={drawing.brushSize}
              disabled={isDisabled}
              onChange={(event) => drawing.setBrushSize(Number(event.target.value))}
            />
          </label>
        </>
      )}
      {drawing.activeMode === 'lasso' && (
        <div className="drawing-selection-actions">
          <button type="button" className="secondary-button" disabled={isDisabled} onClick={drawing.clearSelection}>
            Clear selection
          </button>
          <button type="button" className="primary-button" disabled={isDisabled} onClick={() => void drawing.deleteSelection()}>
            Delete selection
          </button>
        </div>
      )}
      <section className="table-panel" aria-label="Table editor">
        <div className="table-panel-heading">
          <strong>Table</strong>
          {table.tables.length > 0 && <span>{table.tables.length} total</span>}
        </div>
        <button type="button" className="secondary-button full-button" disabled={isDisabled} onClick={table.create}>
          Add 3 × 3 table
        </button>
        {table.tables.length > 0 && (
          <div className="table-list" role="group" aria-label="Tables">
            {table.tables.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={table.activeId === item.id ? 'table-list-option active' : 'table-list-option'}
                aria-pressed={table.activeId === item.id}
                onClick={() => table.select(item.id)}
              >
                <span>Table {index + 1}</span>
                <small>{item.rows} × {item.columns}</small>
              </button>
            ))}
          </div>
        )}
        {table.activeId === null ? (
          <p className="panel-note">Add a table to edit its cells and layout.</p>
        ) : (
          <>
            {table.editing && (
              <div className="button-row table-add-actions">
                <button type="button" className="secondary-button" onClick={table.addRow}>+ Row</button>
                <button type="button" className="secondary-button" disabled={table.rows <= 1} onClick={table.removeRow}><Minus size={14} /> Row</button>
                <button type="button" className="secondary-button" onClick={table.addColumn}>+ Column</button>
                <button type="button" className="secondary-button" disabled={table.columns <= 1} onClick={table.removeColumn}><Minus size={14} /> Column</button>
              </div>
            )}
            <button type="button" className="secondary-button full-button" onClick={table.editing ? table.finishEditing : table.beginEditing}>
              {table.editing ? 'Done editing table' : 'Edit table'}
            </button>
            <button type="button" className="secondary-button full-button danger-action" onClick={table.deleteTable}>
              <Trash2 size={15} /> Delete table
            </button>
            <label className="field-label">
              Table border color
              <input
                type="color"
                value={table.borderColor}
                onInput={(event) => table.setBorderColor(event.currentTarget.value)}
                onChange={(event) => table.setBorderColor(event.target.value)}
              />
            </label>
          </>
        )}
      </section>
    </div>
  )
}