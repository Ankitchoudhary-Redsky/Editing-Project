import { useRef, useState } from 'react'
import { Check, ImagePlus, Link2, Trash2 } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import type { GridLayoutId } from '../../operations/gridLayout'

const frameStyles = [
  { id: 'none', label: 'No frame', preview: 'frame-none' },
  { id: 'clean', label: 'Clean', preview: 'frame-clean' },
  { id: 'matte', label: 'Matte', preview: 'frame-matte' },
  { id: 'soft-shadow', label: 'Soft shadow', preview: 'frame-shadow' },
  { id: 'bold', label: 'Bold', preview: 'frame-bold' },
] as const

const layouts: Array<{ id: GridLayoutId; label: string; cells: number }> = [
  { id: 'side-by-side', label: 'Side by side', cells: 2 },
  { id: 'stacked', label: 'Stacked', cells: 2 },
  { id: 'four-grid', label: 'Four grid', cells: 4 },
  { id: 'three-columns', label: 'Three columns', cells: 3 },
  { id: 'feature-left', label: 'Feature left', cells: 3 },
  { id: 'feature-top', label: 'Feature top', cells: 3 },
]

export function FramesLayoutPanel() {
  const { canvas, framesLayout } = useEditor()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [frameStyle, setFrameStyle] = useState<(typeof frameStyles)[number]['id']>('clean')
  const [frameColor, setFrameColor] = useState('#ffffff')
  const [layout, setLayout] = useState<GridLayoutId>('four-grid')
  const [gap, setGap] = useState(14)
  const [background, setBackground] = useState('#f4f3ef')
  const [targetCellId, setTargetCellId] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const selectedCell = framesLayout.cells.find((cell) => cell.id === framesLayout.selectedCellId)

  const chooseLocalImage = (cellId: string) => {
    setTargetCellId(cellId)
    framesLayout.selectCell(cellId)
    fileInputRef.current?.click()
  }

  const addUrlImage = async () => {
    if (!selectedCell || !imageUrl.trim()) return
    setBusy(true)
    try {
      await framesLayout.addCellImage(selectedCell.id, undefined, imageUrl.trim())
      setImageUrl('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="panel-content frames-layout-panel">
      <section className="control-section">
        <div className="panel-label-row"><span>Frame design</span></div>
        <div className="frame-design-grid">
          {frameStyles.map(({ id, label, preview }) => (
            <button
              key={id}
              type="button"
              className={`frame-design-choice ${frameStyle === id ? 'selected' : ''}`}
              aria-pressed={frameStyle === id}
              onClick={() => setFrameStyle(id)}
            >
              <span className={`frame-design-preview ${preview}`} aria-hidden="true"><i /></span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <div className="frame-color-row">
          <label htmlFor="frame-color">Frame color</label>
          <input id="frame-color" type="color" value={frameColor} onChange={(event) => setFrameColor(event.target.value)} />
        </div>
        <button
          className="primary-button full-button"
          type="button"
          disabled={!canvas.selectedIsImage}
          onClick={() => framesLayout.applyFrame(frameStyle, frameColor)}
        >
          <Check size={15} /> Apply frame to selected image
        </button>
        {!canvas.hasImage && !canvas.hasDocument && (
          <>
            <button
              className="secondary-button full-button"
              type="button"
              onClick={() => framesLayout.createCanvasFrame(frameStyle, frameColor)}
            >
              <ImagePlus size={15} /> Create blank frame on canvas
            </button>
            <p className="panel-note">Adds a photo slot without replacing existing artwork. Click it to choose a photo, or drop an image onto it.</p>
          </>
        )}
      </section>

      <div className="panel-separator" />

      <section className="control-section">
        <div className="panel-label-row"><span>Grid layouts</span></div>
        <div className="grid-layout-choices">
          {layouts.map(({ id, label, cells }) => (
            <button
              key={id}
              type="button"
              className={`grid-layout-choice ${layout === id ? 'selected' : ''}`}
              aria-pressed={layout === id}
              onClick={() => setLayout(id)}
            >
              <span className={`grid-layout-preview layout-${id}`} aria-hidden="true">
                {Array.from({ length: cells }, (_, index) => <i key={index} />)}
              </span>
              <span>{label}</span>
            </button>
          ))}
        </div>
        <label className="range-field">
          <span>Cell spacing <b>{gap}px</b></span>
          <input type="range" min="0" max="48" step="2" value={gap} onChange={(event) => setGap(Number(event.target.value))} />
        </label>
        <div className="frame-color-row">
          <label htmlFor="layout-background">Canvas color</label>
          <input id="layout-background" type="color" value={background} onChange={(event) => setBackground(event.target.value)} />
        </div>
        <button className="secondary-button full-button" type="button" onClick={() => framesLayout.applyLayout(layout, gap, background)}>
          Apply selected layout
        </button>
      </section>

      <div className="panel-separator" />

      <section className="control-section">
        <div className="panel-label-row"><span>Photos in layout</span><span>{framesLayout.cells.filter((cell) => cell.hasImage).length}/{framesLayout.cells.length}</span></div>
        {framesLayout.cells.length === 0 ? (
          <p className="panel-note">Apply a grid layout first, then add a different photo to each cell.</p>
        ) : (
          <div className="grid-cell-list">
            {framesLayout.cells.map((cell) => (
              <div key={cell.id} className={`grid-cell-row ${framesLayout.selectedCellId === cell.id ? 'selected' : ''}`}>
                <button className="grid-cell-select" type="button" onClick={() => framesLayout.selectCell(cell.id)} aria-pressed={framesLayout.selectedCellId === cell.id}>
                  {cell.thumbnail
                    ? <img src={cell.thumbnail} alt="" />
                    : <span className="grid-cell-empty"><ImagePlus size={16} /></span>}
                  <span><strong>Cell {cell.index}</strong><small>{cell.hasImage ? 'Photo added' : 'Empty cell'}</small></span>
                </button>
                <button className="mini-button" type="button" title={cell.hasImage ? 'Replace this cell photo' : 'Choose a photo for this cell'} aria-label={`${cell.hasImage ? 'Replace' : 'Add'} photo in cell ${cell.index}`} onClick={() => chooseLocalImage(cell.id)}>
                  <ImagePlus size={15} />
                </button>
                {cell.hasImage && (
                  <button className="mini-button danger-action" type="button" title="Remove this cell photo" aria-label={`Remove photo from cell ${cell.index}`} onClick={() => framesLayout.removeCellImage(cell.id)}>
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          hidden
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            if (file && targetCellId) {
              setBusy(true)
              void framesLayout.addCellImage(targetCellId, file).finally(() => setBusy(false))
            }
            event.currentTarget.value = ''
          }}
        />
        {framesLayout.selectedCellId && (
          <div className="grid-url-entry">
            <label className="field-label" htmlFor="grid-image-url">Use image URL for cell {selectedCell?.index ?? ''}</label>
            <div className="grid-url-row">
              <input id="grid-image-url" type="url" value={imageUrl} placeholder="https://example.com/photo.jpg" onChange={(event) => setImageUrl(event.target.value)} />
              <button className="mini-button" type="button" disabled={!imageUrl.trim() || busy} title="Add image from URL" aria-label="Add image from URL" onClick={() => void addUrlImage()}>
                <Link2 size={15} />
              </button>
            </div>
          </div>
        )}
        {busy && <p className="panel-note" role="status">Preparing cell photo…</p>}
        {!canvas.hasDocument && <p className="panel-note">Applying a layout replaces the current canvas contents.</p>}
      </section>
    </div>
  )
}
