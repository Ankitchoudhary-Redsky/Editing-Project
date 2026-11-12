import type { DragEvent, PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FabricImage } from 'fabric'
import { Copy, Eraser, Highlighter, MoveHorizontal, MoveVertical, Paintbrush, Pencil, Plus, Rotate3D, RotateCcw, Trash2, Upload } from 'lucide-react'

import { useEditor } from '../EditorContext'
import { objectName } from '../model/objectName'
import type { AddedEditorPage, CanvasSurfaceProps, DrawingMode, PageImageTransform } from '../model/types'
import { getThreeDRotation, isThreeDRotatable, updateThreeDRotation } from '../operations/threeDShapes'
import type { ThreeDRotation } from '../operations/threeDShapes'
import ImageMusicVideoExport from './ImageMusicVideoExport'

type EditorWorkspaceProps = {
  setCanvasElement: (element: HTMLCanvasElement | null) => void
  setPageCanvasElement?: (pageId: number, element: HTMLCanvasElement | null) => void
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

function readDraggedPageImage(dataTransfer: DataTransfer): DraggedPageImage | null {
  for (const type of ['application/x-estudio-page-image', 'text/plain']) {
    const data = dataTransfer.getData(type)
    if (!data) continue
    try {
      const payload = JSON.parse(data) as Partial<DraggedPageImage>
      if (
        typeof payload.imageUrl === 'string' &&
        typeof payload.width === 'number' &&
        typeof payload.height === 'number'
      ) return payload as DraggedPageImage
    } catch {
      continue
    }
  }
  return null
}

export function EditorWorkspace({
  historyVersion,
  setCanvasElement,
  setPageCanvasElement,
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
      switching: pageSwitching,
      select: activatePage,
      deleteFirst: deleteFirstPage,
      addImageLayer: addImageLayerToPage,
      moveImageObject: moveImageObjectBetweenPages,
      getSnapshot: getPageSnapshot,
      registerActions: registerPageActions,
    },
  } = useEditor()
  const [dropTargetPageId, setDropTargetPageId] = useState<number | null>(null)
  const [draggedImagePreview, setDraggedImagePreview] = useState('')
  const dragPreviewRef = useRef<HTMLImageElement | null>(null)
  const imagePointerDragRef = useRef<{
    pointerId: number
    sourcePageId: number | null
    sourceCanvas: NonNullable<typeof fabricCanvas>
    sourceImage: FabricImage
    transform: PageImageTransform
    startX: number
    startY: number
  } | null>(null)
  const [canvasSurfaceSize, setCanvasSurfaceSize] = useState({ width: 0, height: 0 })
  const nextPageIdRef = useRef(2)
  const pageUploadInputsRef = useRef(new Map<number, HTMLInputElement>())
  const pageElementsRef = useRef(new Map<number, HTMLElement>())
  const pageUploadVersionsRef = useRef(new Map<number, number>())
  const pageObjectUrlsRef = useRef(new Set<string>())
  const stageScrollRef = useRef<HTMLDivElement | null>(null)
  const canvasSurfaceRef = useRef<HTMLDivElement | null>(null)
  const pageImagePointerPositionRef = useRef<{ x: number; y: number } | null>(null)
  const pageImageAutoScrollFrameRef = useRef<number | null>(null)
  const pendingPageScrollRef = useRef<number | null>(null)
  const pendingPageSelectRef = useRef<number | null>(null)
  const firstPageRef = useRef<HTMLDivElement | null>(null)
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
    const pageElement = pageId === null ? firstPageRef.current : pageElementsRef.current.get(pageId)
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
    stageElement.scrollTo({ top: targetScrollTop, behavior: 'smooth' })
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

  const autoScrollStage = useCallback((clientY: number) => {
    const stage = stageScrollRef.current
    if (!stage) return false

    const bounds = stage.getBoundingClientRect()
    const edgeSize = Math.min(96, bounds.height * 0.18)
    const distanceFromTop = clientY - bounds.top
    const distanceFromBottom = bounds.bottom - clientY
    const scrollDelta = distanceFromTop < edgeSize
      ? -Math.ceil((edgeSize - distanceFromTop) / edgeSize * 80)
      : distanceFromBottom < edgeSize
        ? Math.ceil((edgeSize - distanceFromBottom) / edgeSize * 80)
        : 0
    const maxScrollTop = stage.scrollHeight - stage.clientHeight
    const nextScrollTop = Math.max(0, Math.min(maxScrollTop, stage.scrollTop + scrollDelta))
    const didScroll = nextScrollTop !== stage.scrollTop
    stage.scrollTop = nextScrollTop
    return didScroll
  }, [])
  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const hasPageImage = event.dataTransfer.types.includes('application/x-estudio-page-image') ||
      event.dataTransfer.types.includes('text/plain')
    if (
      hasPageImage ||
      event.dataTransfer.types.includes('Files')
    ) {
      autoScrollStage(event.clientY)
    }
    tools.setDraggingFile(!hasPageImage && event.dataTransfer.types.includes('Files'))
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

  const withFirstPageActive = (action: () => void) => {
    void activatePage(null).then(action)
  }

  const duplicatePage = (sourcePageId?: number) => {
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
          await activatePage(pageId)
          await tools.uploadFile(file)
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
    const isPageImage = event.dataTransfer.types.includes('application/x-estudio-page-image') ||
      event.dataTransfer.types.includes('text/plain')
    const isFile = event.dataTransfer.types.includes('Files')
    if (!isPageImage && !isFile) return
    event.preventDefault()
    event.stopPropagation()
    autoScrollStage(event.clientY)
    event.dataTransfer.dropEffect = 'copy'
    setDropTargetPageId(pageId)
  }

  const handleFirstPageDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (
      !event.dataTransfer.types.includes('application/x-estudio-page-image') &&
      !event.dataTransfer.types.includes('text/plain')
    ) return
    event.preventDefault()
    event.stopPropagation()
    autoScrollStage(event.clientY)
    event.dataTransfer.dropEffect = 'copy'
  }

  const beginPageImageDrag = (event: ReactPointerEvent<HTMLElement>, sourcePageId: number | null) => {
    if (event.button !== 0 || pageSwitching || activePageId !== sourcePageId || !fabricCanvas) return
    if (event.target instanceof Element && event.target.closest('button, input')) return

    const activeObject = fabricCanvas.getActiveObject()
    if (activeObject && !(activeObject instanceof FabricImage)) return
    const hitObject = fabricCanvas.findTarget(event.nativeEvent)
    if (hitObject && !(hitObject instanceof FabricImage)) return
    const pointer = fabricCanvas.getPointer(event.nativeEvent)
    const sourceImage = [
      ...(activeObject instanceof FabricImage ? [activeObject] : []),
      ...(hitObject instanceof FabricImage ? [hitObject] : []),
      ...fabricCanvas.getObjects().slice().reverse().filter((object): object is FabricImage =>
        object instanceof FabricImage && object.get('name') !== 'Background image',
      ),
    ].find((image, index, images) => images.indexOf(image) === index && image.containsPoint(pointer))
    if (!sourceImage) return

    imagePointerDragRef.current = {
      pointerId: event.pointerId,
      sourcePageId,
      sourceCanvas: fabricCanvas,
      sourceImage,
      transform: {
        left: sourceImage.left ?? 0,
        top: sourceImage.top ?? 0,
        scaleX: sourceImage.scaleX ?? 1,
        scaleY: sourceImage.scaleY ?? 1,
        angle: sourceImage.angle ?? 0,
        skewX: sourceImage.skewX ?? 0,
        skewY: sourceImage.skewY ?? 0,
        flipX: sourceImage.flipX ?? false,
        flipY: sourceImage.flipY ?? false,
        originX: sourceImage.originX,
        originY: sourceImage.originY,
        selectable: sourceImage.selectable,
        evented: sourceImage.evented,
        lockMovementX: sourceImage.lockMovementX,
        lockMovementY: sourceImage.lockMovementY,
        lockScalingX: sourceImage.lockScalingX,
        lockScalingY: sourceImage.lockScalingY,
        lockRotation: sourceImage.lockRotation,
        pageImageLayer: sourceImage.get('pageImageLayer') === true,
      },
      startX: event.clientX,
      startY: event.clientY,
    }
    pageImagePointerPositionRef.current = { x: event.clientX, y: event.clientY }
    setDraggedImagePreview(sourceImage.getSrc())
  }

  useEffect(() => {
    const pointer = pageImagePointerPositionRef.current
    if (!dragPreviewRef.current || !pointer) return
    dragPreviewRef.current.style.left = `${pointer.x + 14}px`
    dragPreviewRef.current.style.top = `${pointer.y + 14}px`
  }, [draggedImagePreview])

  useEffect(() => {
    const updateDropTarget = (clientX: number, clientY: number, sourcePageId: number | null) => {
      const pageElement = document.elementFromPoint(clientX, clientY)
        ?.closest<HTMLElement>('[data-editor-page-id]')
      const pageIdValue = pageElement?.dataset.editorPageId
      const pageId = pageIdValue === 'first'
        ? null
        : pageIdValue === undefined ? undefined : Number(pageIdValue)
      setDropTargetPageId(pageId !== undefined && pageId !== sourcePageId
        ? pageId ?? -1
        : null)
    }

    const stopAutoScroll = () => {
      pageImagePointerPositionRef.current = null
      if (pageImageAutoScrollFrameRef.current !== null) {
        cancelAnimationFrame(pageImageAutoScrollFrameRef.current)
        pageImageAutoScrollFrameRef.current = null
      }
    }

    const restoreSourceImage = (drag: NonNullable<typeof imagePointerDragRef.current>) => {
      requestAnimationFrame(() => {
        drag.sourceImage.set(drag.transform)
        drag.sourceImage.setCoords()
        drag.sourceCanvas.requestRenderAll()
      })
    }

    const handlePointerMove = (event: PointerEvent) => {
      const drag = imagePointerDragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      pageImagePointerPositionRef.current = { x: event.clientX, y: event.clientY }
      if (dragPreviewRef.current) {
        dragPreviewRef.current.style.left = `${event.clientX + 14}px`
        dragPreviewRef.current.style.top = `${event.clientY + 14}px`
      }
      updateDropTarget(event.clientX, event.clientY, drag.sourcePageId)

      if (autoScrollStage(event.clientY) && pageImageAutoScrollFrameRef.current === null) {
        const scrollWhileHeld = () => {
          pageImageAutoScrollFrameRef.current = null
          const currentDrag = imagePointerDragRef.current
          const pointer = pageImagePointerPositionRef.current
          if (!currentDrag || !pointer) return
          if (autoScrollStage(pointer.y)) {
            updateDropTarget(pointer.x, pointer.y, currentDrag.sourcePageId)
            pageImageAutoScrollFrameRef.current = requestAnimationFrame(scrollWhileHeld)
          }
        }
        pageImageAutoScrollFrameRef.current = requestAnimationFrame(scrollWhileHeld)
      }
    }

    const handlePointerUp = (event: PointerEvent) => {
      const drag = imagePointerDragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      imagePointerDragRef.current = null
      stopAutoScroll()
      setDraggedImagePreview('')
      setDropTargetPageId(null)
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return

      const targetPage = document.elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-editor-page-id]')
      const pageIdValue = targetPage?.dataset.editorPageId
      const targetPageId = pageIdValue === 'first'
        ? null
        : pageIdValue === undefined ? undefined : Number(pageIdValue)
      if (targetPageId === undefined || !targetPage) {
        restoreSourceImage(drag)
        return
      }

      const targetCanvas = targetPage.querySelector<HTMLCanvasElement>('.upper-canvas')
      const targetBounds = targetCanvas?.getBoundingClientRect()
      if (
        !targetBounds ||
        event.clientX < targetBounds.left || event.clientX > targetBounds.right ||
        event.clientY < targetBounds.top || event.clientY > targetBounds.bottom
      ) {
        restoreSourceImage(drag)
        return
      }

      if (targetPageId === drag.sourcePageId) return

      void moveImageObjectBetweenPages(
        drag.sourcePageId,
        targetPageId,
        drag.sourceImage,
        drag.transform,
      )
    }

    const handlePointerCancel = (event: PointerEvent) => {
      if (imagePointerDragRef.current?.pointerId !== event.pointerId) return
      restoreSourceImage(imagePointerDragRef.current)
      imagePointerDragRef.current = null
      stopAutoScroll()
      setDraggedImagePreview('')
      setDropTargetPageId(null)
    }

    window.addEventListener('pointermove', handlePointerMove, true)
    window.addEventListener('pointerup', handlePointerUp, true)
    window.addEventListener('pointercancel', handlePointerCancel, true)
    return () => {
      stopAutoScroll()
      window.removeEventListener('pointermove', handlePointerMove, true)
      window.removeEventListener('pointerup', handlePointerUp, true)
      window.removeEventListener('pointercancel', handlePointerCancel, true)
    }
  }, [addedPages, autoScrollStage, canvas.dimensions.height, canvas.dimensions.width, moveImageObjectBetweenPages])

  const handleFirstPageDrop = async (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('application/x-estudio-page-image')) return
    event.preventDefault()
    event.stopPropagation()

    try {
      const draggedImage = readDraggedPageImage(event.dataTransfer)
      if (
        !draggedImage ||
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
      await addImageLayerToPage(null, file)
    } catch {
      tools.setNotice('Could not place that image on Page 1.')
    }
  }

  const handlePageDrop = async (event: DragEvent<HTMLElement>, pageId: number) => {
    event.preventDefault()
    event.stopPropagation()
    setDropTargetPageId(null)
    const draggedImage = readDraggedPageImage(event.dataTransfer)
    if (!draggedImage) {
      const file = event.dataTransfer.files[0]
      if (!file) return
      await addImageLayerToPage(pageId, file)
      return
    }

    try {
      const response = await fetch(draggedImage.imageUrl)
      const imageBlob = await response.blob()
      await addImageLayerToPage(pageId, new File(
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
    if (target instanceof Element && target.closest('.stage-page-main')) {
      const file = event.dataTransfer.files[0]
      if (!file) return
      event.preventDefault()
      event.stopPropagation()
      tools.setDraggingFile(false)
      void addImageLayerToPage(null, file)
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
    pageElementsRef.current.delete(pageId)
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

  const getPageCanvasStyle = (page: AddedEditorPage) => ({
    width: canvasSurfaceSize.width > 0 ? `${canvasSurfaceSize.width}px` : undefined,
    maxWidth: '100%',
    aspectRatio: `${page.width ?? canvas.dimensions.width} / ${page.height ?? canvas.dimensions.height}`,
  })
  const firstPageActionOffset = canvasSurfaceSize.height > 0
    ? canvasSurfaceSize.height / 2 + 14
    : canvas.dimensions.height * canvas.fitScale * canvas.zoom / 2 + 14
  const addedPageNumberOffset = canvas.hasDeletedPageOneImage ? 1 : 2

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
      {draggedImagePreview && (
        <img
          ref={dragPreviewRef}
          className="page-image-drag-preview"
          src={draggedImagePreview}
          alt=""
          aria-hidden="true"
          draggable={false}
        />
      )}
      <div
        className="stage"
        ref={setStageRef}
        onDragOver={handleDragOver}
        onDragLeave={() => tools.setDraggingFile(false)}
        onDrop={handleWorkspaceDrop}
      >
        <div
          data-editor-page-id="first"
          className={`stage-page-main${canvas.hasDeletedPageOneImage ? ' removed-page' : ''} ${activePageId === null ? 'active-page' : ''} ${dropTargetPageId === -1 ? 'drop-target' : ''}`}
          aria-label="Page 1"
          aria-current={activePageId === null ? 'page' : undefined}
          ref={firstPageRef}
          onPointerDownCapture={(event) => {
            if (event.target instanceof Element && event.target.closest('button, input')) return
            beginPageImageDrag(event, null)
            if (activePageId !== null) scrollToPage(null)
            void activatePage(null)
          }}
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
              onDrop={(event) => void handleFirstPageDrop(event)}
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
              aria-label="Page 1 image actions"
              style={{
                top: `calc(50% - ${canvasSurfaceSize.height / 2}px - 40px)`,
                left: `calc(50% + ${canvasSurfaceSize.width / 2 - 108}px)`,
              }}
            >
              <button type="button" className="page-icon-button" onClick={() => withFirstPageActive(tools.openFilePicker)} aria-label="Replace image" title="Replace image">
                <RotateCcw size={15} aria-hidden="true" />
              </button>
              <button type="button" className="page-icon-button" onClick={() => duplicatePage()} aria-label="Duplicate page" title="Duplicate page">
                <Copy size={15} aria-hidden="true" />
              </button>
              <button type="button" className="page-icon-button delete-page-icon" onClick={deleteFirstPage} aria-label="Delete page" title="Delete page">
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
              <button className="primary-button" onClick={() => withFirstPageActive(tools.openFilePicker)}>
                <Upload size={16} /> Upload an image
              </button>
              <span className="empty-format">PNG · JPG · WEBP</span>
            </div>
            )}
          </div>

          {dropTargetPageId === -1 && (
            <span className="drop-target-label" role="status">Drop on Page 1</span>
          )}

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
              data-editor-page-id={page.id}
              className={`added-page-canvas ${activePageId === page.id ? 'active-page' : ''} ${dropTargetPageId === page.id ? 'drop-target' : ''}`}
              aria-label={`Page ${index + addedPageNumberOffset}`}
              aria-current={activePageId === page.id ? 'page' : undefined}
              ref={(element) => {
                if (element) pageElementsRef.current.set(page.id, element)
                else pageElementsRef.current.delete(page.id)
              }}
              style={getPageCanvasStyle(page)}
              onPointerDownCapture={(event) => {
                if (event.target instanceof Element && event.target.closest('button, input')) return
                beginPageImageDrag(event, page.id)
                if (activePageId !== page.id) scrollToPage(page.id)
                void activatePage(page.id)
              }}
              onDragOver={(event) => handlePageDragOver(event, page.id)}
              onDragLeave={(event) => {
                event.stopPropagation()
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDropTargetPageId(null)
                }
              }}
              onDrop={(event) => handlePageDrop(event, page.id)}
            >
              <canvas
                className="added-page-fabric-canvas"
                ref={(element) => setPageCanvasElement?.(page.id, element)}
                aria-label={`Editable Page ${index + addedPageNumberOffset}`}
              />
              {page.imageUrl && (activePageId !== page.id || pageSwitching) && (
                <img
                  className="added-page-preview"
                  src={page.imageUrl}
                  alt={`Page ${index + addedPageNumberOffset} preview`}
                  draggable={false}
                />
              )}
              {dropTargetPageId === page.id && (
                <span className="drop-target-label" role="status">
                  Drop on Page {index + addedPageNumberOffset}
                </span>
              )}
              {!page.imageUrl && (
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
              {page.imageUrl && (
                <>
                  <div className="page-image-tools" aria-label={`Page ${index + addedPageNumberOffset} image actions`}>
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
          imagePreviewUrl={imagePreviewUrl}
          imageDimensions={canvas.dimensions}
          isActive={tools.active === 'music'}
          onBack={() => tools.setActive('adjust')}
        />
      )}
    </section>
  )
}
