import { RotateCcw } from 'lucide-react'
import { TEMPLATE_CATEGORIES } from '../data/templateCategories'
import { TEMPLATE_OCCASIONS } from '../data/templateOccasions'
import { TEMPLATE_PROFESSION_OPTIONS } from '../data/templateProfessions'
import { TEMPLATE_STYLE_OPTIONS } from '../data/templateStyles'
import type { TemplateFilters as TemplateFiltersModel } from '../model/template.types'

export function TemplateFilters({ filters, onChange, onReset }: {
  filters: TemplateFiltersModel
  onChange: (filters: TemplateFiltersModel) => void
  onReset: () => void
}) {
  const category = TEMPLATE_CATEGORIES.find(({ id }) => id === filters.category)
  const update = (patch: Partial<TemplateFiltersModel>) => onChange({ ...filters, ...patch })

  return (
    <section className="template-filters" aria-label="Template filters">
      <div className="template-filter-selects">
        <label>Category
          <select value={filters.category ?? ''} onChange={(event) => update({ category: event.target.value || undefined, subcategory: undefined })}>
            <option value="">All categories</option>
            {TEMPLATE_CATEGORIES.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label>Subcategory
          <select value={filters.subcategory ?? ''} onChange={(event) => update({ subcategory: event.target.value || undefined })}>
            <option value="">All subcategories</option>
            {(category ? category.subcategories : TEMPLATE_CATEGORIES.flatMap(({ subcategories }) => subcategories)).map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>Profession
          <select value={filters.profession ?? ''} onChange={(event) => update({ profession: event.target.value || undefined })}>
            <option value="">Any profession</option>
            {TEMPLATE_PROFESSION_OPTIONS.map(({ name }) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label>Industry
          <select value={filters.industry ?? ''} onChange={(event) => update({ industry: event.target.value || undefined })}>
            <option value="">Any industry</option>
            {['Engineering', 'Education', 'Technology', 'Healthcare', 'Business', 'Marketing', 'Finance', 'Architecture', 'Creative Arts', 'Media', 'Personal'].map((industry) => <option key={industry}>{industry}</option>)}
          </select>
        </label>
        <label>Occasion
          <select value={filters.occasion ?? ''} onChange={(event) => update({ occasion: event.target.value || undefined })}>
            <option value="">Any occasion</option>
            {TEMPLATE_OCCASIONS.map(({ name }) => <option key={name}>{name}</option>)}
          </select>
        </label>
        <label>Orientation
          <select value={filters.orientation ?? ''} onChange={(event) => update({ orientation: (event.target.value || undefined) as TemplateFiltersModel['orientation'] })}>
            <option value="">Any orientation</option>
            <option value="square">Square</option>
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
      </div>
      <div className="template-filter-bottom">
        <div className="template-style-options" aria-label="Design styles">
          {TEMPLATE_STYLE_OPTIONS.map(({ id, name }) => {
            const selected = filters.designStyles.includes(name)
            return (
              <button
                key={id}
                type="button"
                className={selected ? 'selected' : ''}
                aria-pressed={selected}
                onClick={() => update({ designStyles: selected
                  ? filters.designStyles.filter((style) => style !== name)
                  : [...filters.designStyles, name] })}
              >{name}</button>
            )
          })}
        </div>
        <details className="template-size-filter">
          <summary>Canvas size</summary>
          <div>
            <label>Min width<input type="number" min="1" value={filters.minWidth ?? ''} onChange={(event) => update({ minWidth: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label>Max width<input type="number" min="1" value={filters.maxWidth ?? ''} onChange={(event) => update({ maxWidth: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label>Min height<input type="number" min="1" value={filters.minHeight ?? ''} onChange={(event) => update({ minHeight: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label>Max height<input type="number" min="1" value={filters.maxHeight ?? ''} onChange={(event) => update({ maxHeight: event.target.value ? Number(event.target.value) : undefined })} /></label>
          </div>
        </details>
        <button type="button" className="template-reset" onClick={onReset}><RotateCcw size={14} /> Clear filters</button>
      </div>
    </section>
  )
}