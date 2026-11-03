
import type { DragEvent, PointerEvent as ReactPointerEvent } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FabricImage } from 'fabric'
import { Copy, Eraser, Highlighter, MoveHorizontal, MoveVertical, Paintbrush, Pencil, Plus, RotateCcw, Trash2, Upload } from 'lucide-react'
import { Rotate3D } from 'lucide-react'

import { useEditor } from '../EditorContext'
import { objectName } from '../model/objectName'
import type { DrawingMode } from '../model/types'
import { getThreeDRotation, isThreeDRotatable, updateThreeDRotation } from '../operations/threeDShapes'
import type { ThreeDRotation } from '../operations/threeDShapes'
import ImageMusicVideoExport from './ImageMusicVideoExport'

const DEFAULT_PAGE_WIDTH = 1200
const DEFAULT_PAGE_HEIGHT = 800

type EditorWorkspaceProps = {
  setCanvasElement: (element: HTMLCanvasElement | null) => void
  setStageElement: (element: HTMLDivElement | null) => void
}

type DraggedPageImage = {
  imageUrl: string
  fileName?: string
  width: number
  height: number
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
    pages: {
      items: addedPages,
      setItems: setAddedPages,
      registerActions: registerPageActions,
    },
  } = useEditor()

  const [cursorPosition, setCursorPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [dropTargetPageId, setDropTargetPageId] = useState<number | null>(null)
  const [canvasSurfaceSize, setCanvasSurfaceSize] = useState({ width: 0, height: 0 })
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 })
  const nextPageIdRef = useRef(2)
  const pageUploadInputsRef = useRef(new Map<number, HTMLInputElement>())
  const pageElementsRef = useRef(new Map<number, HTMLElement>())
  const pageUploadVersionsRef = useRef(new Map<number, number>())
  const pageObjectUrlsRef = useRef(new Set<string>())
  const stageScrollRef = useRef<HTMLDivElement | null>(null)
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null)
  const pendingPageScrollRef = useRef<number | null>(null)
  const rotationDragRef = useRef<{
    pointerId: number
    x: number
    y: number
    centerX: number
    centerY: number
    lastZAngle: number
    accumulatedZDelta: number
    rotation: ThreeDRotation
    pendingRotation: ThreeDRotation
    frameId: number | null
    object: FabricImage
  } | null>(null)
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

  useEffect(() => () => {
    pageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])
  useEffect(() => {
    const pageId = pendingPageScrollRef.current
    const pageElement = pageId === null ? null : pageElementsRef.current.get(pageId)
    const stageElement = stageScrollRef.current
    if (!pageElement || !stageElement) return

    const stageBounds = stageElement.getBoundingClientRect()
    const pageBounds = pageElement.getBoundingClientRect()
    const targetScrollTop = stageElement.scrollTop + pageBounds.top - stageBounds.top - 16
    const maxScrollTop = stageElement.scrollHeight - stageElement.clientHeight
    const requiredScrollTail = Math.max(0, targetScrollTop - maxScrollTop)
    if (requiredScrollTail > 0) {
      stageElement.style.setProperty('--page-scroll-tail', `${requiredScrollTail + 2}px`)
    }
    stageElement.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth',
    })
    pendingPageScrollRef.current = null
  }, [addedPages])

  const setStageRef = useCallback((element: HTMLDivElement | null) => {
    stageScrollRef.current = element
    setStageElement(element)
  }, [setStageElement])
  useEffect(() => {
    const surface = canvasSurfaceRef.current
    if (!surface) return

    const updateCanvasSurfaceSize = () => {
      const bounds = surface.getBoundingClientRect()
      setCanvasSurfaceSize({ width: bounds.width, height: bounds.height })
    }
    const observer = new ResizeObserver(updateCanvasSurfaceSize)
    updateCanvasSurfaceSize()
    observer.observe(surface)
    return () => observer.disconnect()
  }, [canvas.dimensions.height, canvas.dimensions.width, canvas.fitScale, canvas.zoom])
  useEffect(() => {
    const stage = stageScrollRef.current
    if (!stage) return

    const updateStageSize = () => {
      setStageSize({ width: stage.clientWidth, height: stage.clientHeight })
    }
    const observer = new ResizeObserver(updateStageSize)
    updateStageSize()
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])
  const selectedThreeDObject = canvas.hasImage && canvas.selected instanceof FabricImage && isThreeDRotatable(canvas.selected)
    ? canvas.selected
    : null
  const selectedThreeDBounds = selectedThreeDObject?.getBoundingRect()

  const beginThreeDRotation = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!selectedThreeDObject) return
    const rotation = getThreeDRotation(selectedThreeDObject)
    if (!rotation) return
    const surface = event.currentTarget.closest('.canvas-surface')
    if (!surface) return
    const surfaceBounds = surface.getBoundingClientRect()
    const surfaceScale = surfaceBounds.width / canvas.dimensions.width
    const objectBounds = selectedThreeDObject.getBoundingRect()
    const centerX = surfaceBounds.left + (objectBounds.left + objectBounds.width / 2) * surfaceScale
    const centerY = surfaceBounds.top + (objectBounds.top + objectBounds.height / 2) * surfaceScale
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    rotationDragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      centerX,
      centerY,
      lastZAngle: Math.atan2(event.clientY - centerY, event.clientX - centerX),
      accumulatedZDelta: 0,
      rotation,
      pendingRotation: rotation,
      frameId: null,
      object: selectedThreeDObject,
    }
  }

  const moveThreeDRotation = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = rotationDragRef.current
    if (!drag || drag.pointerId !== event.pointerId || !fabricCanvas) return
    event.preventDefault()
    event.stopPropagation()
    const normalize = (value: number) => (value % 360 + 360) % 360
    const pointerAngle = Math.atan2(event.clientY - drag.centerY, event.clientX - drag.centerX)
    const rollStep = Math.atan2(
      Math.sin(pointerAngle - drag.lastZAngle),
      Math.cos(pointerAngle - drag.lastZAngle),
    )
    drag.lastZAngle = pointerAngle
    drag.accumulatedZDelta += rollStep * 180 / Math.PI
    drag.pendingRotation = {
      x: normalize(drag.rotation.x + (event.clientY - drag.y) * 0.7),
      y: normalize(drag.rotation.y + (event.clientX - drag.x) * 0.7),
      z: normalize(drag.rotation.z + drag.accumulatedZDelta),
    }
    if (drag.frameId !== null) return
    drag.frameId = requestAnimationFrame(() => {
      drag.frameId = null
      if (rotationDragRef.current === drag) {
        void updateThreeDRotation(fabricCanvas, drag.object, drag.pendingRotation, false)
      }
    })
  }

  const endThreeDRotation = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (rotationDragRef.current?.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const drag = rotationDragRef.current
    if (drag.frameId !== null) {
      cancelAnimationFrame(drag.frameId)
    }
    if (fabricCanvas) void updateThreeDRotation(fabricCanvas, drag.object, drag.pendingRotation)
    rotationDragRef.current = null
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    tools.setDraggingFile(true)
  }

  const handleFirstPageImageDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!fabricCanvas || !canvas.hasImage) {
      event.preventDefault()
      return
    }

    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/x-estudio-page-image', JSON.stringify({
      imageUrl: fabricCanvas.toDataURL({ format: 'png', multiplier: 1 }),
      fileName: 'Page 1 image',
      width: canvas.dimensions.width,
      height: canvas.dimensions.height,
    }))
  }

  const addPage = () => {
    const pageId = nextPageIdRef.current
    nextPageIdRef.current += 1
    pendingPageScrollRef.current = pageId
    setAddedPages((pages) => [...pages, {
      id: pageId,
      width: DEFAULT_PAGE_WIDTH,
      height: DEFAULT_PAGE_HEIGHT,
    }])
  }

  const duplicatePage = (sourcePageId?: number) => {
    const sourcePage = sourcePageId === undefined
      ? undefined
      : addedPages.find((page) => page.id === sourcePageId)
    const imageUrl = sourcePage?.imageUrl ?? (
      sourcePageId === undefined && canvas.hasImage && fabricCanvas
        ? fabricCanvas.toDataURL({ format: 'png', multiplier: 1 })
        : undefined
    )
    if (!imageUrl) return

    const pageId = nextPageIdRef.current
    nextPageIdRef.current += 1
    pendingPageScrollRef.current = pageId
    setAddedPages((pages) => [...pages, {
      id: pageId,
      imageUrl,
      fileName: `${sourcePage?.fileName ?? 'Page 1'} copy`,
      width: sourcePage?.width ?? canvas.dimensions.width,
      height: sourcePage?.height ?? canvas.dimensions.height,
    }])
  }

  const uploadPageImage = (pageId: number, file?: File) => {
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      tools.setNotice('Choose a PNG, JPG, or WebP image.')
      return
    }
    if (file.size > 30 * 1024 * 1024) {
      tools.setNotice('Images must be smaller than 30 MB.')
      return
    }

    const uploadVersion = (pageUploadVersionsRef.current.get(pageId) ?? 0) + 1
    pageUploadVersionsRef.current.set(pageId, uploadVersion)
    const previousUrl = addedPages.find((page) => page.id === pageId)?.imageUrl
    if (previousUrl) {
      const usedByAnotherPage = addedPages.some(
        (page) => page.id !== pageId && page.imageUrl === previousUrl,
      )
      if (!usedByAnotherPage) {
        URL.revokeObjectURL(previousUrl)
        pageObjectUrlsRef.current.delete(previousUrl)
      }
    }
    const imageUrl = URL.createObjectURL(file)
    pageObjectUrlsRef.current.add(imageUrl)
    const image = new Image()
    image.onload = () => {
      if (pageUploadVersionsRef.current.get(pageId) !== uploadVersion) return
      setAddedPages((pages) => pages.map((page) => page.id === pageId
        ? {
            ...page,
            imageUrl,
            fileName: file.name,
            width: image.naturalWidth,
            height: image.naturalHeight,
          }
        : page))
    }
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl)
      pageObjectUrlsRef.current.delete(imageUrl)
      if (pageUploadVersionsRef.current.get(pageId) === uploadVersion) {
        tools.setNotice('This image could not be opened. Please choose another file.')
      }
    }
    image.src = imageUrl
  }

  const handlePageDragOver = (event: DragEvent<HTMLElement>, pageId: number) => {
    if (!event.dataTransfer.types.includes('application/x-estudio-page-image')) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'copy'
    setDropTargetPageId(pageId)
  }

  const handlePageDrop = (event: DragEvent<HTMLElement>, pageId: number) => {
    event.preventDefault()
    event.stopPropagation()
    setDropTargetPageId(null)

    const data = event.dataTransfer.getData('application/x-estudio-page-image')
    if (!data) return

    try {
      const draggedImage = JSON.parse(data) as Partial<DraggedPageImage>
      if (
        typeof draggedImage.imageUrl !== 'string' ||
        typeof draggedImage.width !== 'number' ||
        typeof draggedImage.height !== 'number'
      ) return

      const targetPage = addedPages.find((page) => page.id === pageId)
      const previousUrl = targetPage?.imageUrl
      if (previousUrl && previousUrl !== draggedImage.imageUrl) {
        const sharedWithAnotherPage = addedPages.some(
          (page) => page.id !== pageId && page.imageUrl === previousUrl,
        )
        if (!sharedWithAnotherPage && pageObjectUrlsRef.current.has(previousUrl)) {
          URL.revokeObjectURL(previousUrl)
          pageObjectUrlsRef.current.delete(previousUrl)
        }
      }

      setAddedPages((pages) => pages.map((page) => page.id === pageId
        ? {
            ...page,
            imageUrl: draggedImage.imageUrl,
            fileName: draggedImage.fileName ?? 'Dropped image',
            width: draggedImage.width,
            height: draggedImage.height,
          }
        : page))
    } catch {
      tools.setNotice('Could not place that image on this page.')
    }
  }

  const deletePage = useCallback((pageId: number) => {
    const page = addedPages.find((item) => item.id === pageId)
    if (page?.imageUrl) {
      const usedByAnotherPage = addedPages.some(
        (item) => item.id !== pageId && item.imageUrl === page.imageUrl,
      )
      if (!usedByAnotherPage) {
        URL.revokeObjectURL(page.imageUrl)
        pageObjectUrlsRef.current.delete(page.imageUrl)
      }
    }
    pageUploadInputsRef.current.delete(pageId)
    pageElementsRef.current.delete(pageId)
    pageUploadVersionsRef.current.delete(pageId)
    if (addedPages.length === 1) {
      stageScrollRef.current?.style.removeProperty('--page-scroll-tail')
    }
    setAddedPages((pages) => pages.filter((item) => item.id !== pageId))
  }, [addedPages, setAddedPages])

  const getPageCanvasStyle = (page: typeof addedPages[number]) => {
    if (!stageSize.width || !stageSize.height) return undefined

    const pageWidth = page.width ?? DEFAULT_PAGE_WIDTH
    const pageHeight = page.height ?? DEFAULT_PAGE_HEIGHT

    const pageScale = Math.max(0.08, Math.min(
      (stageSize.width - 96) / pageWidth,
      (stageSize.height - 96) / pageHeight,
      1.5,
    ))

    return {
      width: pageWidth * pageScale,
      height: pageHeight * pageScale,
      aspectRatio: `${pageWidth} / ${pageHeight}`,
    }
  }
  const firstPageActionOffset = canvasSurfaceSize.height > 0
    ? canvasSurfaceSize.height / 2 + 14
    : canvas.dimensions.height * canvas.fitScale * canvas.zoom / 2 + 14

  useEffect(() => {
    registerPageActions({
      replace: (pageId) => pageUploadInputsRef.current.get(pageId)?.click(),
      delete: deletePage,
    })
    return () => registerPageActions(null)
  }, [deletePage, registerPageActions])

  return (
    <section
      className={`workspace ${editorMode.active === 'video' ? 'video-mode' : ''} ${tools.active === 'music' ? 'music-mode' : ''}`}
    >
      <div
        className="stage"
        ref={setStageRef}
        onDragOver={handleDragOver}
        onDragLeave={() => tools.setDraggingFile(false)}
        onDrop={handleDrop}
      >
        <div className="stage-page-main" aria-label="Page 1">
          <div className="canvas-holder">
          <div
            className="canvas-surface"
            ref={canvasSurfaceRef}
            draggable={canvas.hasImage && tools.active === 'upload'}
            onDragStart={handleFirstPageImageDragStart}
            data-drawing-cursor={showDrawingCursor}
            style={{
              transform: `translate(-50%, -50%) scale(${canvas.fitScale * canvas.zoom})`,
            }}
            onPointerMoveCapture={(event) => {
              if (!showDrawingCursor) return
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
            {fabricCanvas && selectedThreeDObject && selectedThreeDBounds && (
              <button
                type="button"
                className="three-d-rotate-handle"
                aria-label="Drag to rotate 3D object"
                title="Drag to rotate"
                style={{
                  left: selectedThreeDBounds.left + selectedThreeDBounds.width / 2,
                  top: selectedThreeDBounds.top + selectedThreeDBounds.height / 2,
                }}
                onPointerDown={beginThreeDRotation}
                onPointerMove={moveThreeDRotation}
                onPointerUp={endThreeDRotation}
                onPointerCancel={endThreeDRotation}
              ><Rotate3D size={18} strokeWidth={1.8} /></button>
            )}
            {showDrawingCursor && cursorPosition && CursorIcon && (
              <div
                className="drawing-cursor"
                style={{ left: cursorPosition.x, top: cursorPosition.y }}
                aria-hidden="true"
              >
                {!resizeCursor && (
                  <span
                    className="drawing-cursor-brush"
                      style={{
                        width: drawing.brushSize * (drawing.activeMode === 'highlighter' ? 3 : 1),
                        height: drawing.brushSize * (drawing.activeMode === 'highlighter' ? 3 : 1),
                      }}
                  />
                )}
                <span className={resizeCursor ? 'drawing-cursor-icon table-resize-cursor' : 'drawing-cursor-icon'}>
                  <CursorIcon size={17} strokeWidth={2.2} />
                </span>
              </div>
            )}
          </div>
          {canvas.hasImage && editorMode.active === 'image' && (
            <div
              className="page-image-tools first-page-image-tools"
              aria-label="Page 1 image actions"
              style={{
                top: `calc(50% - ${canvasSurfaceSize.height / 2}px - 40px)`,
                left: `calc(50% + ${canvasSurfaceSize.width / 2 - 108}px)`,
              }}
            >
              <button type="button" className="page-icon-button" onClick={tools.openFilePicker} aria-label="Replace image" title="Replace image">
                <RotateCcw size={15} aria-hidden="true" />
              </button>
              <button type="button" className="page-icon-button" onClick={() => duplicatePage()} aria-label="Duplicate page" title="Duplicate page">
                <Copy size={15} aria-hidden="true" />
              </button>
              <button type="button" className="page-icon-button delete-page-icon" onClick={tools.deleteImage} aria-label="Delete image" title="Delete image">
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
          )}
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

          {editorMode.active === 'image' && addedPages.length === 0 && (
            <button
              type="button"
              className="add-page-button first-page-add"
              style={{
                top: `calc(50% + ${firstPageActionOffset}px)`,
              }}
              onClick={addPage}
            >
              <Plus size={16} aria-hidden="true" />
              Add page
            </button>
          )}
        </div>

        {addedPages.map((page, index) => (
          <div
            className="added-page-group"
            key={page.id}
          >
            <section
              className={`added-page-canvas ${dropTargetPageId === page.id ? 'drop-target' : ''}`}
              aria-label={`Page ${index + 2}`}
              ref={(element) => {
                if (element) pageElementsRef.current.set(page.id, element)
                else pageElementsRef.current.delete(page.id)
              }}
              style={getPageCanvasStyle(page)}
              onDragOver={(event) => handlePageDragOver(event, page.id)}
              onDragLeave={(event) => {
                event.stopPropagation()
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDropTargetPageId(null)
                }
              }}
              onDrop={(event) => handlePageDrop(event, page.id)}
            >
              {page.imageUrl ? (
                <>
                  <img
                    className="added-page-image"
                    src={page.imageUrl}
                    alt={page.fileName ?? `Page ${index + 2}`}
                    draggable
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'copy'
                      event.dataTransfer.setData('application/x-estudio-page-image', JSON.stringify({
                        imageUrl: page.imageUrl,
                        fileName: page.fileName,
                        width: page.width,
                        height: page.height,
                      }))
                    }}
                  />
                  <div className="page-image-tools" aria-label={`Page ${index + 2} image actions`}>
                    <button type="button" className="page-icon-button" onClick={() => pageUploadInputsRef.current.get(page.id)?.click()} aria-label="Replace image" title="Replace image">
                      <RotateCcw size={15} aria-hidden="true" />
                    </button>
                    <button type="button" className="page-icon-button" onClick={() => duplicatePage(page.id)} aria-label="Duplicate page" title="Duplicate page">
                      <Copy size={15} aria-hidden="true" />
                    </button>
                    <button type="button" className="page-icon-button delete-page-icon" onClick={() => deletePage(page.id)} aria-label="Delete page" title="Delete page">
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-prompt">
                  <div className="empty-art">
                    <div className="empty-sun" />
                    <div className="empty-mountain one" />
                    <div className="empty-mountain two" />
                    <span className="empty-sparkle">✳</span>
                  </div>
                  <h1>Your next idea starts here</h1>
                  <p>Drop an image to begin, or choose one from your computer.</p>
                  <button className="primary-button" onClick={() => pageUploadInputsRef.current.get(page.id)?.click()}>
                    <Upload size={16} /> Upload an image
                  </button>
                  <span className="empty-format">PNG · JPG · WEBP</span>
                </div>
              )}
              <input
                ref={(element) => {
                  if (element) pageUploadInputsRef.current.set(page.id, element)
                  else pageUploadInputsRef.current.delete(page.id)
                }}
                className="page-upload-input"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  uploadPageImage(page.id, event.currentTarget.files?.[0])
                  event.currentTarget.value = ''
                }}
              />
            </section>
            <div className="added-page-actions">
              {!page.imageUrl && (
                <button type="button" className="page-action-button delete-page-button" onClick={() => deletePage(page.id)}>
                  <Trash2 size={14} aria-hidden="true" />
                  Delete page
                </button>
              )}
              {index === addedPages.length - 1 && (
                <button type="button" className="add-page-button" onClick={addPage}>
                  <Plus size={16} aria-hidden="true" />
                  Add page
                </button>
              )}
            </div>
          </div>
        ))}
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
