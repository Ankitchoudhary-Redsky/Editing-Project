import { useEditor } from '../../EditorContext'
import type { DrawingMode } from '../../model/types'
import { Eraser, Lasso, Minus, Pencil, Trash2, WandSparkles } from 'lucide-react'

const toolDescriptions: Record<
  'pencil' | 'eraser' | 'magic-remover' | 'lasso',
  string
> = {
  pencil: 'Draw freehand strokes on your image.',
  eraser: 'Erase pencil strokes from your design.',
  'magic-remover': 'Brush over image areas to make them transparent.',
  lasso: 'Draw around an image area to select it.',
}

export function DrawingPanel() {
  const { canvas, drawing, table } = useEditor()
  const isDisabled = !canvas.hasImage
  const modes = [
    { id: 'pencil', label: 'Pencil', icon: Pencil },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'magic-remover', label: 'Magic Remover', icon: WandSparkles },
    { id: 'lasso', label: 'Freehand Select', icon: Lasso },
  ] as const

  return (
    <div className="panel-content">
      <div className="drawing-mode-grid" role="group" aria-label="Drawing mode">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = !table.editing && drawing.activeMode === mode.id

          return (
            <button
              key={mode.id}
              type="button"
              className={isActive ? 'drawing-mode-button active' : 'drawing-mode-button'}
              aria-pressed={isActive}
              disabled={isDisabled || table.editing}
              onClick={() => drawing.setActiveMode(mode.id as DrawingMode)}
            >
              <Icon size={16} />
              <span>{mode.label}</span>
            </button>
          )
        })}
      </div>
      <p className="panel-note">
        {table.editing ? 'Table editing' : isDisabled ? 'Upload an image to enable drawing tools.' : toolDescriptions[drawing.activeMode]}
      </p>
      {drawing.activeMode !== 'lasso' && !table.editing && (
        <>
          {drawing.activeMode === 'pencil' && (
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