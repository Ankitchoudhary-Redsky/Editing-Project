
import type { DragEvent, PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FabricImage } from 'fabric'
import { Copy, Eraser, GripVertical, Highlighter, MoveHorizontal, MoveVertical, Paintbrush, Pencil, Plus, Rotate3D, RotateCcw, Trash2, Upload } from 'lucide-react'

import { useEditor } from '../EditorContext'
import { CanvasContextMenu } from './CanvasContextMenu'
import { BACKGROUND_IMAGE_NAME, BASE_IMAGE_PROPERTY, isDrawingLayerName } from '../model/constants'
import { objectName } from '../model/objectName'
import type { DrawingMode, CanvasSurfaceProps } from '../model/types'
import type { EditorWorkspaceProps } from '../model/types'
import { EditableThreeDEmoji } from '../operations/EditableThreeDEmoji'
import { EditableThreeDShape } from '../operations/EditableThreeDShape'
import { addEditableThreeDShape, addThreeDCharacter, addThreeDEmoji as addGeneratedThreeDEmoji, getThreeDRotation, isThreeDRotatable, threeDEmojiChoices, threeDShapeChoices, updateThreeDRotation } from '../operations/threeDShapes'
import { addThreeDEmoji as addModelThreeDEmoji } from '../operations/threeDEmojis'
import { threeDEmojiAssets } from '../operations/threeDEmojiAssets'
import type { ThreeDRotation } from '../operations/threeDShapes'
import ImageMusicVideoExport from './ImageMusicVideoExport'
import { UploadLanding } from './UploadLanding'

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
  restoring,
  setCanvasElement,
  setStageElement,
}: EditorWorkspaceProps & { historyVersion: number; restoring: boolean }) {
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
  } = useEditor();

  const viewportRef = useRef<HTMLDivElement>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [dropTargetPageId, setDropTargetPageId] = useState<number | null>(null)
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
    object: FabricImage | EditableThreeDEmoji | EditableThreeDShape
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

  const selectedThreeDImage = canvas.hasImage && canvas.selected instanceof FabricImage && isThreeDRotatable(canvas.selected)
    ? canvas.selected
    : null
  const selectedThreeDModel = canvas.selected instanceof EditableThreeDEmoji ? canvas.selected : null
  const selectedThreeDShape = canvas.selected instanceof EditableThreeDShape ? canvas.selected : null
  const selectedThreeDObject = selectedThreeDImage ?? selectedThreeDModel ?? selectedThreeDShape
  const [selectedThreeDBounds, setSelectedThreeDBounds] = useState<{
    target: object
    left: number
    top: number
    width: number
    height: number
  } | null>(null)
  const selectedThreeDHandleBounds = selectedThreeDObject
    ? selectedThreeDBounds?.target === selectedThreeDObject
      ? selectedThreeDBounds
      : selectedThreeDObject.getBoundingRect()
    : null

  useEffect(() => {
    if (!selectedThreeDObject || !fabricCanvas) return

    const updateBounds = (event?: { target?: unknown }) => {
      if (event?.target && event.target !== selectedThreeDObject) return
      const bounds = selectedThreeDObject.getBoundingRect()
      setSelectedThreeDBounds({
        target: selectedThreeDObject,
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
      })
    }

    updateBounds()
    fabricCanvas.on('object:moving', updateBounds)
    fabricCanvas.on('object:scaling', updateBounds)
    fabricCanvas.on('object:rotating', updateBounds)
    fabricCanvas.on('object:modified', updateBounds)

    return () => {
      fabricCanvas.off('object:moving', updateBounds)
      fabricCanvas.off('object:scaling', updateBounds)
      fabricCanvas.off('object:rotating', updateBounds)
      fabricCanvas.off('object:modified', updateBounds)
    }
  }, [fabricCanvas, selectedThreeDObject])

  const beginThreeDRotation = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!selectedThreeDObject) return
    const rotation = selectedThreeDObject instanceof FabricImage
      ? getThreeDRotation(selectedThreeDObject)
      : selectedThreeDObject instanceof EditableThreeDEmoji
        ? {
          x: selectedThreeDObject.emojiRotationX,
          y: selectedThreeDObject.emojiRotationY,
          z: selectedThreeDObject.emojiRotationZ,
        }
        : {
            x: selectedThreeDObject.threeDRotationX,
            y: selectedThreeDObject.threeDRotationY,
            z: selectedThreeDObject.threeDRotationZ,
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
    if (event.dataTransfer.types.includes('application/x-estudio-3d-element')) {
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'copy'
      return
    }
    event.preventDefault();
    if (event.dataTransfer.types.includes('application/x-estudio-page-image')) {
      autoScrollStage(event)
      return
    }
    if (event.dataTransfer.types.includes('Files')) tools.setDraggingFile(true);
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
      const nextZoom = Math.min(3, Math.max(0.1, canvas.zoom * zoomFactor));

      canvas.setZoom(nextZoom);
    };

    viewport.addEventListener("wheel", handleWheel, {
      passive: false,
    });

    return () => {
      viewport.removeEventListener("wheel", handleWheel);
    };
  }, [canvas]);

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
        !isDrawingLayerName(object.name),
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
    if (event.dataTransfer.types.includes('application/x-estudio-3d-element')) {
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'copy'
      return
    }
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

  const handleWorkspaceDrop = async (event: DragEvent<HTMLDivElement>) => {
    const target = event.target
    if (event.dataTransfer.types.includes('application/x-estudio-3d-element') && fabricCanvas) {
      event.preventDefault()
      event.stopPropagation()
      try {
        const payload = JSON.parse(event.dataTransfer.getData('application/x-estudio-3d-element')) as {
          type: 'shape' | 'character' | 'generatedEmoji' | 'modelEmoji'
          kind?: string
          color?: string
          label?: string
          character?: string
          emoji?: string
          emojiId?: string
        }
        const point = fabricCanvas.getPointer(event.nativeEvent)
        const dropPosition = { left: point.x, top: point.y }
        if (payload.type === 'shape' && payload.kind && payload.label) {
          const shape = threeDShapeChoices.find((choice) => choice.kind === payload.kind)
          if (!shape) throw new Error('Unknown 3D shape.')
          addEditableThreeDShape(fabricCanvas, shape.kind, payload.color ?? shape.color, payload.label, {
            left: point.x - 110,
            top: point.y - 95,
            width: 220,
            height: 190,
          })
        } else if (payload.type === 'character' && payload.character) {
          await addThreeDCharacter(fabricCanvas, payload.character, '#e879bf', dropPosition)
        } else if (payload.type === 'generatedEmoji' && payload.emoji) {
          const emoji = threeDEmojiChoices.find((choice) => choice.emoji === payload.emoji)
          if (!emoji) throw new Error('Unknown 3D emoji.')
          await addGeneratedThreeDEmoji(fabricCanvas, emoji, dropPosition)
        } else if (payload.type === 'modelEmoji' && payload.emojiId) {
          const emoji = threeDEmojiAssets.find((choice) => choice.id === payload.emojiId)
          if (!emoji) throw new Error('Unknown 3D emoji.')
          await addModelThreeDEmoji(fabricCanvas, emoji, dropPosition)
        }
        tools.setNotice(`${payload.label ?? payload.character ?? '3D element'} dropped on the canvas.`)
      } catch (error) {
        console.error('Could not drop 3D element:', error)
        tools.setNotice('Could not drop that 3D element.')
      }
      return
    }
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

  const handleCanvasSurfaceDrop = (event: DragEvent<HTMLDivElement>) => {
    if (event.dataTransfer.types.includes('application/x-estudio-3d-element')) {
      void handleWorkspaceDrop(event)
      return
    }
    if (activePageId === null) {
      void handleFirstPageDrop(event)
    } else {
      void handlePageDrop(event, activePageId)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    void handleWorkspaceDrop(event)
  }

  return (
    <section
      className={`workspace ${editorMode.active === "video" ? "video-mode" : ""} ${tools.active === "music" ? " music-mode" : ""}${showFullScreen ? " focus-mode" : ""}`}
    >
      <div
        className="stage"
        ref={(element) => {
          stageRef.current = element
          setStageRef(element)
        }}
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
            onDrop={handleCanvasSurfaceDrop}
          >
            {fabricCanvas && selectedThreeDObject && selectedThreeDHandleBounds && (
              <button
                type="button"
                className="three-d-rotate-handle"
                aria-label="Drag to rotate 3D object"
                title="Drag to rotate"
                style={{
                  left: selectedThreeDHandleBounds.left + selectedThreeDHandleBounds.width / 2,
                  top: selectedThreeDHandleBounds.top + selectedThreeDHandleBounds.height / 2,
                }}
                onPointerDown={beginThreeDRotation}
                onPointerMove={moveThreeDRotation}
                onPointerUp={endThreeDRotation}
                onPointerCancel={endThreeDRotation}
              ><Rotate3D size={31} strokeWidth={1.8} /></button>
              )}
            </CanvasSurface>
              <CanvasContextMenu holderRef={canvasHolderRef} />
            {!canvas.hasDocument && (
                <UploadLanding
                  restoring={restoring}
                  onUpload={tools.uploadFile}
                  onUploadStart={() => undefined}
                  onUploadFinish={() => undefined}
                />
            )}
          </div>

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

          {draggingFile && (editorMode.active === 'video' || !canvas.hasImage) && (
            <div className="drop-cover">
              <div>
                <Upload size={24} />
                <strong>Drop {editorMode.active === 'video' ? 'video' : 'image'} to open</strong>
              </div>
            </div>
          )}

        </div>

      {canvas.hasDocument && editorMode.active === 'image' && (
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
              <span className="page-thumbnail-grip" aria-hidden="true">
                <GripVertical size={13} />
              </span>
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
              </button>
              <div className="page-thumbnail-footer">
                <span className="page-thumbnail-label">1</span>
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
                <button
                  type="button"
                  className="page-thumbnail-action delete-thumbnail-action"
                  aria-label="Delete image on Page 1"
                  title="Delete image"
                  disabled={!pageHasImage(null) || pagesSwitching}
                  onClick={() => void activatePage(null).then(() => tools.deleteImage())}
                >
                  <Trash2 size={14} />
                </button>
                </div>
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
                <span className="page-thumbnail-grip" aria-hidden="true">
                  <GripVertical size={13} />
                </span>
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
                </button>
                <div className="page-thumbnail-footer">
                  <span className="page-thumbnail-label">{index + 2}</span>
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
          isActive={tools.active === "music"}
          onBack={() => tools.setActive("adjust")}
        />
      )}
    </section>
  );
}
