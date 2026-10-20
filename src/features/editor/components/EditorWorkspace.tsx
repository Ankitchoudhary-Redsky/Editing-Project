
import type { DragEvent } from 'react'
import { Upload } from 'lucide-react'
import { useEditor } from '../EditorContext'
import { objectName } from '../model/objectName'
import ImageMusicVideoExport from './ImageMusicVideoExport'

type EditorWorkspaceProps = {
  setCanvasElement: (element: HTMLCanvasElement | null) => void
  setStageElement: (element: HTMLDivElement | null) => void
}

export function EditorWorkspace({
  setCanvasElement,
  setStageElement,
}: EditorWorkspaceProps) {
  const {
    canvas,
    fabricCanvas,
    tools,
    draggingFile,
    handleDrop,
  } = useEditor()

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    tools.setDraggingFile(true)
  }

  return (
    <section className={`workspace ${tools.active === 'music' ? 'music-mode' : ''}`}>
      <div
        className="stage"
        ref={setStageElement}
        onDragOver={handleDragOver}
        onDragLeave={() => tools.setDraggingFile(false)}
        onDrop={handleDrop}
      >
        <div className="canvas-holder">
          <div
            className="canvas-surface"
            style={{
              transform: `translate(-50%, -50%) scale(${
                canvas.fitScale * canvas.zoom
              })`,
            }}
          >
            <canvas ref={setCanvasElement} />
          </div>

          {!canvas.hasDocument && (
            <div className="empty-prompt">
              <div className="empty-art">
                <div className="empty-sun" />
                <div className="empty-mountain one" />
                <div className="empty-mountain two" />
                <span className="empty-sparkle">✳</span>
              </div>

              <h1>Your next idea starts here</h1>
              <p>
                Drop an image to begin, or choose one from your computer.
              </p>

              <button
                className="primary-button"
                onClick={tools.openFilePicker}
              >
                <Upload size={16} />
                Upload an image
              </button>

              <span className="empty-format">PNG · JPG · WEBP</span>
            </div>
          )}
        </div>

        {draggingFile && (
          <div className="drop-cover">
            <div>
              <Upload size={24} />
              <strong>Drop image to open</strong>
            </div>
          </div>
        )}
      </div>

      <div className="workspace-footer">
        <span>
          <span className="status-dot" />{' '}
          {canvas.selected
            ? `${objectName(canvas.selected, 0)} selected`
            : canvas.hasDocument
              ? 'Ready to edit'
              : 'No image selected'}
        </span>

        <span>
          Local document · {canvas.dimensions.width} ×{' '}
          {canvas.dimensions.height}
        </span>
      </div>

      {tools.active === 'music' && fabricCanvas && (
        <ImageMusicVideoExport
          fabricCanvas={fabricCanvas}
          hasImage={canvas.hasImage}
          imagePreviewUrl={fabricCanvas.toDataURL({ format: 'png', multiplier: 1 })}
          imageDimensions={canvas.dimensions}
          onBack={() => tools.setActive('adjust')}
        />
      )}
    </section>
  )
}
