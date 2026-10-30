
import type { DragEvent } from 'react'
import { useState } from 'react'
import { Eraser, MoveHorizontal, MoveVertical, Paintbrush, Pencil, Upload } from 'lucide-react'

import { useEditor } from '../EditorContext'
import { objectName } from '../model/objectName'
import type { DrawingMode } from '../model/types'
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
    editorMode,
    videoClip,
    drawing,
    draggingFile,
    table,
    handleDrop,
  } = useEditor()

  const [cursorPosition, setCursorPosition] = useState<{
    x: number
    y: number
  } | null>(null)

  const drawingCursorIcons: Partial<Record<DrawingMode, typeof Pencil>> = {
    pencil: Pencil,
    eraser: Eraser,
    'magic-remover': Paintbrush,
  }

  const DrawingCursorIcon = drawingCursorIcons[drawing.activeMode]
  const showDrawingCursor = tools.active === 'draw-remove' && Boolean(DrawingCursorIcon)
  const resizeCursor = table.resizeHover === 'column'
    ? MoveHorizontal
    : table.resizeHover === 'row'
      ? MoveVertical
      : undefined
  const CursorIcon = resizeCursor ?? DrawingCursorIcon

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    tools.setDraggingFile(true)
  }

  return (
    <section
      className={`workspace ${editorMode.active === 'video' ? 'video-mode' : ''} ${tools.active === 'music' ? 'music-mode' : ''}`}
    >
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
            data-drawing-cursor={showDrawingCursor}
            style={{
              transform: `translate(-50%, -50%) scale(${canvas.fitScale * canvas.zoom})`,
            }}
            onPointerMoveCapture={(event) => {
              const bounds = event.currentTarget.getBoundingClientRect()
              const scale = bounds.width / event.currentTarget.offsetWidth || 1
              setCursorPosition({
                x: (event.clientX - bounds.left) / scale,
                y: (event.clientY - bounds.top) / scale,
              })
            }}
            onPointerLeave={() => setCursorPosition(null)}
          >
            <canvas ref={setCanvasElement} />
            {showDrawingCursor && cursorPosition && CursorIcon && (
              <div
                className="drawing-cursor"
                style={{ left: cursorPosition.x, top: cursorPosition.y }}
                aria-hidden="true"
              >
                {!resizeCursor && (
                  <span
                    className="drawing-cursor-brush"
                    style={{ width: drawing.brushSize, height: drawing.brushSize }}
                  />
                )}
                <span className={resizeCursor ? 'drawing-cursor-icon table-resize-cursor' : 'drawing-cursor-icon'}>
                  <CursorIcon size={17} strokeWidth={2.2} />
                </span>
              </div>
            )}
          </div>
          {!canvas.hasImage && (
            <div className="empty-prompt">
              <div className="empty-art">
                <div className="empty-sun" />
                <div className="empty-mountain one" />
                <div className="empty-mountain two" />
                <span className="empty-sparkle">✳</span>
              </div>
              <h1>Your next idea starts here</h1>
              <p>Drop an image to begin, or choose one from your computer.</p>
              <button className="primary-button" onClick={tools.openFilePicker}>
                <Upload size={16} /> Upload an image
              </button>
              <span className="empty-format">PNG · JPG · WEBP</span>
            </div>
          )}
        </div>

        {editorMode.active === 'video' && tools.active !== 'music' && (
          <div className="video-workspace-preview">
            {videoClip.url ? (
              <video
                src={videoClip.url}
                controls
                onLoadedMetadata={(event) => videoClip.setDuration(event.currentTarget.duration)}
                aria-label="Uploaded video preview"
              />
            ) : (
              <div className="video-empty-state">
                <Upload size={25} />
                <strong>Start with a video</strong>
                <button className="primary-button" onClick={() => tools.setActive('video-upload')}>Upload video</button>
              </div>
            )}
          </div>
        )}

        {editorMode.active === 'video' && videoClip.isTrimming && (
          <div className="video-trim-loading" role="status" aria-live="polite">
            <span className="video-trim-spinner" aria-hidden="true" />
            <strong>Preparing your trimmed video</strong>
            <span>Playing audio while the clip is processed. Your download will start when it finishes.</span>
          </div>
        )}

        {draggingFile && (
          <div className="drop-cover">
            <div>
              <Upload size={24} />
              <strong>Drop {editorMode.active === 'video' ? 'video' : 'image'} to open</strong>
            </div>
          </div>
        )}
      </div>

      <div className="workspace-footer">
        <span>
          <span className="status-dot" />{' '}
          {editorMode.active === 'video'
            ? videoClip.file ? 'Video loaded' : 'No video selected'
            : canvas.selected
            ? `${objectName(canvas.selected, 0)} selected`
            : canvas.hasDocument
              ? 'Ready to edit'
              : 'No image selected'}
        </span>

        <span>{editorMode.active === 'video'
          ? videoClip.file ? `Local video · ${videoClip.duration ? `${videoClip.duration.toFixed(1)} s` : 'reading duration'}` : 'Local video workspace'
          : `Local document · ${canvas.dimensions.width} × ${canvas.dimensions.height}`}</span>
      </div>

      {fabricCanvas && (
        <ImageMusicVideoExport
          fabricCanvas={fabricCanvas}
          hasImage={canvas.hasImage}
          imagePreviewUrl={fabricCanvas.toDataURL({
            format: 'png',
            multiplier: 1,
          })}
          imageDimensions={canvas.dimensions}
          isActive={tools.active === 'music'}
          onBack={() => tools.setActive('adjust')}
        />
      )}
    </section>
  )
}
