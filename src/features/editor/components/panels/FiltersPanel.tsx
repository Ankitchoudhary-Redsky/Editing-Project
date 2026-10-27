
import { RotateCcw } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { filterPresets } from '../../model/filters'

const thumbnailFilters: Record<string, string> = {
  original: 'none',
  grayscale: 'grayscale(1)',
  blackWhite: 'grayscale(1) contrast(1.8)',
  sepia: 'sepia(1)',
  vintage: 'sepia(.55) saturate(.8) contrast(.9)',
  retro: 'saturate(1.35) hue-rotate(-10deg)',
  warm: 'sepia(.25) saturate(1.2)',
  cool: 'hue-rotate(15deg) saturate(.9)',
  vivid: 'saturate(1.7) contrast(1.1)',
  cinematic: 'contrast(1.15) saturate(.85) hue-rotate(8deg)',
  dramatic: 'contrast(1.5) saturate(1.1)',
  fade: 'contrast(.85) brightness(1.08) saturate(.8)',
  pastel: 'saturate(.75) brightness(1.12)',
  noir: 'grayscale(1) contrast(1.5) brightness(.9)',
  dreamy: 'brightness(1.12) saturate(.8) contrast(.9)',
}

export function FiltersPanel() {
  const { canvas, filters: filterState } = useEditor()

  return (
    <div className="panel-content filters-content">
      {!canvas.hasImage && (
        <p className="panel-note">Upload an image to use photo filters.</p>
      )}

      <div className="filter-grid">
        {filterPresets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`filter-card ${filterState.selected === preset.id ? 'selected' : ''}`}
            disabled={!canvas.hasImage}
            aria-pressed={filterState.selected === preset.id}
            onClick={() => filterState.setFilter(preset.id)}
            title={preset.description}
          >
            {canvas.hasImage && canvas.imageThumbnail ? (
              <img
                src={canvas.imageThumbnail}
                alt=""
                className="filter-thumbnail"
                style={{ filter: thumbnailFilters[preset.id] }}
              />
            ) : (
              <span className="filter-thumbnail filter-placeholder">Aa</span>
            )}
            <span className="filter-name">{preset.name}</span>
          </button>
        ))}
      </div>

      <label className="range-field filter-intensity">
        <span>
          Intensity <b>{filterState.intensity}%</b>
        </span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={filterState.intensity}
          disabled={!canvas.hasImage || filterState.selected === 'original'}
          onChange={(event) =>
            filterState.setIntensity(Number(event.target.value))
          }
        />
      </label>

      <button
        className="secondary-button full-button reset-button"
        type="button"
        disabled={!canvas.hasImage}
        onClick={filterState.reset}
      >
        <RotateCcw size={15} /> Reset filter
      </button>
    </div>
  )
}
