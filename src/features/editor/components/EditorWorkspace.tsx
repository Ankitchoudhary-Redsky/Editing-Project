
import type { DragEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Eraser, Fullscreen, LockKeyhole, Minimize2, MoveHorizontal, MoveVertical, Paintbrush, Pencil, UnlockKeyhole, Upload } from 'lucide-react'

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
    drawing,
    draggingFile,
    table,
    handleDrop,
  } = useEditor()

  const viewportRef = useRef<HTMLDivElement>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
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
      : undefined;

  const CursorIcon = resizeCursor ?? DrawingCursorIcon;
  const displayScale = canvas.fitScale * canvas.zoom;
  const currentZoom = canvas.zoom;
  const setZoom = canvas.setZoom;

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    tools.setDraggingFile(true)
  }

  useEffect(() => {
    if (!showFullScreen) return

    fabricCanvas?.discardActiveObject()
    fabricCanvas?.requestRenderAll()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowFullScreen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [fabricCanvas, showFullScreen])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return

    const handleWheel = (event: globalThis.WheelEvent) => {
      // Only intercept pinch-to-zoom / modified wheel gestures.
      if (!event.ctrlKey && !event.metaKey) return

      if (event.cancelable) {
        event.preventDefault()
      }

      const zoomFactor = Math.exp(-event.deltaY * 0.01)
      const nextZoom = Math.min(
        3,
        Math.max(0.1, currentZoom * zoomFactor),
      )

      setZoom(nextZoom)
    }

    viewport.addEventListener('wheel', handleWheel, {
      passive: false,
    })

    return () => {
      viewport.removeEventListener('wheel', handleWheel)
    }
  }, [currentZoom, setZoom])


  return (
    <section
      className={`workspace${tools.active === 'music' ? ' music-mode' : ''}${showFullScreen ? ' focus-mode' : ''}`}
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
            className="canvas-spacer"
            style={{
              width: canvas.dimensions.width * displayScale,
              height: canvas.dimensions.height * displayScale,
            }}
          >
            <div
              className="canvas-surface"
              ref={viewportRef}
              data-drawing-cursor={showDrawingCursor}
              style={{ transform: `scale(${displayScale})` }}
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
              <p>Drop an image to begin, or choose one from your computer.</p>
              <button className="primary-button" onClick={tools.openFilePicker}>
                <Upload size={16} /> Upload an image
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

        <div className="footer-zoom">
          <button
            className={`zoom-button image-resize-lock${canvas.imageResizeLocked ? ' active' : ''}`}
            onClick={canvas.toggleImageResizeLock}
            aria-label={canvas.imageResizeLocked ? 'Unlock image movement and resizing' : 'Lock image movement and resizing'}
            title={canvas.imageResizeLocked ? 'Unlock image movement and resizing' : 'Lock image movement and resizing'}
            disabled={!canvas.hasImage}
          >
            {canvas.imageResizeLocked ? <LockKeyhole size={15} /> : <UnlockKeyhole size={15} />}
          </button>

          <button
            className="zoom-button"
            onClick={() =>
              canvas.setZoom(Math.max(0.1, canvas.zoom - 0.1))
            }
            aria-label="Zoom out"
            disabled={canvas.zoom <= 0.1}
          >
            −
          </button>

          <input
            className="zoom-slider"
            type="range"
            min="0.1"
            max="3"
            step="0.05"
            value={canvas.zoom}
            onChange={(event) =>
              canvas.setZoom(Number(event.target.value))
            }
            aria-label="Canvas zoom"
          />

          <button
            className="zoom-button"
            onClick={() =>
              canvas.setZoom(Math.min(3, canvas.zoom + 0.1))
            }
            aria-label="Zoom in"
            disabled={canvas.zoom >= 3}
          >
            +
          </button>

          <button
            className="zoom-percentage"
            onClick={() => canvas.setZoom(1)}
            title="Reset zoom to 100%"
          >
            {Math.round(canvas.zoom * 100)}%
          </button>
        </div>

        <span className="workspace-document-status">
          Local document · {canvas.dimensions.width} × {canvas.dimensions.height}
        </span>
        <button
          className="zoom-button fullscreen-toggle"
          type="button"
          onClick={() => setShowFullScreen((current) => !current)}
          aria-label={showFullScreen ? 'Exit canvas focus mode' : 'Enter canvas focus mode'}
          aria-pressed={showFullScreen}
          title={showFullScreen ? 'Exit canvas focus mode (Esc)' : 'Expand canvas'}
        >
          {showFullScreen ? <Minimize2 size={16} /> : <Fullscreen size={16} />}
        </button>
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
