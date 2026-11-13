import type { DragEvent, PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FabricImage } from 'fabric'
import { Copy, Eraser, Highlighter, MoveHorizontal, MoveVertical, Paintbrush, Pencil, Plus, Rotate3D, RotateCcw, Trash2, Upload } from 'lucide-react'

import { useEditor } from '../EditorContext'
import { BACKGROUND_IMAGE_NAME, BASE_IMAGE_PROPERTY, DRAWING_LAYER_NAME } from '../model/constants'
import { objectName } from '../model/objectName'
import type { CanvasSurfaceProps, DrawingMode } from '../model/types'
import { getThreeDRotation, isThreeDRotatable, updateThreeDRotation } from '../operations/threeDShapes'
import type { ThreeDRotation } from '../operations/threeDShapes'
import ImageMusicVideoExport from './ImageMusicVideoExport'

const PAGE_ALREADY_HAS_IMAGE_NOTICE = 'This page already has an image. Remove it before adding another.'

type EditorWorkspaceProps = {
  setCanvasElement: (element: HTMLCanvasElement | null) => void
  setStageElement: (element: HTMLDivElement | null) => void
}

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
      ref={surfaceRef}
      data-drawing-cursor={showDrawingCursor}
      style={{ transform: `translate(-50%, -50%) scale(${scale})` }}
      onDragOver={onDragOver}
      onDrop={onDrop}
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
      {children}
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
  const [canvasSurfaceSize, setCanvasSurfaceSize] = useState({ width: 0, height: 0 })
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
  const [imagePreviewUrl, setImagePreviewUrl] = useState('')
  useEffect(() => {
    if (!canvas.hasImage || !fabricCanvas || tools.active !== 'music') return

    const frame = window.requestAnimationFrame(() => {
      setImagePreviewUrl(fabricCanvas.toDataURL({ format: 'png', multiplier: 1 }))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [canvas.hasImage, fabricCanvas, historyVersion, tools.active])

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
            await new Promise<void>((resolve) => {
              requestAnimationFrame(() => resolve())
            })

            if (fabricCanvas) {
              fabricCanvas.requestRenderAll()

              const preview = fabricCanvas.toDataURL({
                format: 'png',
                multiplier: 0.2,
              })

              setAddedPages((pages) =>
                pages.map((page) =>
                  page.id === pageId
                    ? { ...page, preview }
                    : page,
                ),
              )
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
      ) {
        throw new Error('Invalid image data.')
      }

      const response = await fetch(draggedImage.imageUrl)
      const imageBlob = await response.blob()
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(imageBlob.type)) {
        throw new Error('Unsupported image type.')
      }

      const file = new File(
        [imageBlob],
        draggedImage.fileName ?? 'Page image',
        { type: imageBlob.type },
      )
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
      if (!file) return
      uploadPageImage(pageId, file)
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
      target.closest('.stage-page-main')
    ) {
      event.preventDefault()
      event.stopPropagation()
      tools.setDraggingFile(false)
      tools.setNotice(PAGE_ALREADY_HAS_IMAGE_NOTICE)
      return
    }

    handleDrop(event)
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
    if (addedPages.length === 1) {
      stageScrollRef.current?.style.removeProperty('--page-scroll-tail')
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

  return (
    <section
      className={`workspace ${editorMode.active === 'video' ? 'video-mode' : ''} ${tools.active === 'music' ? 'music-mode' : ''}`}
    >
      <div
        className="stage"
        ref={setStageRef}
        onDragOver={handleDragOver}
        onDragLeave={() => tools.setDraggingFile(false)}
        onDrop={handleWorkspaceDrop}
      >
        <div
          className="stage-page-main active-page"
          aria-label={`Page ${activePageId === null ? 1 : addedPages.findIndex((page) => page.id === activePageId) + 2}`}
          aria-current="page"
        >
          <div className="canvas-holder">
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
              ><Rotate3D size={18} strokeWidth={1.8} /></button>
              )}
            </CanvasSurface>
            {canvas.hasImage && editorMode.active === 'image' && (
            <div
              className="page-image-tools first-page-image-tools"
              aria-label="Current page image actions"
              style={{
                top: `calc(50% - ${canvasSurfaceSize.height / 2}px - 40px)`,
                left: `calc(50% + ${canvasSurfaceSize.width / 2 - 108}px)`,
              }}
            >
              <button type="button" className="page-icon-button" onClick={tools.openFilePicker} aria-label="Replace image" title="Replace image">
                <RotateCcw size={15} aria-hidden="true" />
              </button>
              <button type="button" className="page-icon-button" onClick={() => duplicatePage(activePageId ?? undefined)} aria-label="Duplicate page" title="Duplicate page">
                <Copy size={15} aria-hidden="true" />
              </button>
              <button type="button" className="page-icon-button delete-page-icon" onClick={tools.deleteImage} aria-label="Delete image" title="Delete image">
                <Trash2 size={15} aria-hidden="true" />
              </button>
            </div>
            )}
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

          {draggingFile && (editorMode.active === 'video' || !canvas.hasImage) && (
            <div className="drop-cover">
              <div>
                <Upload size={24} />
                <strong>Drop {editorMode.active === 'video' ? 'video' : 'image'} to open</strong>
              </div>
            </div>
          )}

        </div>
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
