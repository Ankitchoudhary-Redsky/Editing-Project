
import type { DragEvent, PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FabricImage } from 'fabric'
import { Copy, CopyPlus, Eraser, Fullscreen, Highlighter, Link2, LockKeyhole, MessageSquarePlus, Minimize2, MoreHorizontal, MoveHorizontal, MoveVertical, Paintbrush, Pencil, Plus, Rotate3D, RotateCcw, Trash2, UnlockKeyhole, Upload } from 'lucide-react'

import { useEditor } from '../EditorContext'
import { BACKGROUND_IMAGE_NAME, BASE_IMAGE_PROPERTY, DRAWING_LAYER_NAME } from '../model/constants'
import { CanvasContextMenu } from './CanvasContextMenu'
import { EditorEmptyState } from './EditorEmptyState'
import { objectName } from '../model/objectName'
import type { DrawingMode, CanvasSurfaceProps } from '../model/types'
import type { EditorWorkspaceProps } from '../model/types'
import { EditableThreeDEmoji } from '../operations/EditableThreeDEmoji'
import { getThreeDRotation, isThreeDRotatable, updateThreeDRotation } from '../operations/threeDShapes'
import type { ThreeDRotation } from '../operations/threeDShapes'
import ImageMusicVideoExport from './ImageMusicVideoExport'

const PAGE_ALREADY_HAS_IMAGE_NOTICE = 'This page already has an image. Remove it before adding another.'

type WorkspaceCanvasSurfaceProps = CanvasSurfaceProps & {
  surfaceRef?: Ref<HTMLDivElement>
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void
  onDrop?: (event: DragEvent<HTMLDivElement>) => void
  children?: ReactNode
}

function CanvasSurface({
  scale,
  setCanvasElement,
  showDrawingCursor,
  brushSize,
  cursorIcon: CursorIcon,
  isResizeCursor,
  surfaceRef,
  onDragOver,
  onDrop,
  children,
}: WorkspaceCanvasSurfaceProps) {
  const cursorElementRef = useRef<HTMLDivElement | null>(null)
  const cursorPositionRef = useRef<{ x: number; y: number } | null>(null)

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
      ref={surfaceRef}
      data-drawing-cursor={showDrawingCursor}
      style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      onDragOver={onDragOver}
      onDrop={onDrop}
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
      {children}
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

function FloatingObjectToolbar({
  stageRef,
}: {
  stageRef: React.RefObject<HTMLDivElement | null>
}) {
  const { canvas, fabricCanvas, shapes } = useEditor()
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const [selectedLink, setSelectedLink] = useState("")
  const selectedLockState = canvas.selected?.get("objectLocked")
  const isLocked = selectedLockState === undefined
    ? Boolean(
        canvas.selected?.lockMovementX &&
        canvas.selected.lockMovementY &&
        canvas.selected.lockScalingX &&
        canvas.selected.lockScalingY,
      )
    : Boolean(selectedLockState)

  useEffect(() => {
    const active = canvas.selected
    const stage = stageRef.current
    const fabricElement = fabricCanvas?.getElement()
    if (!active || !stage || !fabricCanvas || !fabricElement || active.get('name') === 'Crop area') {
      setPosition(null)
      return
    }

    const trigger = document.querySelector('[data-menu-trigger="object-menu"]') as HTMLElement | null
    if (trigger) {
      trigger.style.display = 'none'
    }

    const updatePosition = () => {
      const activeBounds = active.getBoundingRect()
      const stageBounds = stage.getBoundingClientRect()
      const canvasBounds = fabricElement.getBoundingClientRect()
      const canvasOffsetX = canvasBounds.left - stageBounds.left
      const canvasOffsetY = canvasBounds.top - stageBounds.top
      const scaleX = canvasBounds.width / fabricCanvas.getWidth()
      const scaleY = canvasBounds.height / fabricCanvas.getHeight()
      const right = canvasOffsetX + (activeBounds.left + activeBounds.width) * scaleX
      const top = canvasOffsetY + activeBounds.top * scaleY - 10
      const toolbarWidth = 260
      const toolbarHeight = 48

      setPosition({
        left: Math.max(toolbarWidth + 8, Math.min(stageBounds.width - 8, right)),
        top: Math.max(toolbarHeight + 8, Math.min(stageBounds.height - 8, top)),
      })
    }

    updatePosition()
    fabricCanvas.on('after:render', updatePosition)
    window.addEventListener('resize', updatePosition)
    return () => {
      fabricCanvas.off('after:render', updatePosition)
      window.removeEventListener('resize', updatePosition)
    }
  }, [canvas.selected, fabricCanvas, selectedLink, stageRef])

  useEffect(() => {
    const syncLink = () => {
      setSelectedLink((canvas.selected?.get("link") as string | undefined) ?? "")
    }
    syncLink()
    fabricCanvas?.on("object:modified", syncLink)
    fabricCanvas?.on("selection:created", syncLink)
    fabricCanvas?.on("selection:updated", syncLink)
    return () => {
      fabricCanvas?.off("object:modified", syncLink)
      fabricCanvas?.off("selection:created", syncLink)
      fabricCanvas?.off("selection:updated", syncLink)
    }
  }, [canvas.selected, fabricCanvas])

  useEffect(() => {
    const trigger = document.querySelector('[data-menu-trigger="object-menu"]') as HTMLElement | null
    if (!trigger) return
    trigger.style.display = position ? 'none' : ''
  }, [position])

  if (!position) return null

  const toggleLock = () => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected
    if (!target || !fabricCanvas) return

    const lockState = target.get("objectLocked")
    const locked = lockState === undefined
      ? Boolean(target.lockMovementX && target.lockMovementY && target.lockScalingX && target.lockScalingY)
      : Boolean(lockState)
    target.set({
      objectLocked: !locked,
      lockMovementX: !locked,
      lockMovementY: !locked,
      lockScalingX: !locked,
      lockScalingY: !locked,
      lockRotation: !locked,
      selectable: true,
      evented: true,
    })
    target.setCoords()
    fabricCanvas.requestRenderAll()
    fabricCanvas.fire("object:modified", { target })
  }

  const openSelectedLink = () => {
    try {
      const url = new URL(selectedLink)
      if (url.protocol === "http:" || url.protocol === "https:") {
        window.open(url.href, "_blank", "noopener,noreferrer")
      }
    } catch {
      return
    }
  }

  return (
    <div
      className="floating-object-toolbar"
      style={{ left: position.left, top: position.top }}
      onPointerDown={(event) => event.stopPropagation()}
      role="toolbar"
      aria-label="Selected object actions"
    >
      {selectedLink && (
        <button
          type="button"
          title="Open linked website"
          aria-label="Open linked website"
          onClick={openSelectedLink}
        >
          <Link2 size={18} strokeWidth={2.2} />
        </button>
      )}
      <button
        type="button"
        title="Add or view comment"
        aria-label="Add or view comment"
        data-comment-trigger="object-comments"
        onClick={() => window.dispatchEvent(new Event("editor:toggle-object-comment"))}
      >
        <MessageSquarePlus size={18} strokeWidth={2.2} />
      </button>
      <button
        type="button"
        className={isLocked ? "floating-lock-button active" : "floating-lock-button"}
        title={isLocked ? "Unlock selected object" : "Lock selected object"}
        aria-label={isLocked ? "Unlock selected object" : "Lock selected object"}
        onClick={toggleLock}
      >
        {isLocked ? <LockKeyhole size={18} /> : <UnlockKeyhole size={18} />}
      </button>
      {!isLocked && (
        <>
          <button title="Duplicate" aria-label="Duplicate selected object" type="button" onClick={() => void shapes.duplicate()}>
            <CopyPlus size={18} strokeWidth={2.2} />
          </button>
          <button type="button" className="floating-delete-button" title="Delete" aria-label="Delete selected object" onClick={shapes.delete}>
            <Trash2 size={19} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="floating-context-button"
            title="More actions"
            aria-label="Open selected object actions"
            onClick={() => {
              const trigger = document.querySelector('[data-menu-trigger="object-menu"]') as HTMLButtonElement | null
              trigger?.click()
            }}
          >
            <MoreHorizontal size={18} strokeWidth={2.2} />
          </button>
        </>
      )}
    </div>
  )
}

type DraggedPageImage = {
  imageUrl: string
  fileName?: string
  width: number
  height: number
}

export function EditorWorkspace({
  historyVersion,
  setCanvasElement,
  setStageElement,
}: EditorWorkspaceProps & { historyVersion: number }) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasHolderRef = useRef<HTMLDivElement | null>(null)
  const {
    canvas,
    fabricCanvas,
    tools,
    editorMode,
    videoClip,
    drawing,
    draggingFile,
    table,
    handleDrop: handleEditorDrop,
    pages: {
      items: addedPages,
      setItems: setAddedPages,
      activeId: activePageId,
      switching: pagesSwitching,
      pageOnePreview,
      select: activatePage,
      getSnapshot: getPageSnapshot,
      saveActivePage,
      registerActions: registerPageActions,
    },
  } = useEditor()
  const [dropTargetPageId, setDropTargetPageId] = useState<number | null>(null)
  const [showFullScreen, setShowFullScreen] = useState(false)
  const nextPageIdRef = useRef(2)
  const pageUploadInputsRef = useRef(new Map<number, HTMLInputElement>())
  const thumbnailElementsRef = useRef(new Map<number | null, HTMLElement>())
  const pageUploadVersionsRef = useRef(new Map<number, number>())
  const pageObjectUrlsRef = useRef(new Set<string>())
  const stageScrollRef = useRef<HTMLDivElement | null>(null)
  const thumbnailStripRef = useRef<HTMLDivElement | null>(null)
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null)
  const pendingPageScrollRef = useRef<number | null>(null)
  const pendingPageSelectRef = useRef<number | null>(null)
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
    object: FabricImage | EditableThreeDEmoji
  } | null>(null)

  const scrollToPage = useCallback((pageId: number | null) => {
    const pageElement = thumbnailElementsRef.current.get(pageId)
    const stripElement = thumbnailStripRef.current
    if (!pageElement || !stripElement) return

    const stripBounds = stripElement.getBoundingClientRect()
    const pageBounds = pageElement.getBoundingClientRect()
    const pageLeft = stripElement.scrollLeft + pageBounds.left - stripBounds.left
    const pageRight = pageLeft + pageBounds.width
    const targetScrollLeft = pageLeft < stripElement.scrollLeft
      ? pageLeft - 12
      : pageRight > stripElement.scrollLeft + stripElement.clientWidth
        ? pageRight - stripElement.clientWidth + 12
        : stripElement.scrollLeft
    stripElement.scrollTo({ left: Math.max(0, targetScrollLeft), behavior: 'smooth' })
  }, [])

  useEffect(() => () => {
    pageObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
  }, [])

  useEffect(() => {
    nextPageIdRef.current = Math.max(
      nextPageIdRef.current,
      ...addedPages.map((page) => page.id + 1),
    )
    const scrollPageId = pendingPageScrollRef.current
    if (scrollPageId !== null) {
      scrollToPage(scrollPageId)
      pendingPageScrollRef.current = null
    }
    const selectPageId = pendingPageSelectRef.current
    if (selectPageId !== null && addedPages.some((page) => page.id === selectPageId)) {
      pendingPageSelectRef.current = null
      void activatePage(selectPageId)
    }
  }, [addedPages, activatePage, scrollToPage])

  useEffect(() => {
    if (editorMode.active === 'image' && !pagesSwitching) saveActivePage()
  }, [editorMode.active, historyVersion, pagesSwitching, saveActivePage])

  useEffect(() => {
    scrollToPage(activePageId)
  }, [activePageId, scrollToPage])

  useEffect(() => {
    if (activePageId === null) return
    const activePage = addedPages.find((page) => page.id === activePageId)
    if (!activePage || (
      activePage.width === canvas.dimensions.width && activePage.height === canvas.dimensions.height
    )) return

    setAddedPages((pages) => pages.map((page) => ({
      ...page,
      ...(page.id === activePageId
        ? { width: canvas.dimensions.width, height: canvas.dimensions.height }
        : {}),
    })))
  }, [activePageId, addedPages, canvas.dimensions.height, canvas.dimensions.width, setAddedPages])

  const setStageRef = useCallback((element: HTMLDivElement | null) => {
    stageScrollRef.current = element
    stageRef.current = element
    setStageElement(element)
  }, [setStageElement])

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
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')

  useEffect(() => {
    if (!canvas.hasImage || !fabricCanvas || tools.active !== "music") return;

    const frame = window.requestAnimationFrame(() => {
      setImagePreviewUrl(
        fabricCanvas.toDataURL({ format: "png", multiplier: 1 }),
      );
    });
    return () => window.cancelAnimationFrame(frame);
  }, [canvas.hasImage, fabricCanvas, historyVersion, tools.active]);

  const selectedThreeDImage = canvas.selected instanceof FabricImage && isThreeDRotatable(canvas.selected)
    ? canvas.selected
    : null
  const selectedThreeDModel = canvas.selected instanceof EditableThreeDEmoji ? canvas.selected : null
  const selectedThreeDObject = selectedThreeDImage ?? selectedThreeDModel
  const selectedThreeDBounds = selectedThreeDObject?.getBoundingRect()

  const beginThreeDRotation = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!selectedThreeDObject) return
    const rotation = selectedThreeDObject instanceof FabricImage
      ? getThreeDRotation(selectedThreeDObject)
      : {
          x: selectedThreeDObject.emojiRotationX,
          y: selectedThreeDObject.emojiRotationY,
          z: selectedThreeDObject.emojiRotationZ,
        }
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
        if (drag.object instanceof FabricImage) {
          void updateThreeDRotation(fabricCanvas, drag.object, drag.pendingRotation, false)
        } else {
          drag.object.setRotation(drag.pendingRotation)
        }
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
    if (fabricCanvas) {
      if (drag.object instanceof FabricImage) {
        void updateThreeDRotation(fabricCanvas, drag.object, drag.pendingRotation)
      } else {
        drag.object.setRotation(drag.pendingRotation)
        fabricCanvas.fire('object:modified', { target: drag.object })
      }
    }
    rotationDragRef.current = null
  }

  const autoScrollStage = (event: DragEvent<HTMLElement>) => {
    if (!event.dataTransfer.types.includes('application/x-estudio-page-image')) return
    const stage = stageScrollRef.current
    if (!stage) return

    const bounds = stage.getBoundingClientRect()
    const edgeSize = Math.min(96, bounds.height * 0.18)
    const distanceFromTop = event.clientY - bounds.top
    const distanceFromBottom = bounds.bottom - event.clientY
    const scrollDelta = distanceFromTop < edgeSize
      ? -Math.ceil((edgeSize - distanceFromTop) / edgeSize * 24)
      : distanceFromBottom < edgeSize
        ? Math.ceil((edgeSize - distanceFromBottom) / edgeSize * 24)
        : 0
    const maxScrollTop = stage.scrollHeight - stage.clientHeight
    stage.scrollTop = Math.max(0, Math.min(maxScrollTop, stage.scrollTop + scrollDelta))
  }
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (event.dataTransfer.types.includes('application/x-estudio-page-image')) {
      autoScrollStage(event)
      return
    }
    if (event.dataTransfer.types.includes('Files')) tools.setDraggingFile(true)
  }

  const handlePageImageDragStart = (event: DragEvent<HTMLDivElement>, pageId: number | null) => {
    if (!fabricCanvas || !event.dataTransfer) {
      event.preventDefault()
      return
    }

    const page = pageId === null ? undefined : addedPages.find((item) => item.id === pageId)
    const isActivePage = activePageId === pageId
    const imageUrl = isActivePage
      ? fabricCanvas.toDataURL({ format: 'png', multiplier: 1 })
      : pageId === null ? pageOnePreview : page?.preview || page?.imageUrl
    if (!imageUrl) {
      event.preventDefault()
      return
    }

    const snapshot = getPageSnapshot(pageId)
    const snapshotData = snapshot ? JSON.parse(snapshot) as { width?: number; height?: number } : null
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/x-estudio-page-image', JSON.stringify({
      imageUrl,
      fileName: page?.fileName ?? `Page ${pageId === null ? 1 : addedPages.findIndex((item) => item.id === pageId) + 2}`,
      width: snapshotData?.width ?? page?.width ?? canvas.dimensions.width,
      height: snapshotData?.height ?? page?.height ?? canvas.dimensions.height,
    } satisfies DraggedPageImage))
  }

  const pageHasImage = (pageId: number | null) => {
    if (pageId === activePageId) return canvas.hasImage
    const page = pageId === null ? undefined : addedPages.find((item) => item.id === pageId)
    if (page?.imageUrl) return true
    const snapshot = getPageSnapshot(pageId)
    if (!snapshot) return false
    try {
      const parsed = JSON.parse(snapshot) as { scene?: { objects?: Array<Record<string, unknown> & { type?: string; name?: string }> } }
      return Boolean(parsed.scene?.objects?.some((object) =>
        object.type?.toLowerCase() === 'image' &&
        (object[BASE_IMAGE_PROPERTY] === true || (
          !object.stickerAnimationId && !object.threeDType && !object.emojiId &&
          typeof object.src === 'string'
        )) &&
        object.name !== BACKGROUND_IMAGE_NAME &&
        object.name !== DRAWING_LAYER_NAME,
      ))
    } catch {
      return false
    }
  }

  const addPage = () => {
    const pageId = nextPageIdRef.current
    nextPageIdRef.current += 1
    pendingPageScrollRef.current = pageId
    pendingPageSelectRef.current = pageId
    setAddedPages((pages) => [...pages, {
      id: pageId,
      width: canvas.dimensions.width,
      height: canvas.dimensions.height,
    }])
  }

  const duplicatePage = (sourcePageId?: number) => {
    if (activePageId === (sourcePageId ?? null)) saveActivePage()
    const sourcePage = sourcePageId === undefined
      ? undefined
      : addedPages.find((page) => page.id === sourcePageId)
    const pageSnapshot = getPageSnapshot(sourcePageId ?? null)
    const imageUrl = sourcePage?.imageUrl ?? (
      sourcePageId === undefined && canvas.hasImage && fabricCanvas
        ? fabricCanvas.toDataURL({ format: 'png', multiplier: 1 })
        : undefined
    )
    if (!imageUrl && !pageSnapshot) return

    const pageId = nextPageIdRef.current
    nextPageIdRef.current += 1
    const copiedSnapshot = pageSnapshot
      ? JSON.stringify({ ...JSON.parse(pageSnapshot), pageId })
      : undefined
    pendingPageScrollRef.current = pageId
    pendingPageSelectRef.current = pageId
    setAddedPages((pages) => {
      const sourceIndex = sourcePageId === undefined
        ? -1
        : pages.findIndex((page) => page.id === sourcePageId)
      const insertIndex = sourceIndex < 0 ? 0 : sourceIndex + 1
      const duplicate = {
        id: pageId,
        imageUrl,
        snapshot: copiedSnapshot,
        fileName: `${sourcePage?.fileName ?? 'Page 1'} copy`,
        width: canvas.dimensions.width,
        height: canvas.dimensions.height,
      }
      return [...pages.slice(0, insertIndex), duplicate, ...pages.slice(insertIndex)]
    })
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
    const reader = new FileReader()
    reader.onload = () => {
      if (pageUploadVersionsRef.current.get(pageId) !== uploadVersion) return
      if (typeof reader.result !== 'string') {
        tools.setNotice('This image could not be opened. Please choose another file.')
        return
      }

      const imageUrl = reader.result
      const image = new Image()
      image.onload = () => {
        if (pageUploadVersionsRef.current.get(pageId) !== uploadVersion) return
        setAddedPages((pages) => pages.map((page) => page.id === pageId
          ? {
              ...page,
              imageUrl,
              fileName: file.name,
              width: page.width ?? canvas.dimensions.width,
              height: page.height ?? canvas.dimensions.height,
            }
          : page))
        void (async () => {
          try {
            await activatePage(pageId)
            await tools.uploadFile(file)
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

            if (fabricCanvas) {
              fabricCanvas.requestRenderAll()
              const preview = fabricCanvas.toDataURL({ format: 'png', multiplier: 0.2 })
              setAddedPages((pages) => pages.map((page) =>
                page.id === pageId ? { ...page, preview } : page,
              ))
            }
          } catch (error) {
            console.error('Page image upload failed:', error)
            tools.setNotice('Could not upload the image to this page.')
          }
        })()
      }
      image.onerror = () => {
        if (pageUploadVersionsRef.current.get(pageId) === uploadVersion) {
          tools.setNotice('This image could not be opened. Please choose another file.')
        }
      }
      image.src = imageUrl
    }
    reader.onerror = () => {
      if (pageUploadVersionsRef.current.get(pageId) === uploadVersion) {
        tools.setNotice('This image could not be opened. Please choose another file.')
      }
    }
    reader.readAsDataURL(file)
  }

  const handlePageDragOver = (event: DragEvent<HTMLElement>, pageId: number) => {
    const isPageImage = event.dataTransfer.types.includes('application/x-estudio-page-image')
    const isFile = event.dataTransfer.types.includes('Files')
    if (!isPageImage && !isFile) return
    event.preventDefault()
    event.stopPropagation()
    if (isPageImage) autoScrollStage(event)
    event.dataTransfer.dropEffect = 'copy'
    setDropTargetPageId(pageId)
  }

  const handleFirstPageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('application/x-estudio-page-image')) return
    event.preventDefault()
    event.stopPropagation()
    autoScrollStage(event)
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleFirstPageDrop = async (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('application/x-estudio-page-image')) return
    event.preventDefault()
    event.stopPropagation()
    if (pageHasImage(null)) {
      tools.setNotice(PAGE_ALREADY_HAS_IMAGE_NOTICE)
      return
    }

    try {
      const draggedImage = JSON.parse(
        event.dataTransfer.getData('application/x-estudio-page-image'),
      ) as Partial<DraggedPageImage>
      if (
        typeof draggedImage.imageUrl !== 'string' ||
        typeof draggedImage.width !== 'number' ||
        typeof draggedImage.height !== 'number' ||
        (!draggedImage.imageUrl.startsWith('data:image/') && !draggedImage.imageUrl.startsWith('blob:'))
      ) throw new Error('Invalid image data.')

      const response = await fetch(draggedImage.imageUrl)
      const imageBlob = await response.blob()
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(imageBlob.type)) {
        throw new Error('Unsupported image type.')
      }

      const file = new File([imageBlob], draggedImage.fileName ?? 'Page image', { type: imageBlob.type })
      await activatePage(null)
      await tools.uploadFile(file)
    } catch {
      tools.setNotice('Could not place that image on Page 1.')
    }
  }

  const handlePageDrop = async (event: DragEvent<HTMLElement>, pageId: number) => {
    event.preventDefault()
    event.stopPropagation()
    setDropTargetPageId(null)
    const targetPage = addedPages.find((page) => page.id === pageId)
    if (targetPage?.imageUrl || pageHasImage(pageId)) {
      tools.setNotice(PAGE_ALREADY_HAS_IMAGE_NOTICE)
      return
    }

    const data = event.dataTransfer.getData('application/x-estudio-page-image')
    if (!data) {
      const file = event.dataTransfer.files[0]
      if (file) uploadPageImage(pageId, file)
      return
    }

    try {
      const draggedImage = JSON.parse(data) as Partial<DraggedPageImage>
      if (
        typeof draggedImage.imageUrl !== 'string' ||
        typeof draggedImage.width !== 'number' ||
        typeof draggedImage.height !== 'number'
      ) return

      setAddedPages((pages) => pages.map((page) => page.id === pageId
        ? {
            ...page,
            imageUrl: draggedImage.imageUrl,
            fileName: draggedImage.fileName ?? 'Dropped image',
            width: targetPage?.width ?? canvas.dimensions.width,
            height: targetPage?.height ?? canvas.dimensions.height,
          }
        : page))
      await activatePage(pageId)
      const response = await fetch(draggedImage.imageUrl)
      const imageBlob = await response.blob()
      await tools.uploadFile(new File(
        [imageBlob],
        draggedImage.fileName ?? 'Dropped image',
        { type: imageBlob.type || 'image/png' },
      ))
    } catch {
      tools.setNotice('Could not place that image on this page.')
    }
  }

  const handleWorkspaceDrop = (event: DragEvent<HTMLDivElement>) => {
    const target = event.target
    const isPageImage = event.dataTransfer.types.includes('application/x-estudio-page-image')
    const isFile = event.dataTransfer.types.includes('Files')
    if (
      editorMode.active === 'image' &&
      canvas.hasImage &&
      (isPageImage || isFile) &&
      target instanceof Element &&
      target.closest('.canvas-holder')
    ) {
      event.preventDefault()
      event.stopPropagation()
      tools.setDraggingFile(false)
      tools.setNotice(PAGE_ALREADY_HAS_IMAGE_NOTICE)
      return
    }

    handleEditorDrop(event)
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
    thumbnailElementsRef.current.delete(pageId)
    pageUploadVersionsRef.current.delete(pageId)
    if (activePageId === pageId) {
      const nextPageId = addedPages.find((item) => item.id !== pageId)?.id ?? null
      void activatePage(nextPageId)
    }
    setAddedPages((pages) => pages.filter((item) => item.id !== pageId))
  }, [activePageId, addedPages, activatePage, setAddedPages])

  useEffect(() => {
    registerPageActions({
      replace: (pageId) => pageUploadInputsRef.current.get(pageId)?.click(),
      delete: deletePage,
    })
    return () => registerPageActions(null)
  }, [deletePage, registerPageActions])

  useEffect(() => {
    if (!showFullScreen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowFullScreen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showFullScreen])

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    handleWorkspaceDrop(event)
  }

  return (
    <section
      className={`workspace ${editorMode.active === "video" ? "video-mode" : ""} ${tools.active === "music" ? " music-mode" : ""}${showFullScreen ? " focus-mode" : ""}`}
    >
      <div
        className="stage"
        ref={setStageRef}
        onDragOver={handleDragOver}
        onDragLeave={() => tools.setDraggingFile(false)}
        onDrop={handleDrop}
      >
        <div className="canvas-holder" ref={canvasHolderRef}>
          <CanvasSurface
            scale={canvas.fitScale * canvas.zoom}
            setCanvasElement={setCanvasElement}
            showDrawingCursor={showDrawingCursor}
            brushSize={drawing.brushSize * (drawing.activeMode === 'highlighter' ? 3 : 1)}
            cursorIcon={CursorIcon}
            isResizeCursor={Boolean(resizeCursor)}
            surfaceRef={canvasSurfaceRef}
            onDragOver={handleFirstPageDragOver}
            onDrop={(event) => activePageId === null
              ? void handleFirstPageDrop(event)
              : void handlePageDrop(event, activePageId)}
          >
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
              >
                <Rotate3D size={18} strokeWidth={1.8} />
              </button>
            )}
          </CanvasSurface>
          {!canvas.hasDocument && <EditorEmptyState onUpload={tools.openFilePicker} />}
          <CanvasContextMenu holderRef={canvasHolderRef} />
        </div>

        <FloatingObjectToolbar stageRef={stageRef} />

        {editorMode.active === 'video' && tools.active !== 'music' && (
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

      {editorMode.active === 'image' && (
        <div className="workspace-pages">
          <div className="page-thumbnails" ref={thumbnailStripRef} aria-label="Pages">
            <div
              className={`page-thumbnail${activePageId === null ? ' selected' : ''}`}
              draggable={activePageId === null && canvas.hasImage}
              ref={(element) => {
                if (element) thumbnailElementsRef.current.set(null, element)
                else thumbnailElementsRef.current.delete(null)
              }}
              onDragStart={(event) => handlePageImageDragStart(event, null)}
              onDragOver={handleFirstPageDragOver}
              onDrop={(event) => void handleFirstPageDrop(event)}
            >
              <button
                type="button"
                className="page-thumbnail-select"
                aria-label="Select Page 1"
                aria-current={activePageId === null ? 'page' : undefined}
                onClick={() => void activatePage(null)}
              >
                <span className="page-thumbnail-preview">
                  {(pageOnePreview || (activePageId === null ? canvas.imageThumbnail : ''))
                    ? <img src={pageOnePreview || canvas.imageThumbnail} alt="Page 1 preview" draggable={false} />
                    : <span className="page-thumbnail-empty">Empty page</span>}
                </span>
                <span className="page-thumbnail-label">1</span>
              </button>
              <div className="page-thumbnail-actions">
                <button
                  type="button"
                  className="page-thumbnail-action"
                  aria-label="Upload or replace image on Page 1"
                  title="Upload or replace image"
                  onClick={() => void activatePage(null).then(() => tools.openFilePicker())}
                >
                  {pageOnePreview ? <RotateCcw size={14} /> : <Upload size={14} />}
                </button>
                <button
                  type="button"
                  className="page-thumbnail-action"
                  aria-label="Duplicate Page 1"
                  title="Duplicate page"
                  onClick={() => duplicatePage()}
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>

            {addedPages.map((page, index) => (
              <div
                key={page.id}
                className={`page-thumbnail${activePageId === page.id ? ' selected' : ''}${dropTargetPageId === page.id ? ' drop-target' : ''}`}
                draggable={activePageId === page.id ? canvas.hasImage : Boolean(page.imageUrl)}
                ref={(element) => {
                  if (element) thumbnailElementsRef.current.set(page.id, element)
                  else thumbnailElementsRef.current.delete(page.id)
                }}
                onDragStart={(event) => handlePageImageDragStart(event, page.id)}
                onDragOver={(event) => handlePageDragOver(event, page.id)}
                onDragLeave={(event) => {
                  event.stopPropagation()
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setDropTargetPageId(null)
                  }
                }}
                onDrop={(event) => void handlePageDrop(event, page.id)}
              >
                <button
                  type="button"
                  className="page-thumbnail-select"
                  aria-label={`Select Page ${index + 2}`}
                  aria-current={activePageId === page.id ? 'page' : undefined}
                  onClick={() => void activatePage(page.id)}
                >
                  <span className="page-thumbnail-preview">
                    {page.preview || page.imageUrl
                      ? <img src={page.preview || page.imageUrl} alt={`Page ${index + 2} preview`} draggable={false} />
                      : <span className="page-thumbnail-empty">Empty page</span>}
                  </span>
                  <span className="page-thumbnail-label">{index + 2}</span>
                </button>
                <div className="page-thumbnail-actions">
                  <button
                    type="button"
                    className="page-thumbnail-action"
                    aria-label={`${page.imageUrl ? 'Replace' : 'Upload'} image on Page ${index + 2}`}
                    title={page.imageUrl ? 'Replace image' : 'Upload image'}
                    onClick={() => pageUploadInputsRef.current.get(page.id)?.click()}
                  >
                    {page.imageUrl ? <RotateCcw size={14} /> : <Upload size={14} />}
                  </button>
                  <button
                    type="button"
                    className="page-thumbnail-action"
                    aria-label={`Duplicate Page ${index + 2}`}
                    title="Duplicate page"
                    onClick={() => duplicatePage(page.id)}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    type="button"
                    className="page-thumbnail-action delete-thumbnail-action"
                    aria-label={`Delete Page ${index + 2}`}
                    title="Delete page"
                    onClick={() => deletePage(page.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
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
              </div>
            ))}

            <button type="button" className="page-thumbnail-add" onClick={addPage} aria-label="Add page" title="Add page">
              <Plus size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

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
