import { X } from 'lucide-react'
import { useEditor } from '../EditorContext'
import { AdjustmentsPanel } from './panels/AdjustmentsPanel'
import { UploadPanel } from './panels/UploadPanel'
import { CropPanel } from './panels/CropPanel'
import { FiltersPanel } from './panels/FiltersPanel'
import { BackgroundPanel } from './panels/BackgroundPanel'
import { DrawingPanel } from './panels/DrawingPanel'

const panelTitles = {
  upload: 'Upload',
  select: 'Select',
  crop: 'Crop',
  adjust: 'Adjustments',
  filters: 'Filters',
  background: 'Background',
  'draw-remove': 'Draw & Remove',
}

export function ToolPanel() {
  const { tools } = useEditor()
  if (tools.active === 'select' || tools.active === 'music') return null

  return (
    <aside className="tool-panel">
      <div className="panel-heading"><div><h3 className="panel-kicker">{panelTitles[tools.active]}</h3></div><button className="panel-close" onClick={() => tools.setActive('select')} aria-label="Close tool panel"><X size={17} /></button></div>
      {tools.active === 'upload' && <UploadPanel />}
      {tools.active === 'crop' && <CropPanel />}
      {tools.active === 'adjust' && <AdjustmentsPanel />}
      {tools.active === 'filters' && <FiltersPanel />}
      {tools.active === 'background' && <BackgroundPanel />}
      {tools.active === 'draw-remove' && <DrawingPanel />}
    </aside>
  )
}