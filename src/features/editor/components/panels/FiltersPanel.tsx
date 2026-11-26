
import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { filterPresets, filterThumbnailStyles } from '../../model/filters'
import { SeeMoreButton } from './SeeMoreButton'

export function FiltersPanel() {
  const { canvas, filters: filterState } = useEditor()
  const [showAllFilters, setShowAllFilters] = useState(false)
  const visibleFilters = showAllFilters ? filterPresets : filterPresets.slice(0, 6)
  const selectedFilter = filterPresets.find((filter) => filter.id === filterState.selected)
  if (!showAllFilters && selectedFilter && !visibleFilters.includes(selectedFilter)) {
    visibleFilters[visibleFilters.length - 1] = selectedFilter
  }

  return (
    <div className="panel-content filters-content">
      {!canvas.hasImage && (
        <p className="panel-note">Upload an image to use photo filters.</p>
      )}

      <div className="filter-grid">
        {visibleFilters.map((preset) => (
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
                style={{ filter: filterThumbnailStyles[preset.id] }}
              />
            ) : (
              <span className="filter-thumbnail filter-placeholder">Aa</span>
            )}
            <span className="filter-name">{preset.name}</span>
          </button>
        ))}
      </div>
      {filterPresets.length > 6 && (
        <SeeMoreButton
          expanded={showAllFilters}
          onClick={() => setShowAllFilters((expanded) => !expanded)}
        />
      )}
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
