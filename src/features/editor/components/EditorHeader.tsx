import { ArrowRight, ChevronDown,Eye, Redo2, Undo2 } from 'lucide-react'
import { useEditor } from '../EditorContext'
import img1 from '../../../assets/logo.png'

export function EditorHeader() {
  const { canvas, history, project, preview } = useEditor()

  return (
    <header className="topbar">
      <div className="brand-lockup"><div className="brand-mark"><img src={img1} alt="Logo" width="35" height="35" /></div><span className="brand-name">e<span>studio</span></span></div>
      <div className="project-title">
        {project.isRenaming
          ? <input autoFocus value={project.name} onChange={(event) => project.setName(event.target.value)} onBlur={() => project.setIsRenaming(false)} onKeyDown={(event) => { if (event.key === 'Enter') project.setIsRenaming(false) }} aria-label="Project name" />
          : <button className="project-name" onClick={() => project.setIsRenaming(true)} title="Rename project">{project.name}<ChevronDown size={14} /></button>}
        <span className="save-status"><span /> All changes saved</span>
      </div>
      <div className="top-actions">
        <button className="icon-button" title="Undo" aria-label="Undo" disabled={!history.canUndo} onClick={history.undo}><Undo2 size={18} /></button>
        <button className="icon-button" title="Redo" aria-label="Redo" disabled={!history.canRedo} onClick={history.redo}><Redo2 size={18} /></button>
        <span className="action-divider" />
        <button className="preview-button" onClick={preview.show} disabled={!canvas.hasImage} ><Eye size={16} /> Preview</button>
      </div>
    </header>
  )
}

export function DocumentBreadcrumb() {
  const { project } = useEditor()
  return <div className="document-breadcrumb"><span>Design</span><ArrowRight size={13} /><strong>{project.name}</strong></div>
}