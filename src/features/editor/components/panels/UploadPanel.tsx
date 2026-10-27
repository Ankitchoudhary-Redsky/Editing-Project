import { ImagePlus, RotateCcw, Trash } from 'lucide-react'
import { useEditor } from '../../../editor/EditorContext'
import { editorCopy } from '../../model/editorCopy'

export function UploadPanel() {
  const { canvas, tools } = useEditor()
  return (
    <div className="panel-content">
      <button className="upload-drop" onClick={tools.openFilePicker}>
        <span className="upload-icon"><ImagePlus size={21} /></span>
        <strong>{editorCopy.uploadImage}</strong>
        <span>PNG, JPG or WebP · up to 30 MB</span>
        <span className="browse-button">Choose a file</span>
      </button>
      {canvas.hasImage
        ? <div className="uploaded-item"><img src={canvas.imageThumbnail} alt="Current image thumbnail" /><div><strong>Current image</strong><span>{canvas.dimensions.width} × {canvas.dimensions.height} px</span></div><button className="mini-button" onClick={tools.openFilePicker} title="Replace image"><RotateCcw size={15} /></button><button className="mini-button" onClick={tools.deleteImage} title="Delete image"><Trash size={15} /></button></div>
        : <p className="panel-note">Your images stay on this device. Nothing is uploaded to a server.</p>}
      <div className="panel-separator" />
      <div className="panel-label-row"><span>Document</span><span>{canvas.dimensions.width} × {canvas.dimensions.height}</span></div>
    </div>
  )
}