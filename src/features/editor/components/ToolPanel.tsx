import { X } from 'lucide-react'
import { useEditor } from '../EditorContext'
import { AdjustmentsPanel } from './panels/AdjustmentsPanel'
import { UploadPanel } from './panels/UploadPanel'
import { CropPanel } from './panels/CropPanel'
import { ResizePanel } from './panels/ResizePanel'
import { TextPanel } from './panels/TextPanel'
import { ShapesPanel } from './panels/ShapesPanel'
import { FiltersPanel } from './panels/FiltersPanel'
import { BackgroundPanel } from './panels/BackgroundPanel'
import { DrawingPanel } from './panels/DrawingPanel'
import { StickersPanel } from './panels/StickersPanel'
import { VideoUploadPanel } from './panels/VideoUploadPanel'
import { VideoTrimPanel } from './panels/VideoTrimPanel'

const panelTitles = {
  upload: 'Upload',
  select: 'Select',
  crop: 'Crop',
  resize: 'Resize',
  adjust: 'Adjustments',
  text: 'Text',
  shapes: 'Shapes',
  filters: 'Filters',
  background: 'Background',
  'draw-remove': 'Draw & Remove',
  stickers: 'Animated Stickers',
  'video-upload': 'Upload video',
  'video-trim': 'Trim video',
}

export function ToolPanel() {
  const { tools, editorMode } = useEditor()
  if (tools.active === 'select' || tools.active === 'music') return null

  return (
    <aside className="tool-panel">
      <div className="panel-heading"><div><h3 className="panel-kicker">{panelTitles[tools.active]}</h3></div><button className="panel-close" onClick={() => tools.setActive(editorMode.active === 'image' ? 'select' : 'video-upload')} aria-label="Close tool panel"><X size={17} /></button></div>
      {tools.active === 'upload' && <UploadPanel />}
      {tools.active === 'crop' && <CropPanel />}
      {tools.active === 'resize' && <ResizePanel />}
      {tools.active === 'text' && <TextPanel />}
      {tools.active === 'shapes' && <ShapesPanel />}
      {tools.active === 'adjust' && <AdjustmentsPanel />}
      {tools.active === 'filters' && <FiltersPanel />}
      {tools.active === 'background' && <BackgroundPanel />}
      {tools.active === 'draw-remove' && <DrawingPanel />}
      {tools.active === 'stickers' && <StickersPanel />}
      {tools.active === 'video-upload' && <VideoUploadPanel />}
      {tools.active === 'video-trim' && <VideoTrimPanel />}
    </aside>
  )
}