import { Search, X } from 'lucide-react'

export function TemplateSearch({ value, onChange, onClear }: {
  value: string
  onChange: (value: string) => void
  onClear: () => void
}) {
  return (
    <label className="template-search">
      <Search size={18} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search designs, occasions, or tags"
        aria-label="Search templates"
      />
      {value && <button type="button" title="Clear search" aria-label="Clear search" onClick={onClear}><X size={15} /></button>}
    </label>
  )
}