import { ArrowLeft, Image as ImageIcon } from 'lucide-react'
import { EditorEmptyState } from '../EditorEmptyState'

export function VideoExportPreview({ hasCanvasImage, imagePreviewUrl, imageDimensions, onBack, onUpload }) {
  return (
    <div className="music-preview-panel">
      <button type="button" className="music-back-button" onClick={onBack}>
        <ArrowLeft size={16} />
        Back to editor
      </button>

      <div className="music-preview-frame">
        {hasCanvasImage && imagePreviewUrl ? (
          <img src={imagePreviewUrl} alt="Selected image preview" />
        ) : (
          <EditorEmptyState onUpload={onUpload} buttonType="button" />
        )}
      </div>

      <div className="music-preview-caption">
        <span className="music-preview-icon">
          <ImageIcon size={16} />
        </span>
        <span>
          <strong>Selected image</strong>
          <small>
            {imageDimensions.width} × {imageDimensions.height} px
          </small>
        </span>
      </div>
    </div>
  )
}
