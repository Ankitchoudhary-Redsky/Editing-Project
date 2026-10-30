import { useEditor } from '../EditorContext'
import { editorToolCategories } from '../model/constants'
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
import { LayersPanel } from './panels/LayersPanel'
import { SignaturePanel } from './panels/SignaturePanel'
import { StickyNotePanel } from './panels/StickyNotePanel'
import { FramesLayoutPanel } from './panels/FramesLayoutPanel'

export function ToolPanel() {
  const { canvas, tools } = useEditor()
  if (tools.active === 'music') return null
  const activeCategory = editorToolCategories.find((category) => category.tools.some(({ id }) => id === tools.active)) ?? editorToolCategories[0]

  return (
    <aside className="tool-panel">
      <div className="panel-heading"><div><h3 className="panel-kicker">{activeCategory.label}</h3></div></div>
      {activeCategory.tools.length > 1 && (
        <nav className="panel-subtools" aria-label={`${activeCategory.label} tools`}>
          {activeCategory.tools.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`panel-subtool ${tools.active === id ? 'active' : ''}`}
              disabled={(id === 'crop' || id === 'resize') && !canvas.hasImage}
              aria-pressed={tools.active === id}
              onClick={() => {
                tools.setActive(id)
                if (id === 'crop') tools.beginCrop()
              }}
            >
              {label}
            </button>
          ))}
        </nav>
      )}
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
      {tools.active === 'signature' && <SignaturePanel />}
      {tools.active === 'sticky-note' && <StickyNotePanel />}
      {tools.active === 'layers' && <LayersPanel />}
      {tools.active === 'frames-layout' && <FramesLayoutPanel />}
    </aside>
  )
}