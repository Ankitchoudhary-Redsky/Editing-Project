import { Upload } from 'lucide-react'
import { editorCopy, editorHeadings } from '../model/editorCopy'

type EditorEmptyStateProps = {
  onUpload: () => void
  buttonType?: 'button'
}

export function EditorEmptyState({ onUpload, buttonType }: EditorEmptyStateProps) {
  return (
    <div className="empty-prompt">
      <div className="empty-art">
        <div className="empty-sun" />
        <div className="empty-mountain one" />
        <div className="empty-mountain two" />
        <span className="empty-sparkle">✳</span>
      </div>

      <h1>{editorHeadings.emptyEditor}</h1>
      <p>{editorCopy.emptyEditorDescription}</p>

      <button
        type={buttonType}
        className="primary-button"
        onClick={onUpload}
      >
        <Upload size={16} />
        {editorCopy.uploadImage}
      </button>

      <span className="empty-format">{editorCopy.supportedImageFormats}</span>
    </div>
  )
}