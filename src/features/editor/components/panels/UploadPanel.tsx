import { ImagePlus, Music2, RotateCcw, Trash } from 'lucide-react'
import { useState } from "react";
import { useEditor } from '../../../editor/EditorContext'
import { editorCopy } from '../../model/editorCopy'

function CurrentImageThumbnail({ source }: { source: string }) {
  const [failed, setFailed] = useState(false);

  if (!source || failed) {
    return (
      <span
        className="uploaded-item-thumbnail-empty"
        aria-label="Image preview unavailable"
      >
        <ImagePlus size={19} />
      </span>
    );
  }

  return (
    <img
      src={source}
      alt="Current image thumbnail"
      onError={() => setFailed(true)}
    />
  );
}

export function UploadPanel() {
  const { canvas, tools } = useEditor()
  return (
    <div className="panel-content">
      <button className="upload-drop" onClick={tools.openFilePicker}>
        <span className="upload-icon">
          <ImagePlus size={21} />
        </span>
        <strong>{editorCopy.uploadImage}</strong>
        <span>PNG, JPG or WebP · up to 30 MB</span>
        <span className="browse-button">Choose a file</span>
      </button>
      <button
        className="secondary-button"
        type="button"
        onClick={() => tools.setActive("music")}
      >
        <Music2 size={16} />
        Add music
      </button>
      {canvas.hasImage ? (
        <div className="uploaded-item">
          <CurrentImageThumbnail
            key={canvas.imageThumbnail}
            source={canvas.imageThumbnail}
          />
          <div>
            <strong>Current image</strong>
            <span>
              {canvas.dimensions.width} × {canvas.dimensions.height} px
            </span>
          </div>
          <button
            className="mini-button"
            onClick={tools.openFilePicker}
            title="Replace image"
          >
            <RotateCcw size={15} />
          </button>
          <button
            className="mini-button"
            onClick={tools.deleteImage}
            title="Delete image"
          >
            <Trash size={15} />
          </button>
        </div>
      ) : (
        <p className="panel-note">
          Your images stay on this device. Nothing is uploaded to a server.
        </p>
      )}
      <div className="panel-separator" />
      <div className="panel-label-row">
        <span>Document</span>
        <span>
          {canvas.dimensions.width} × {canvas.dimensions.height}
        </span>
      </div>
    </div>
  )
}