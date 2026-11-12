import { useEditor } from '../EditorContext'
import { editorToolCategories } from '../model/constants'
import { editorHeadings } from '../model/editorCopy'
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

import { LayersPanel } from './panels/LayersPanel'
import { ShadowPanel } from './panels/ShadowPanel'
import { AnimatePanel } from './panels/AnimatePanel'

export function ToolPanel() {
  const { canvas, pages, tools } = useEditor()
  if (tools.active === 'music') return null
  const activeCategory = editorToolCategories.find((category) => category.tools.some(({ id }) => id === tools.active)) ?? editorToolCategories[0]
  const panelHeading = editorHeadings.toolPanels[tools.active as keyof typeof editorHeadings.toolPanels] ?? activeCategory.label

  return (
    <aside
      className={`tool-panel${activeCategory.tools.length > 1 ? ' has-subtools' : ''}`}
      inert={pages.switching && tools.active !== 'upload'}
      aria-busy={pages.switching}
    >
      <div className={`panel-heading ${activeCategory.tools.length > 1 ? 'has-subtools' : ''}`}>
        <div><h3 className="panel-kicker">{panelHeading}</h3></div>
      </div>
      {activeCategory.tools.length > 1 && (
        <nav className="panel-subtools" aria-label={`${activeCategory.label} tools`}>
          {activeCategory.tools.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              className={`panel-subtool ${tools.active === id ? 'active' : ''}`}
              disabled={(id === 'crop' || id === 'resize') && !canvas.hasDocument}
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
      {tools.active === 'video-upload' && <VideoUploadPanel />}
      {tools.active === 'video-trim' && <VideoTrimPanel />}
      {tools.active === 'layers' && <LayersPanel />}
      {tools.active === 'shadows' && <ShadowPanel />}
      {tools.active === 'animate' && <AnimatePanel />}
    </aside>
  )
}