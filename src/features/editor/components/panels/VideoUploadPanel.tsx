import { useRef } from 'react'
import { RotateCcw, Trash2, Upload, Video } from 'lucide-react'
import { useEditor } from '../../../editor/EditorContext'

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Reading duration...'
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`
}

export function VideoUploadPanel() {
  const inputRef = useRef<HTMLInputElement>(null)
  const { videoClip } = useEditor()

  const chooseFile = () => inputRef.current?.click()

  return (
    <div className="panel-content">
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          if (file) videoClip.setFile(file)
          event.currentTarget.value = ''
        }}
      />
      <button className="upload-drop video-upload-drop" onClick={chooseFile}>
        <span className="upload-icon"><Video size={21} /></span>
        <strong>{videoClip.file ? 'Replace your video' : 'Upload a video'}</strong>
        <span>MP4, WebM or MOV · up to 500 MB</span>
        <span className="browse-button"><Upload size={14} /> Choose a file</span>
      </button>

      {videoClip.file ? (
        <div className="uploaded-item video-uploaded-item">
          <span className="video-file-icon"><Video size={18} /></span>
          <div>
            <strong>{videoClip.file.name}</strong>
            <span>{formatDuration(videoClip.duration)} · {(videoClip.file.size / (1024 * 1024)).toFixed(1)} MB</span>
          </div>
          <button className="mini-button" onClick={chooseFile} title="Replace video" aria-label="Replace video"><RotateCcw size={15} /></button>
          <button className="mini-button" onClick={videoClip.clear} title="Remove video" aria-label="Remove video"><Trash2 size={15} /></button>
        </div>
      ) : (
        <p className="panel-note">Your video stays on this device. Upload a clip to preview and trim it.</p>
      )}
      <div className="panel-separator" />
      <div className="panel-label-row"><span>Clip duration</span><span>{formatDuration(videoClip.duration)}</span></div>
    </div>
  )
}