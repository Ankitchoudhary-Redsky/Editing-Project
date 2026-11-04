import type { DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Eraser,
  Fullscreen,
  LockKeyhole,
  Minimize2,
  Highlighter,
  MoveHorizontal,
  MoveVertical,
  Paintbrush,
  Pencil,
  UnlockKeyhole,
  Upload,
} from "lucide-react";

import { useEditor } from "../EditorContext";
import { UploadLanding } from "./UploadLanding";
import { objectName } from "../model/objectName";
import type { DrawingMode, CanvasSurfaceProps } from "../model/types";
import type { EditorWorkspaceProps } from "../model/types";
import ImageMusicVideoExport from "./ImageMusicVideoExport";

function CanvasSurface({
  scale,
  setCanvasElement,
  showDrawingCursor,
  brushSize,
  cursorIcon: CursorIcon,
  isResizeCursor,
}: CanvasSurfaceProps) {
  const cursorElementRef = useRef<HTMLDivElement | null>(null);
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const cursor = cursorElementRef.current;
    const position = cursorPositionRef.current;
    if (!cursor || !showDrawingCursor || !position) return;

    cursor.style.left = `${position.x}px`;
    cursor.style.top = `${position.y}px`;
    cursor.style.visibility = "visible";
  }, [showDrawingCursor, CursorIcon]);

  return (
    <div
      className="canvas-surface"
      data-drawing-cursor={showDrawingCursor}
      style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      onPointerMoveCapture={(event) => {
        if (!showDrawingCursor) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        const pointerScale =
          bounds.width / event.currentTarget.offsetWidth || 1;
        const position = {
          x: (event.clientX - bounds.left) / pointerScale,
          y: (event.clientY - bounds.top) / pointerScale,
        };
        cursorPositionRef.current = position;
        const cursor = cursorElementRef.current;
        if (cursor) {
          cursor.style.left = `${position.x}px`;
          cursor.style.top = `${position.y}px`;
          cursor.style.visibility = "visible";
        }
      }}
      onPointerLeave={() => {
        cursorPositionRef.current = null;
        if (cursorElementRef.current)
          cursorElementRef.current.style.visibility = "hidden";
      }}
    >
      <canvas ref={setCanvasElement} />
      {showDrawingCursor && CursorIcon && (
        <div
          ref={cursorElementRef}
          className="drawing-cursor"
          style={{ visibility: "hidden" }}
          aria-hidden="true"
        >
          {!isResizeCursor && (
            <span
              className="drawing-cursor-brush"
              style={{ width: brushSize, height: brushSize }}
            />
          )}
          <span
            className={
              isResizeCursor
                ? "drawing-cursor-icon table-resize-cursor"
                : "drawing-cursor-icon"
            }
          >
            <CursorIcon size={17} strokeWidth={2.2} />
          </span>
        </div>
      )}
    </div>
  );
}
// type EditorWorkspaceProps = {
//   setCanvasElement: (element: HTMLCanvasElement | null) => void;
//   setStageElement: (element: HTMLDivElement | null) => void;
// };

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
  } = useEditor();

  const viewportRef = useRef<HTMLDivElement>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [uploadingInitialImage, setUploadingInitialImage] = useState(false);

  const drawingCursorIcons: Partial<Record<DrawingMode, typeof Pencil>> = {
    pencil: Pencil,
    eraser: Eraser,
    highlighter: Highlighter,
    "magic-remover": Paintbrush,
  };

  const DrawingCursorIcon = drawingCursorIcons[drawing.activeMode];
  const showDrawingCursor =
    tools.active === "draw-remove" && Boolean(DrawingCursorIcon);
  const resizeCursor =
    table.resizeHover === "column"
      ? MoveHorizontal
      : table.resizeHover === "row"
        ? MoveVertical
        : undefined;

  const CursorIcon = resizeCursor ?? DrawingCursorIcon;
  const currentZoom = canvas.zoom;
  const setZoom = canvas.setZoom;

  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  useEffect(() => {
    if (!canvas.hasImage || !fabricCanvas || tools.active !== "music") return;

    const frame = window.requestAnimationFrame(() => {
      setImagePreviewUrl(
        fabricCanvas.toDataURL({ format: "png", multiplier: 1 }),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvas.hasImage, fabricCanvas, historyVersion, tools.active]);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    tools.setDraggingFile(true);
  };

  useEffect(() => {
    if (!showFullScreen) return;

    fabricCanvas?.discardActiveObject();
    fabricCanvas?.requestRenderAll();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowFullScreen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [fabricCanvas, showFullScreen]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const handleWheel = (event: globalThis.WheelEvent) => {
      // Only intercept pinch-to-zoom / modified wheel gestures.
      if (!event.ctrlKey && !event.metaKey) return;

      if (event.cancelable) {
        event.preventDefault();
      }

      const zoomFactor = Math.exp(-event.deltaY * 0.01);
      const nextZoom = Math.min(3, Math.max(0.1, currentZoom * zoomFactor));

      setZoom(nextZoom);
    };

    viewport.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, [currentZoom, setZoom]);

  return (
    <section
      className={`workspace ${editorMode.active === "video" ? "video-mode" : ""} ${tools.active === "music" ? " music-mode" : ""}${showFullScreen ? " focus-mode" : ""}`}
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
            brushSize={
              drawing.brushSize * (drawing.activeMode === "highlighter" ? 3 : 1)
            }
            cursorIcon={CursorIcon}
            isResizeCursor={Boolean(resizeCursor)}
          />
          {(!canvas.hasDocument || uploadingInitialImage) &&
            editorMode.active === "image" && (
              <UploadLanding
                restoring={false}
                onUploadStart={() => setUploadingInitialImage(true)}
                onUploadFinish={() => setUploadingInitialImage(false)}
                onUpload={(file, onProgress) =>
                  tools.uploadFile(file, onProgress)
                }
              />
            )}
        </div>

        {editorMode.active === "video" && tools.active !== "music" && (
          <div className="video-workspace-preview">
            {videoClip.url ? (
              <video
                src={videoClip.url}
                controls
                onLoadedMetadata={(event) =>
                  videoClip.setDuration(event.currentTarget.duration)
                }
                aria-label="Uploaded video preview"
              />
            ) : (
              <div className="video-empty-state">
                <Upload size={25} />
                <strong>Start with a video</strong>
                <button
                  className="primary-button"
                  onClick={() => tools.setActive("video-upload")}
                >
                  Upload video
                </button>
              </div>
            )}
          </div>
        )}

        {editorMode.active === "video" && videoClip.isTrimming && (
          <div className="video-trim-loading" role="status" aria-live="polite">
            <span className="video-trim-spinner" aria-hidden="true" />
            <strong>Preparing your trimmed video</strong>
            <span>
              Playing audio while the clip is processed. Your download will
              start when it finishes.
            </span>
          </div>
        )}

        {draggingFile && (
          <div className="drop-cover">
            <div>
              <Upload size={24} />
              <strong>
                Drop {editorMode.active === "video" ? "video" : "image"} to open
              </strong>
            </div>
          </div>
        )}
      </div>

      <div className="workspace-footer">
        <span>
          <span className="status-dot" />{" "}
          {editorMode.active === "video"
            ? videoClip.file
              ? "Video loaded"
              : "No video selected"
            : canvas.selected
              ? `${objectName(canvas.selected, 0)} selected`
              : canvas.hasDocument
                ? "Ready to edit"
                : "No image selected"}
        </span>

        <div className="footer-zoom">
          <button
            className={`zoom-button image-resize-lock${canvas.imageResizeLocked ? " active" : ""}`}
            onClick={canvas.toggleImageResizeLock}
            aria-label={
              canvas.imageResizeLocked
                ? "Unlock image movement and resizing"
                : "Lock image movement and resizing"
            }
            title={
              canvas.imageResizeLocked
                ? "Unlock image movement and resizing"
                : "Lock image movement and resizing"
            }
            disabled={!canvas.hasImage}
          >
            {canvas.imageResizeLocked ? (
              <LockKeyhole size={15} />
            ) : (
              <UnlockKeyhole size={15} />
            )}
          </button>

          <button
            className="zoom-button"
            onClick={() => canvas.setZoom(Math.max(0.1, canvas.zoom - 0.1))}
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
            onChange={(event) => canvas.setZoom(Number(event.target.value))}
            aria-label="Canvas zoom"
          />

          <button
            className="zoom-button"
            onClick={() => canvas.setZoom(Math.min(3, canvas.zoom + 0.1))}
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
          Local document · {canvas.dimensions.width} ×{" "}
          {canvas.dimensions.height}
        </span>
        <button
          className="zoom-button fullscreen-toggle"
          type="button"
          onClick={() => setShowFullScreen((current) => !current)}
          aria-label={
            showFullScreen
              ? "Exit canvas focus mode"
              : "Enter canvas focus mode"
          }
          aria-pressed={showFullScreen}
          title={
            showFullScreen ? "Exit canvas focus mode (Esc)" : "Expand canvas"
          }
        >
          {showFullScreen ? <Minimize2 size={16} /> : <Fullscreen size={16} />}
        </button>
      </div>

      {fabricCanvas && (
        <ImageMusicVideoExport
          fabricCanvas={fabricCanvas}
          hasImage={canvas.hasImage}
          imagePreviewUrl={imagePreviewUrl}
          imageDimensions={canvas.dimensions}
          isActive={tools.active === "music"}
          onBack={() => tools.setActive("adjust")}
        />
      )}
    </section>
  );
}
