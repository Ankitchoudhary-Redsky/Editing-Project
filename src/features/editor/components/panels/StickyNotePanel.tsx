import { StickyNote } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { createStickyNoteObject } from '../../operations/overlayObjects'

export function StickyNotePanel() {
  const { canvas, fabricCanvas, tools } = useEditor()

  const addNote = () => {
    if (!fabricCanvas || !canvas.hasImage) return
    createStickyNoteObject(fabricCanvas)
    tools.setNotice('Sticky note added. Double-click to type, then drag to move it.')
  }

  return (
    <div className="panel-content sticky-note-panel">
      <div className="sticky-note-sample" aria-hidden="true">Write a note...</div>
      <p className="panel-note">Each note gets a random color. Double-click to type, then drag to move it.</p>
      <button className="primary-button full-button" type="button" disabled={!canvas.hasImage} onClick={addNote}>
        <StickyNote size={16} /> Paste a sticky note
      </button>
      {!canvas.hasImage && <p className="panel-note">Open an image to add a note.</p>}
    </div>
  )
}