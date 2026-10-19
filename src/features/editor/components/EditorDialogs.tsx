import { ArrowLeft, X } from 'lucide-react'
import { useEditor } from '../EditorContext'

export function PreviewDialog() {
  const { project, canvas, preview } = useEditor()
  if (!preview.open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={preview.close}>
      <section className="preview-modal" role="dialog" aria-modal="true" aria-label="Design preview" onClick={(event) => event.stopPropagation()}>
        <header><div><span className="panel-kicker">PREVIEW</span><h2>{project.name}</h2></div><button className="icon-button" onClick={preview.close} aria-label="Return to editor"><X size={19} /></button></header>
        <div className="preview-stage">{preview.imageUrl && <img src={preview.imageUrl} alt="Current design preview" />}</div>
        <footer><span>{canvas.dimensions.width} × {canvas.dimensions.height} px</span><button className="primary-button" onClick={preview.close}><ArrowLeft size={15} /> Back to editor</button></footer>
      </section>
    </div>
  )
}

export function EditorNotice() {
  const { tools } = useEditor()
  if (!tools.notice) return null
  return <div className="toast" role="status"><span>{tools.notice}</span><button onClick={() => tools.setNotice('')} aria-label="Dismiss message"><X size={15} /></button></div>
}