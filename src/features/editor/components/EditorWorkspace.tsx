
import type { DragEvent } from 'react'
import { useEffect, useRef, useState } from 'react'
import { Eraser, Highlighter, MoveHorizontal, MoveVertical, Paintbrush, Pencil, Upload } from 'lucide-react'

import { useEditor } from '../EditorContext'
import { EditorEmptyState } from './EditorEmptyState'
import { objectName } from '../model/objectName'
import type { DrawingMode, CanvasSurfaceProps } from '../model/types'
import type { EditorWorkspaceProps } from '../model/types'
import ImageMusicVideoExport from './ImageMusicVideoExport'

function CanvasSurface({
  scale,
  setCanvasElement,
  showDrawingCursor,
  brushSize,
  cursorIcon: CursorIcon,
  isResizeCursor,
}: CanvasSurfaceProps) {
  const cursorElementRef = useRef<HTMLDivElement | null>(null)
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const cursor = cursorElementRef.current
    const position = cursorPositionRef.current
    if (!cursor || !showDrawingCursor || !position) return

    cursor.style.left = `${position.x}px`
    cursor.style.top = `${position.y}px`
    cursor.style.visibility = 'visible'
  }, [showDrawingCursor, CursorIcon])

  return (
    <div
      className="canvas-surface"
      data-drawing-cursor={showDrawingCursor}
      style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      onPointerMoveCapture={(event) => {
        if (!showDrawingCursor) return
        const bounds = event.currentTarget.getBoundingClientRect()
        const pointerScale = bounds.width / event.currentTarget.offsetWidth || 1
        const position = {
          x: (event.clientX - bounds.left) / pointerScale,
          y: (event.clientY - bounds.top) / pointerScale,
        }
        cursorPositionRef.current = position
        const cursor = cursorElementRef.current
        if (cursor) {
          cursor.style.left = `${position.x}px`
          cursor.style.top = `${position.y}px`
          cursor.style.visibility = 'visible'
        }
      }}
      onPointerLeave={() => {
        cursorPositionRef.current = null
        if (cursorElementRef.current) cursorElementRef.current.style.visibility = 'hidden'
      }}
    >
      <canvas ref={setCanvasElement} />
      {showDrawingCursor && CursorIcon && (
        <div
          ref={cursorElementRef}
          className="drawing-cursor"
          style={{ visibility: 'hidden' }}
          aria-hidden="true"
        >
          {!isResizeCursor && (
            <span
              className="drawing-cursor-brush"
              style={{ width: brushSize, height: brushSize }}
            />
          )}
          <span className={isResizeCursor ? 'drawing-cursor-icon table-resize-cursor' : 'drawing-cursor-icon'}>
            <CursorIcon size={17} strokeWidth={2.2} />
          </span>
        </div>
      )}
    </div>
  )
}

export function EditorWorkspace({
  historyVersion,
  setCanvasElement,
  setStageElement,
}: EditorWorkspaceProps & { historyVersion: number }) {
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

  const drawingCursorIcons: Partial<Record<DrawingMode, typeof Pencil>> = {
    pencil: Pencil,
    eraser: Eraser,
    highlighter: Highlighter,
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

  const [imagePreviewUrl, setImagePreviewUrl] = useState('')

  useEffect(() => {
    if (!canvas.hasImage || !fabricCanvas || tools.active !== 'music') return

    const frame = window.requestAnimationFrame(() => {
      setImagePreviewUrl(fabricCanvas.toDataURL({ format: 'png', multiplier: 1 }))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [canvas.hasImage, fabricCanvas, historyVersion, tools.active])

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
          <CanvasSurface
            scale={canvas.fitScale * canvas.zoom}
            setCanvasElement={setCanvasElement}
            showDrawingCursor={showDrawingCursor}
            brushSize={drawing.brushSize * (drawing.activeMode === 'highlighter' ? 3 : 1)}
            cursorIcon={CursorIcon}
            isResizeCursor={Boolean(resizeCursor)}
          />
          {!canvas.hasDocument && <EditorEmptyState onUpload={tools.openFilePicker} />}
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
          imagePreviewUrl={imagePreviewUrl}
          imageDimensions={canvas.dimensions}
          isActive={tools.active === 'music'}
          onBack={() => tools.setActive('adjust')}
        />
      )}
    </section>
  )
}
