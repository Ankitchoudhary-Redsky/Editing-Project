import { ArrowLeft, Download, FileImage, Play, X } from 'lucide-react'
import { useEditor } from '../EditorContext'
import { editorHeadings } from '../model/editorCopy'
import { VideoPreviewPlayer } from './videoExport/VideoPreviewPlayer'
import { formatTime as formatPreviewTime } from './videoExport/videoExportUtils'

export function PreviewDialog() {
  const { project, canvas, preview } = useEditor()

  if (!preview.open) return null
  const isVideoPreview = preview.mode === 'video'
  const video = preview.video

  return (
    <div className="modal-backdrop" role="presentation" onClick={preview.close}>
      <section className={`preview-modal ${isVideoPreview ? 'video-preview-modal' : ''}`} role="dialog" aria-modal="true" aria-label={isVideoPreview ? 'Image to video preview' : 'Design preview'} onClick={(event) => event.stopPropagation()}>
        <header><div><span className="panel-kicker">{isVideoPreview ? 'VIDEO PREVIEW' : 'PREVIEW'}</span><h2>{isVideoPreview ? editorHeadings.imageToVideo : project.name}</h2></div><button className="icon-button" onClick={preview.close} aria-label="Return to editor"><X size={19} /></button></header>
        {isVideoPreview ? (
          <div className="preview-stage video-preview-stage">
            <div className="preview-video-frame">
              {video?.imageUrl && <img src={video.imageUrl} alt="Video preview frame" />}
              <span className="preview-video-badge"><Play size={13} fill="currentColor" /> VIDEO</span>
            </div>
            {video?.audioUrl ? (
              <VideoPreviewPlayer key={video.audioUrl} video={video} />
            ) : (
              <p className="preview-audio-empty">Add background music to preview the video soundtrack.</p>
            )}
          </div>
        ) : (
          <div className="preview-stage">{preview.imageUrl && <img src={preview.imageUrl} alt="Current design preview" />}</div>
        )}
        <footer>
          <span>{isVideoPreview && video ? `${formatPreviewTime(video.startTime)} – ${formatPreviewTime(video.endTime)} · ${formatPreviewTime(video.endTime - video.startTime)}` : `${canvas.dimensions.width} × ${canvas.dimensions.height} px`}</span>
          <button className="primary-button" onClick={preview.close}><ArrowLeft size={15} /> Back to editor</button>
        </footer>
      </section>
    </div>
  )
}

export function ExportDialog() {
  const { canvas, export: exportState } = useEditor()
  if (!exportState.open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={() => exportState.setOpen(false)}>
      <section className="export-modal" role="dialog" aria-modal="true" aria-label="Export design" onClick={(event) => event.stopPropagation()}>
        <header><div><span className="panel-kicker">DOWNLOAD FILE</span><h2>Export your design</h2></div><button className="icon-button" onClick={() => exportState.setOpen(false)} aria-label="Close export dialog"><X size={19} /></button></header>
        <label className="field-label">File format<select value={exportState.format} onChange={(event) => exportState.setFormat(event.target.value as 'png' | 'jpeg')}><option value="png">PNG · transparent background</option><option value="jpeg">JPG · white background</option></select></label>
        <label className="field-label export-scale-label">Output size<select value={exportState.scale} onChange={(event) => exportState.setScale(Number(event.target.value))}><option value={1}>Original · {canvas.dimensions.width} × {canvas.dimensions.height}</option><option value={2}>2× · {canvas.dimensions.width * 2} × {canvas.dimensions.height * 2}</option><option value={3}>3× · {canvas.dimensions.width * 3} × {canvas.dimensions.height * 3}</option></select></label>
        <label className="export-watermark-option"><input type="checkbox" checked={exportState.watermark} onChange={(event) => exportState.setWatermark(event.target.checked)} /><span>Add project watermark</span></label>
        <div className="export-info"><FileImage size={17} /><span>Exported locally from the full-resolution document.</span></div>
        <button className="download-button full-button" onClick={() => void exportState.download()} disabled={exportState.busy}><Download size={16} /> {exportState.busy ? 'Preparing file…' : 'Download design'}</button>
      </section>
    </div>
  )
}


export function EditorNotice() {
  const { tools } = useEditor()
  if (!tools.notice) return null
  return <div className="toast" role="status"><span>{tools.notice}</span><button onClick={() => tools.setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>
}