import { useEditor } from '../../EditorContext'
import type { DrawingMode } from '../../model/types'
import { Eraser, Lasso, Pencil, WandSparkles } from 'lucide-react'

const toolDescriptions: Record<
  'pencil' | 'eraser' | 'magic-remover' | 'lasso',
  string
> = {
  pencil: 'Draw freehand strokes on your image.',
  eraser: 'Erase pencil strokes from your design.',
  'magic-remover': 'Brush over image areas to remove them.',
  lasso: 'Draw around an image area to select it.',
}

export function DrawingPanel() {
  const { canvas, drawing } = useEditor()
  const isDisabled = !canvas.hasImage
  const modes = [
    { id: 'pencil', label: 'Draw', icon: Pencil },
    { id: 'eraser', label: 'Eraser', icon: Eraser },
    { id: 'magic-remover', label: 'Object removal', icon: WandSparkles },
    { id: 'lasso', label: 'Freehand Select', icon: Lasso },
  ] as const

  return (
    <div className="panel-content">
      <div className="drawing-mode-grid" role="group" aria-label="Drawing mode">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = drawing.activeMode === mode.id

          return (
            <button
              key={mode.id}
              type="button"
              className={isActive ? 'drawing-mode-button active' : 'drawing-mode-button'}
              aria-pressed={isActive}
              disabled={isDisabled}
              onClick={() => drawing.setActiveMode(mode.id as DrawingMode)}
            >
              <Icon size={16} />
              <span>{mode.label}</span>
            </button>
          )
        })}
      </div>
      <p className="panel-note">
        {isDisabled ? 'Upload an image to enable drawing tools.' : toolDescriptions[drawing.activeMode]}
      </p>
      {drawing.activeMode !== 'lasso' && (
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
    </div>
  )
}