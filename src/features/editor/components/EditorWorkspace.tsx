import { 
  Eraser,
  GripVertical,
  Fullscreen,
  LockKeyhole,
  Minimize2,
  Highlighter,
  Brush,
  MoveHorizontal,
  MoveVertical,
  Paintbrush,
  Pencil, Trash2,
  UnlockKeyhole,
  Upload,
  Copy, CopyPlus, Rotate3D, RotateCcw,
  Ellipsis, AlignLeft, AlignCenter, AlignRight, Download, Link2,
  ExternalLink, MessageSquare, Layers3, ChevronRight, Clipboard, ClipboardPaste,
  Paintbrush as PaintbrushIcon,
} from "lucide-react";
import { createPortal } from 'react-dom'
import type { DragEvent, PointerEvent as ReactPointerEvent, ReactNode, Ref } from 'react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { FabricImage, type FabricObject } from 'fabric'
import { UploadLanding } from "./UploadLanding";
import { useEditor } from '../EditorContext'
import { BACKGROUND_IMAGE_NAME, BASE_IMAGE_PROPERTY, DEFAULT_PAGE_HEIGHT, DEFAULT_PAGE_WIDTH, isDrawingLayerName } from '../model/constants'
import { objectName } from '../model/objectName'
import type { CanvasSurfaceProps, DrawingMode } from '../model/types'
import { getThreeDRotation, isThreeDRotatable, updateThreeDRotation } from '../operations/threeDShapes'
import type { ThreeDRotation } from '../operations/threeDShapes'
import ImageMusicVideoExport from './ImageMusicVideoExport'
import { LayersRail } from "./ToolRail";

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
  width: number
  height: number
}

type ObjectComment = {
  id: string
  text: string
  author: string
  createdAt: string
  updatedAt?: string
}

function readObjectComments(object: FabricObject): ObjectComment[] {
  const savedComments = object.get('comments')
  if (Array.isArray(savedComments)) {
    return savedComments.filter((comment): comment is ObjectComment =>
      Boolean(comment) &&
      typeof comment === 'object' &&
      typeof comment.id === 'string' &&
      typeof comment.text === 'string' &&
      typeof comment.createdAt === 'string',
    ).map((comment) => ({
      ...comment,
      author: typeof comment.author === 'string' ? comment.author : 'You',
    }))
  }

  const legacyComment = String(object.get('comment') ?? '').trim()
  return legacyComment
    ? [{ id: 'legacy-comment', text: legacyComment, author: 'You', createdAt: new Date(0).toISOString() }]
    : []
}

function CanvasSurface({
  scale,
  width,
  height,
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
      className="canvas-surface selected-page"
      ref={surfaceRef}
      data-drawing-cursor={showDrawingCursor}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        transform: `translate(-50%, -50%) scale(${scale})`,
        transformOrigin: "center center",
      }}
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
  const {
    canvas,
    fabricCanvas,
    tools,
    editorMode,
    videoClip,
    drawing,
    draggingFile,
    table,
    shapes,
    handleDrop,
    collaboration,
    pages: {
      items: addedPages,
      setItems: setAddedPages,
      activeId: activePageId,
      switching: pagesSwitching,
      pageOnePreview,
      select: activatePage,
      getSnapshot: getPageSnapshot,
      getPersistedState: getPersistedPageState,
      saveActivePage,
      deleteFirstPage:removeFirstPage,
      replace: replacePage,
      registerActions: registerPageActions,
      order: pageOrder,
      reorder: reorderPages,
    },
  } = useEditor()
  const viewportRef = useRef<HTMLDivElement>(null);
  const [showFullScreen, setShowFullScreen] = useState(false);
  const [uploadingInitialImage, setUploadingInitialImage] = useState(false);
  const [dropTargetPageId, setDropTargetPageId] = useState<number | 'first' | null>(null)
  const [objectMenuOpen, setObjectMenuOpen] = useState(false)
  const [objectAlignMenuOpen, setObjectAlignMenuOpen] = useState(false)
  const [objectLayerMenuOpen, setObjectLayerMenuOpen] = useState(false)
  const [commentDialogOpen, setCommentDialogOpen] = useState(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [commentDraft, setCommentDraft] = useState('')
  const [comments, setComments] = useState<ObjectComment[]>([])
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [linkDraft, setLinkDraft] = useState('https://')
  const [copiedObjectAvailable, setCopiedObjectAvailable] = useState(false)
  const [copiedStyleAvailable, setCopiedStyleAvailable] = useState(false)
  const copiedObjectRef = useRef<FabricObject | null>(null)
  const pasteCountRef = useRef(0)
  const copiedStyleRef = useRef<Record<string, unknown> | null>(null)
  const floatingToolbarRef = useRef<HTMLDivElement | null>(null)
  const objectMenuRef = useRef<HTMLDivElement | null>(null)
  const objectMenuTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [objectMenuPosition, setObjectMenuPosition] = useState<{
    left: number
    top: number
    maxHeight: number
    submenuOpensLeft: boolean
  } | null>(null)
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
    sketch: Pencil,
    marker: Brush,
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
    if (selectPageId !== null) {
      const pageExists = addedPages.some((page) => page.id === selectPageId)
      if (!pageExists) {
        pendingPageSelectRef.current = null
      } else if (!pagesSwitching) {
        pendingPageSelectRef.current = null
        void activatePage(selectPageId)
      }
    }
  }, [addedPages, activatePage, pagesSwitching, scrollToPage])
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

  const selectedThreeDObject = canvas.selected instanceof FabricImage && isThreeDRotatable(canvas.selected)
    ? canvas.selected
    : null
  const selectedThreeDBounds = selectedThreeDObject?.getBoundingRect()
  const selectedBounds = canvas.selected?.getBoundingRect()
  const selectedIsBaseImage = canvas.selected?.get(BASE_IMAGE_PROPERTY) === true
  const toolbarScale = Math.max(0.001, canvas.fitScale * canvas.zoom)
  const toolbarGap = 16 / toolbarScale
  const toolbarAtBottom = !selectedIsBaseImage && Boolean(selectedBounds && selectedBounds.top < 64 / toolbarScale)
  const toolbarVerticalAnchor = toolbarAtBottom ? '0' : '-100%'
  useEffect(() => {
    setObjectMenuOpen(false)
    setObjectAlignMenuOpen(false)
    setObjectLayerMenuOpen(false)
    setCommentDialogOpen(false)
    setLinkDialogOpen(false)
  }, [canvas.selected])

  useEffect(() => {
    if (!objectMenuOpen) return
    const closeMenu = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setObjectMenuOpen(false)
        setObjectAlignMenuOpen(false)
        setObjectLayerMenuOpen(false)
      }
    }
    const closeOutside = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.floating-object-toolbar, .object-context-menu')) {
        setObjectMenuOpen(false)
        setObjectAlignMenuOpen(false)
        setObjectLayerMenuOpen(false)
      }
    }
    window.addEventListener('keydown', closeMenu)
    window.addEventListener('pointerdown', closeOutside)
    return () => {
      window.removeEventListener('keydown', closeMenu)
      window.removeEventListener('pointerdown', closeOutside)
    }
  }, [objectMenuOpen])

  useLayoutEffect(() => {
    if (!objectMenuOpen) return
    const updatePosition = () => {
      const trigger = objectMenuTriggerRef.current
      const menu = objectMenuRef.current
      if (!trigger || !menu) return
      const triggerBounds = trigger.getBoundingClientRect()
      const menuBounds = menu.getBoundingClientRect()
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight
      const margin = 8
      const gap = 6
      const menuWidth = menuBounds.width || 220
      const menuHeight = menu.scrollHeight
      const availableBelow = viewportHeight - triggerBounds.bottom - gap - margin
      const availableAbove = triggerBounds.top - gap - margin
      const opensAbove = availableBelow < menuHeight && availableAbove > availableBelow
      const availableHeight = Math.max(80, Math.min(menuHeight, opensAbove ? availableAbove : availableBelow))
      let top = opensAbove ? triggerBounds.top - availableHeight - gap : triggerBounds.bottom + gap
      top = Math.max(margin, Math.min(top, viewportHeight - availableHeight - margin))
      const spaceRight = viewportWidth - triggerBounds.right - margin
      const spaceLeft = triggerBounds.left - margin
      const opensLeft = spaceRight < menuWidth + gap && spaceLeft > spaceRight
      let left = opensLeft ? triggerBounds.left - menuWidth - gap : triggerBounds.right + gap
      left = Math.max(margin, Math.min(left, viewportWidth - menuWidth - margin))
      const remainingRight = viewportWidth - (left + menuWidth) - margin
      const remainingLeft = left - margin
      const submenuOpensLeft = remainingRight < 190 && remainingLeft > remainingRight
      setObjectMenuPosition({
        left,
        top,
        maxHeight: availableHeight,
        submenuOpensLeft,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [objectMenuOpen, copiedStyleAvailable, objectLayerMenuOpen, objectAlignMenuOpen])

  const alignSelected = (position: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const selected = canvas.selected
    if (!selected || !fabricCanvas) return
    const bounds = selected.getBoundingRect()
    let deltaX = 0
    let deltaY = 0
    if (position === 'left') deltaX = -bounds.left
    if (position === 'center') deltaX = canvas.dimensions.width / 2 - (bounds.left + bounds.width / 2)
    if (position === 'right') deltaX = canvas.dimensions.width - (bounds.left + bounds.width)
    if (position === 'top') deltaY = -bounds.top
    if (position === 'middle') deltaY = canvas.dimensions.height / 2 - (bounds.top + bounds.height / 2)
    if (position === 'bottom') deltaY = canvas.dimensions.height - (bounds.top + bounds.height)
    selected.set({ left: (selected.left ?? 0) + deltaX, top: (selected.top ?? 0) + deltaY })
    selected.setCoords()
    fabricCanvas.requestRenderAll()
  }

  const copySelectedObject = useCallback(async () => {
    const selected = canvas.selected
    if (!selected) return
    const copiedObject = await selected.clone(['chartConfigJson', 'chartType', 'chartConfig', 'comment', 'comments', 'link'])
    copiedObject.set({
      comment: selected.get('comment') ?? '',
      comments: readObjectComments(selected).map((comment) => ({ ...comment })),
      link: selected.get('link') ?? '',
    })
    copiedObjectRef.current = copiedObject
    pasteCountRef.current = 0
    setCopiedObjectAvailable(true)
    tools.setNotice('Selection copied.')
  }, [canvas.selected, tools])

  const pasteCopiedObject = useCallback(async () => {
    if (!copiedObjectRef.current || !fabricCanvas) return
    const copiedObject = copiedObjectRef.current
    const clone = await copiedObject.clone(['chartConfigJson', 'chartType', 'chartConfig', 'comment', 'comments', 'link'])
    clone.set({
      comment: copiedObject.get('comment') ?? '',
      comments: readObjectComments(copiedObject).map((comment) => ({ ...comment })),
      link: copiedObject.get('link') ?? '',
    })
    const pasteNumber = ++pasteCountRef.current
    const pasteOffset = 24 * pasteNumber
    clone.set({
      left: (clone.left ?? 0) + pasteOffset,
      top: (clone.top ?? 0) + pasteOffset,
      name: `${objectName(clone, 0)} copy${pasteNumber > 1 ? ` ${pasteNumber}` : ''}`,
    })
    fabricCanvas.add(clone)
    fabricCanvas.setActiveObject(clone)
    fabricCanvas.requestRenderAll()
  }, [fabricCanvas])

  useEffect(() => {
    const handleObjectShortcuts = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.matches('input, textarea, [contenteditable="true"]')) return
      const command = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (command && key === 'v' && copiedObjectRef.current) {
        event.preventDefault()
        void pasteCopiedObject()
        return
      }
      if (!canvas.selected) return
      if (command && key === 'c') {
        event.preventDefault()
        void copySelectedObject()
      } else if (command && key === 'd') {
        event.preventDefault()
        void shapes.duplicate()
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault()
        shapes.delete()
      }
    }
    window.addEventListener('keydown', handleObjectShortcuts)
    return () => window.removeEventListener('keydown', handleObjectShortcuts)
  }, [canvas.selected, copySelectedObject, pasteCopiedObject, shapes])

  const copySelectedStyle = () => {
    if (!canvas.selected) return
    copiedStyleRef.current = canvas.selected.toObject([
      'fill', 'stroke', 'strokeWidth', 'strokeDashArray', 'strokeDashOffset', 'strokeLineCap',
      'strokeLineJoin', 'strokeMiterLimit', 'strokeUniform', 'opacity', 'fillRule', 'paintFirst',
      'shadow', 'backgroundColor', 'textAlign', 'fontFamily', 'fontSize', 'fontWeight',
      'fontStyle', 'underline', 'overline', 'linethrough', 'charSpacing', 'lineHeight',
      'textBackgroundColor',
    ])
    setCopiedStyleAvailable(true)
    tools.setNotice('Object style copied.')
  }

  const pasteSelectedStyle = () => {
    const selected = canvas.selected
    if (!selected || !copiedStyleRef.current || !fabricCanvas) return
    selected.set(copiedStyleRef.current)
    selected.setCoords()
    fabricCanvas?.requestRenderAll()
    fabricCanvas.fire('object:modified', { target: selected })
    tools.setNotice('Object style pasted.')
  }

  const downloadSelectedObject = () => {
    const selected = canvas.selected
    if (!fabricCanvas || !selected || !selectedBounds) return
    const dataUrl = fabricCanvas.toDataURL({
      format: 'png',
      multiplier: 2,
      left: selectedBounds.left,
      top: selectedBounds.top,
      width: selectedBounds.width,
      height: selectedBounds.height,
    })
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `${objectName(selected, 0).replace(/[^a-z0-9-_]+/gi, '-').toLowerCase()}.png`
    link.click()
  }

  const openCommentDialog = () => {
    if (!canvas.selected) return
    setComments(readObjectComments(canvas.selected))
    setCommentDraft('')
    setEditingCommentId(null)
    setObjectMenuOpen(false)
    setCommentDialogOpen(true)
  }

  const saveSelectedComment = () => {
    const selected = canvas.selected
    const text = commentDraft.trim()
    if (!selected || !text) return

    const timestamp = new Date().toISOString()
    const nextComments = editingCommentId
      ? comments.map((comment) => comment.id === editingCommentId
        ? { ...comment, text, updatedAt: timestamp }
        : comment)
      : [...comments, { id: crypto.randomUUID(), text, author: 'You', createdAt: timestamp }]

    selected.set({ comments: nextComments, comment: nextComments.at(-1)?.text ?? '' })
    fabricCanvas?.requestRenderAll()
    fabricCanvas?.fire('object:modified', { target: selected })
    setComments(nextComments)
    setCommentDraft('')
    setEditingCommentId(null)
    tools.setNotice(editingCommentId ? 'Comment updated.' : 'Comment added.')
  }

  const editComment = (comment: ObjectComment) => {
    setEditingCommentId(comment.id)
    setCommentDraft(comment.text)
  }

  const deleteComment = (commentId: string) => {
    const selected = canvas.selected
    if (!selected) return
    const nextComments = comments.filter((comment) => comment.id !== commentId)
    selected.set({ comments: nextComments, comment: nextComments.at(-1)?.text ?? '' })
    fabricCanvas?.requestRenderAll()
    fabricCanvas?.fire('object:modified', { target: selected })
    setComments(nextComments)
    if (editingCommentId === commentId) {
      setEditingCommentId(null)
      setCommentDraft('')
    }
    tools.setNotice('Comment deleted.')
  }

  const openLinkDialog = () => {
    if (!canvas.selected) return
    setLinkDraft(String(canvas.selected.get('link') ?? 'https://'))
    setObjectMenuOpen(false)
    setLinkDialogOpen(true)
  }

  const visitLink = (value: string) => {
    try {
      const url = new URL(value)
      if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) return
      window.open(url.href, '_blank', 'noopener,noreferrer')
    } catch {
      tools.setNotice('Enter a valid website address.')
    }
  }

  const openSelectedLink = () => {
    const value = String(canvas.selected?.get('link') ?? '').trim()
    if (value) visitLink(value)
  }

  const removeSelectedLink = () => {
    const selected = canvas.selected
    if (!selected) return
    selected.set('link', '')
    fabricCanvas?.requestRenderAll()
    fabricCanvas?.fire('object:modified', { target: selected })
    setLinkDraft('https://')
    setLinkDialogOpen(false)
    tools.setNotice('Link removed.')
  }

  const saveSelectedLink = () => {
    if (!canvas.selected) return
    const value = linkDraft.trim()
    if (!value || value === 'https://') {
      canvas.selected.set('link', '')
      tools.setNotice('Link removed.')
    } else {
      try {
        const url = new URL(value)
        if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) throw new Error('Unsupported protocol')
        canvas.selected.set('link', url.href)
        void navigator.clipboard?.writeText(url.href).catch(() => undefined)
        fabricCanvas?.fire('object:modified', { target: canvas.selected })
        tools.setNotice('Link saved.')
      } catch {
        tools.setNotice('Enter a valid website address.')
        return
      }
    }
    setLinkDialogOpen(false)
    fabricCanvas?.requestRenderAll()
  }

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

    event.preventDefault();
    const dragTypes = event.dataTransfer.types
    const isPageImage = dragTypes.includes('application/x-estudio-page-image')

    const isPageOrder = dragTypes.includes('application/x-estudio-page-order')
    if (isPageImage || isPageOrder) {
      tools.setDraggingFile(false)
     if (isPageImage) autoScrollStage(event)
      return
    }
    if (dragTypes.includes('Files')) tools.setDraggingFile(true);
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

  const handlePageImageDragStart = (event: DragEvent<HTMLElement>, pageId: number | null) => {
    if ( !event.dataTransfer) {
      event.preventDefault()
      return
    }

    const page = pageId === null ? undefined : addedPages.find((item) => item.id === pageId)
    const isActivePage = activePageId === pageId
    event.dataTransfer.effectAllowed = 'copy'
    if(!fabricCanvas || !pageHasImage(pageId)) {
      event.preventDefault()
      return
    }
    const imageUrl = isActivePage
      ? fabricCanvas.toDataURL({ format: 'png', multiplier: 1 })
      : pageId === null
        ? getPersistedPageState().pageOneImageSource
        : page?.imageUrl
    if (!imageUrl) {
      event.preventDefault()
      return
    }

    const snapshot = getPageSnapshot(pageId)
    const snapshotData = snapshot ? JSON.parse(snapshot) as { width?: number; height?: number } : null
    event.dataTransfer.setData('application/x-estudio-page-image', JSON.stringify({
      imageUrl,
      fileName: page?.fileName ?? `Page ${pageOrder.indexOf(pageId) + 1}`,
      width: snapshotData?.width ?? page?.width ?? canvas.dimensions.width,
      height: snapshotData?.height ?? page?.height ?? canvas.dimensions.height,
    } satisfies DraggedPageImage))
  }
  const handlePageReorderDragStart = (event: DragEvent<HTMLButtonElement>, pageId: number | null) => {
    if (!event.dataTransfer) {
      event.preventDefault()
      return
    }
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('application/x-estudio-page-order', JSON.stringify(pageId))
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
      width: DEFAULT_PAGE_WIDTH,
      height: DEFAULT_PAGE_HEIGHT,
    }])
  }

  const duplicatePage = (sourcePageId: number |null=activePageId) => {
    if (activePageId === sourcePageId ) saveActivePage()
    const sourcePage = sourcePageId === null  
      ? undefined
      : addedPages.find((page) => page.id === sourcePageId)
    const pageSnapshot = getPageSnapshot(sourcePageId)
    const imageUrl = sourcePage?.imageUrl ?? (
      sourcePageId === activePageId && canvas.hasImage && fabricCanvas
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
      const sourceIndex = sourcePageId === null
        ? -1
        : pages.findIndex((page) => page.id === sourcePageId)
      const insertIndex = sourceIndex < 0 ? 0 : sourceIndex + 1
      const duplicate = {
        id: pageId,
        imageUrl,
        snapshot: copiedSnapshot,
        fileName: `${sourcePage?.fileName ?? 'Page 1'} copy`,
        width: DEFAULT_PAGE_WIDTH,
        height: DEFAULT_PAGE_HEIGHT,
      }
      return [...pages.slice(0, insertIndex), duplicate, ...pages.slice(insertIndex)]
    })
    const nextPageId = pageOrder[pageOrder.indexOf(sourcePageId) + 1] 
    if (nextPageId !== undefined) {
      reorderPages(pageId, nextPageId)
    }
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

    const handlePageDragOver = (event: DragEvent<HTMLElement>, pageId: number | null) => {
    if (event.dataTransfer.types.includes('application/x-estudio-page-order')) {
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'move'
      setDropTargetPageId(pageId === null ? 'first' : pageId)
      return
    }
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

  const handlePageThumbnailDrop = (event: DragEvent<HTMLDivElement>, pageId: number | null) => {
    if (event.dataTransfer.types.includes('application/x-estudio-page-order')) {
      event.preventDefault()
      event.stopPropagation()
      setDropTargetPageId(null)
      try {
        const fromId = JSON.parse(event.dataTransfer.getData('application/x-estudio-page-order')) as unknown
        if (fromId === null || Number.isInteger(fromId)) reorderPages(fromId as number | null, pageId)
      } catch {
        return
      }
      return
    }
 
    if (pageId === null) void handleFirstPageDrop(event)
    else void handlePageDrop(event, pageId)
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

  const handleDeleteFirstPage = async () => {
    if (await removeFirstPage()) return
    await activatePage(null)
    tools.deleteImage()
  }
 
  const orderedPageIds = [
    ...pageOrder.filter((pageId) => pageId === null || addedPages.some((page) => page.id === pageId)),
    ...addedPages.map((page) => page.id).filter((pageId) => !pageOrder.includes(pageId)),
  ]
  if (!orderedPageIds.includes(null)) orderedPageIds.unshift(null)
 
  useEffect(() => {
    registerPageActions({
      replace: (pageId) => pageUploadInputsRef.current.get(pageId)?.click(),
      delete: deletePage,
    })
    return () => registerPageActions(null)
  }, [deletePage, registerPageActions])
  
  const toolbarPosition = selectedBounds ? (() => {
    const toolbarWidth = (floatingToolbarRef.current?.offsetWidth ?? 180) / toolbarScale;
    const toolbarHeight = (floatingToolbarRef.current?.offsetHeight ?? 40) / toolbarScale;
    const toolbarMargin = 8 / toolbarScale;
    const rawToolbarLeft = selectedIsBaseImage ? selectedBounds.left + selectedBounds.width - 35 / toolbarScale : selectedBounds.left + selectedBounds.width - 8 / toolbarScale;
    const minToolbarLeft = toolbarWidth + toolbarMargin;
    const maxToolbarLeft = canvas.dimensions.width - toolbarMargin;
    const toolbarLeft = Math.max(Math.min(rawToolbarLeft, maxToolbarLeft), Math.min(minToolbarLeft, maxToolbarLeft));
    const rawToolbarTop = selectedIsBaseImage ? selectedBounds.top - 8 / toolbarScale : toolbarAtBottom ? selectedBounds.top + toolbarGap : selectedBounds.top - toolbarGap;
    const rawVisibleTop = toolbarAtBottom ? rawToolbarTop : rawToolbarTop - toolbarHeight;
    const maxVisibleTop = canvas.dimensions.height - toolbarHeight - toolbarMargin;
    const visibleTop = Math.max(Math.min(rawVisibleTop, maxVisibleTop), toolbarMargin);
    const toolbarTop = toolbarAtBottom ? visibleTop : visibleTop + toolbarHeight;
    return { left: toolbarLeft, top: toolbarTop };
  })() : null;

  return (
    <section
      className={`workspace ${editorMode.active === "video" ? "video-mode" : ""} ${tools.active === "music" ? " music-mode" : ""}${showFullScreen ? " focus-mode" : ""}`}
    >
      {editorMode.active === "image" && tools.active !== "layers" && canvas.objects.length !== 0 && <LayersRail />}
      <div
        className="stage"
        ref={(element) => {
          stageRef.current = element
          setStageRef(element)
        }}
        onDragOver={handleDragOver}
        onDragLeave={() => tools.setDraggingFile(false)}
        onDrop={handleWorkspaceDrop}
      >
        <div
          className="stage-page-main active-page"
          aria-label={`Page ${Math.max(1, pageOrder.indexOf(activePageId) + 1)}`}
          aria-current="page"
        >
          <div className="canvas-holder">
            <CanvasSurface
              scale={canvas.fitScale * canvas.zoom}
              width={canvas.dimensions.width}
              height={canvas.dimensions.height}
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
              {editorMode.active === 'image' && tools.active !== 'music' && (
                <div
                  className="canvas-page-actions"
                  aria-label="Page actions"
                  style={{
                    top: `${-46 / Math.max(0.001, canvas.fitScale * canvas.zoom)}px`,
                    transform: `scale(${1 / Math.max(0.001, canvas.fitScale * canvas.zoom)})`,
                  }}
                >
                  <button type="button" className="page-action-button" onClick={addPage} title="Add page">
                    <CopyPlus size={15} />
                   
                  </button>
                  <button
                    type="button"
                    className="page-action-button"
                    onClick={() => activePageId === null ? tools.openFilePicker() : replacePage(activePageId)}
                    title="Replace image"
                  >
                    <RotateCcw size={15} />
                   
                  </button>
                  <button
                    type="button"
                    className="page-action-button delete-page-button"
                    onClick={() => activePageId === null ? void handleDeleteFirstPage() : deletePage(activePageId)}
                    title="Delete page"
                  >
                    <Trash2 size={15} />
                   
                  </button>
                </div>
              )}
              {fabricCanvas && selectedThreeDObject && selectedThreeDBounds && (
              <button
                type="button"
                className="three-d-rotate-handle"
                aria-label="Drag to rotate 3D object"
                title="Drag to rotate"
                style={{
                  left: selectedThreeDBounds.left + selectedThreeDBounds.width / 2,
                  top: selectedThreeDBounds.top + selectedThreeDBounds.height / 2,
                  transform: `translate(-50%, -50%) scale(${1/ Math.max(0.5, canvas.fitScale * canvas.zoom,0.001)})`,
                }}
                onPointerDown={beginThreeDRotation}
                onPointerMove={moveThreeDRotation}
                onPointerUp={endThreeDRotation}
                onPointerCancel={endThreeDRotation}
              ><Rotate3D size={28} strokeWidth={2.8} /></button>
              )}
              {fabricCanvas && canvas.selected && selectedBounds && (
                <div
                  className={`floating-object-toolbar${toolbarAtBottom ? ' toolbar-below' : ''}`}
                  ref={floatingToolbarRef}
                  style={{
                    left: toolbarPosition?.left ?? 0,
                    top: toolbarPosition?.top ?? 0,
                    transform: `translate(-100%, ${toolbarVerticalAnchor}) scale(${1 / toolbarScale})`,
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  {canvas.selected.get('layerLocked') === true ? (
                    <>
                      {String(canvas.selected.get('link') ?? '').trim() && <button type="button" onClick={openSelectedLink} aria-label="Open link" title="Open link"><Link2 size={18} /></button>}
                      <button type="button" onClick={openCommentDialog} aria-label="Comment" title="Comment"><MessageSquare size={18} /></button>
                      <button type="button" className="active" onClick={() => shapes.setLayerLocked(canvas.selected!, false)} aria-label="Unlock" title="Unlock"><LockKeyhole size={18} /></button>
                    </>
                  ) : (
                    <>
                      {String(canvas.selected.get('link') ?? '').trim() && <button type="button" onClick={openSelectedLink} aria-label="Open link" title="Open link"><Link2 size={18} /></button>}
                      <button type="button" onClick={openCommentDialog} aria-label="Comment" title="Comment"><MessageSquare size={18} /></button>
                      <button type="button" onClick={() => shapes.setLayerLocked(canvas.selected!, true)} aria-label="Lock" title="Lock"><UnlockKeyhole size={18} /></button>
                      <button type="button" onClick={() => void shapes.duplicate()} aria-label="Duplicate" title="Duplicate"><CopyPlus size={18} /></button>
                      <button type="button" className="floating-delete-button" onClick={shapes.delete} aria-label="Delete" title="Delete"><Trash2 size={18} /></button>
                      <button ref={objectMenuTriggerRef} type="button" className={objectMenuOpen ? 'active' : ''} onClick={() => { setObjectMenuPosition(null); setObjectMenuOpen((open) => !open) }} aria-label="More options" title="More options" aria-expanded={objectMenuOpen}><Ellipsis size={20} /></button>
                    </>
                  )}
                  {objectMenuOpen && canvas.selected.get('layerLocked') !== true && createPortal(
                    <div
                      ref={objectMenuRef}
                      className={`object-context-menu${objectMenuPosition?.submenuOpensLeft ? ' menu-opens-left' : ''}`}
                      style={{
                        left: objectMenuPosition?.left ?? 0,
                        top: objectMenuPosition?.top ?? 0,
                        maxHeight: objectMenuPosition?.maxHeight ?? 'calc(100dvh - 16px)',
                        visibility: objectMenuPosition ? 'visible' : 'hidden',
                      }}
                      role="menu"
                    >
                      <button role="menuitem" type="button" onClick={() => void copySelectedObject()}><span><Clipboard size={17} /> Copy</span><kbd>Ctrl+C</kbd></button>
                      <button role="menuitem" type="button" onClick={copySelectedStyle}><span><PaintbrushIcon size={17} /> Copy style</span></button>
                      {copiedStyleAvailable && <button role="menuitem" type="button" onClick={pasteSelectedStyle}><span><PaintbrushIcon size={17} /> Paste style</span></button>}
                      <button role="menuitem" type="button" onClick={() => void pasteCopiedObject()} disabled={!copiedObjectAvailable}><span><ClipboardPaste size={17} /> Paste</span><kbd>Ctrl+V</kbd></button>
                      <button role="menuitem" type="button" onClick={() => void shapes.duplicate()}><span><CopyPlus size={17} /> Duplicate</span><kbd>Ctrl+D</kbd></button>
                      <button role="menuitem" type="button" onClick={shapes.delete}><span><Trash2 size={17} /> Delete</span><kbd>Del</kbd></button>
                      <div className="object-context-divider" />
                      <button role="menuitem" type="button" className="object-context-submenu-trigger" aria-haspopup="menu" aria-expanded={objectLayerMenuOpen} aria-controls="object-layer-submenu" onClick={() => { setObjectAlignMenuOpen(false); setObjectLayerMenuOpen((open) => !open) }}><span><Layers3 size={17} /> Layer</span><ChevronRight size={16} /></button>
                      {objectLayerMenuOpen && (
                        <div id="object-layer-submenu" className="object-context-submenu object-layer-submenu" role="menu">
                          <button type="button" onClick={() => shapes.moveLayer(canvas.selected!, 'forward')}>Bring forward</button>
                          <button type="button" onClick={() => shapes.moveLayer(canvas.selected!, 'backward')}>Send backward</button>
                        </div>
                      )}
                      <button role="menuitem" type="button" className="object-context-submenu-trigger" aria-haspopup="menu" aria-expanded={objectAlignMenuOpen} aria-controls="object-align-submenu" onClick={() => { setObjectLayerMenuOpen(false); setObjectAlignMenuOpen((open) => !open) }}><span><AlignCenter size={17} /> Align to page</span><ChevronRight size={16} /></button>
                      {objectAlignMenuOpen && (
                        <div id="object-align-submenu" className="object-context-submenu object-align-submenu" role="menu">
                          <button type="button" onClick={() => alignSelected('left')}><AlignLeft size={16} /> Align left</button>
                          <button type="button" onClick={() => alignSelected('center')}><AlignCenter size={16} /> Align center</button>
                          <button type="button" onClick={() => alignSelected('right')}><AlignRight size={16} /> Align right</button>
                          <button type="button" onClick={() => alignSelected('top')}><span className="align-symbol align-top">T</span> Align top</button>
                          <button type="button" onClick={() => alignSelected('middle')}><span className="align-symbol">M</span> Align middle</button>
                          <button type="button" onClick={() => alignSelected('bottom')}><span className="align-symbol align-bottom">B</span> Align bottom</button>
                        </div>
                      )}
                      <button role="menuitem" type="button" onClick={openCommentDialog}><span><MessageSquare size={17} /> Comment</span></button>
                      <button role="menuitem" type="button" onClick={() => shapes.setLayerLocked(canvas.selected!, !(canvas.selected!.get('layerLocked') === true))}><span>{canvas.selected.get('layerLocked') === true ? <UnlockKeyhole size={17} /> : <LockKeyhole size={17} />} {canvas.selected.get('layerLocked') === true ? 'Unlock' : 'Lock'}</span></button>
                      <button role="menuitem" type="button" onClick={openLinkDialog}><span><Link2 size={17} /> Link</span></button>
                      <button role="menuitem" type="button" onClick={downloadSelectedObject}><span><Download size={17} /> Download selection</span></button>
                    </div>,
                    document.body,
                  )}
                </div>
              )}
            </CanvasSurface>
            {commentDialogOpen && canvas.selected && (
              <div className="object-action-backdrop" onPointerDown={() => setCommentDialogOpen(false)}>
                <div className="object-action-dialog" role="dialog" aria-modal="true" aria-label="Comment" onPointerDown={(event) => event.stopPropagation()}>
                  <div className="object-action-dialog-header"><strong>Comments <span className="object-comment-count">{comments.length}</span></strong><button type="button" onClick={() => setCommentDialogOpen(false)} aria-label="Close comment dialog">×</button></div>
                  <div className="object-comment-list">
                    {comments.length === 0
                      ? <div className="object-comment-empty">No comments yet.</div>
                      : comments.map((comment) => (
                        <article className="object-comment-entry" key={comment.id}>
                          <div className="object-comment-meta"><strong>{comment.author}</strong><time dateTime={comment.updatedAt ?? comment.createdAt}>{new Date(comment.updatedAt ?? comment.createdAt).toLocaleString()}{comment.updatedAt ? ' · edited' : ''}</time></div>
                          <p>{comment.text}</p>
                          <div className="object-comment-controls">
                            <button type="button" onClick={() => editComment(comment)} aria-label="Edit comment" title="Edit comment"><Pencil size={15} /></button>
                            <button type="button" onClick={() => deleteComment(comment.id)} aria-label="Delete comment" title="Delete comment"><Trash2 size={15} /></button>
                          </div>
                        </article>
                      ))}
                  </div>
                  <div className="object-comment-composer">
                    <label htmlFor="object-comment">{editingCommentId ? 'Edit comment' : 'Add a comment'}</label>
                    <textarea id="object-comment" autoFocus value={commentDraft} onChange={(event) => setCommentDraft(event.target.value)} placeholder="Write a comment..." />
                    <div className="object-comment-composer-actions">
                      {editingCommentId && <button type="button" className="object-comment-cancel" onClick={() => { setEditingCommentId(null); setCommentDraft('') }}>Cancel</button>}
                      <button type="button" className="object-action-save" disabled={!commentDraft.trim()} onClick={saveSelectedComment}>{editingCommentId ? 'Update comment' : 'Add comment'}</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {linkDialogOpen && canvas.selected && (
              <div className="object-action-backdrop" onPointerDown={() => setLinkDialogOpen(false)}>
                <div className="object-action-dialog object-link-dialog" role="dialog" aria-modal="true" aria-label="Add link" onPointerDown={(event) => event.stopPropagation()}>
                  <div className="object-action-dialog-header"><strong>Website URL</strong><button type="button" onClick={() => setLinkDialogOpen(false)} aria-label="Close link dialog">×</button></div>
                  <input aria-label="Website URL" autoFocus value={linkDraft} onChange={(event) => setLinkDraft(event.target.value)} placeholder="https://example.com" />
                  <p>Enter a web address to link this element.</p>
                  <div className="object-link-actions">
                    {String(canvas.selected.get('link') ?? '').trim() && <button type="button" className="object-link-secondary" onClick={removeSelectedLink}>Remove link</button>}
                    {linkDraft.trim() && linkDraft.trim() !== 'https://' && <button type="button" className="object-link-secondary" onClick={() => visitLink(linkDraft.trim())}><ExternalLink size={14} /> Open</button>}
                    <button type="button" className="object-action-save" onClick={saveSelectedLink} disabled={!linkDraft.trim()}>Save link</button>
                  </div>
                </div>
              </div>
            )}
            {(!canvas.hasDocument || uploadingInitialImage) &&
            editorMode.active === "image" && (
              <UploadLanding
                restoring={collaboration.loading}
                onUploadStart={() => setUploadingInitialImage(true)}
                onUploadFinish={() => setUploadingInitialImage(false)}
                libraryItems={collaboration.libraryItems}
                libraryLoading={collaboration.libraryLoading}
                libraryError={collaboration.libraryError}
                onRefreshLibrary={collaboration.refreshLibrary}
                onOpenDocument={(documentId) => {
                  void collaboration
                    .openDocument(documentId)
                    .catch(() => undefined);
                }}
                openingDocumentId={collaboration.openingDocumentId}
                onUpload={(file, onProgress) =>
                  tools.uploadFile(file, onProgress)
                }
              />
            )}
          {collaboration.workspaceOpen && canvas.hasDocument && (
            <div
              className="modal-backdrop workspace-dialog-backdrop"
              role="presentation"
              onClick={collaboration.closeWorkspace}
            >
              <div
                className="workspace-dialog"
                role="dialog"
                aria-modal="true"
                aria-label="Browse saved images"
                onClick={(event) => event.stopPropagation()}
              >
                <UploadLanding
                  restoring={collaboration.loading}
                  onUpload={async () => null}
                  onUploadStart={() => undefined}
                  onUploadFinish={() => undefined}
                  libraryItems={collaboration.libraryItems}
                  libraryLoading={collaboration.libraryLoading}
                  libraryError={collaboration.libraryError}
                  onRefreshLibrary={collaboration.refreshLibrary}
                  onOpenDocument={(documentId) => {
                    void collaboration
                      .openDocument(documentId)
                      .then(() => collaboration.closeWorkspace())
                      .catch(() => undefined);
                  }}
                  openingDocumentId={collaboration.openingDocumentId}
                  initialView="workspace"
                  workspaceOnly
                  onClose={collaboration.closeWorkspace}
                />
              </div>
            </div>
          )}
          {collaboration.loading && canvas.hasDocument && (
            <div
              className="collaboration-loading"
              role="status"
              aria-live="polite"
            >
              <span className="upload-spinner" /> Loading shared document…
            </div>
          )}

            {/* {!canvas.hasDocument && (
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
            )} */}
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

          {draggingFile && (editorMode.active === 'video' || !canvas.hasImage) && (
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
      </div>
        {canvas.hasDocument && editorMode.active === 'image' && (
        <div className="workspace-pages">
          <div className="page-thumbnails" ref={thumbnailStripRef} aria-label="Pages">
            {orderedPageIds.map((pageId, index) => {
              const isFirstPage = pageId === null
              const page = isFirstPage ? undefined : addedPages.find((item) => item.id === pageId)
              if (!isFirstPage && !page) return null
              const pageNumber = index + 1
              const preview = isFirstPage
                ? pageOnePreview || (activePageId === null ? canvas.imageThumbnail : '')
                : page?.preview || page?.imageUrl
              const isDropTarget = dropTargetPageId === (isFirstPage ? 'first' : pageId)
              return (
                <div
                  key={isFirstPage ? 'page-one' : pageId}
                  className={`page-thumbnail${activePageId === pageId ? ' selected' : ''}${isDropTarget ? ' drop-target' : ''}`}
                  data-page-id={pageId ?? 'first'}
                  ref={(element) => {
                    if (element) thumbnailElementsRef.current.set(pageId, element)
                    else thumbnailElementsRef.current.delete(pageId)
                  }}
                  onDragOver={(event) => handlePageDragOver(event, pageId)}
                  onDragLeave={(event) => {
                    event.stopPropagation()
                    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                      setDropTargetPageId(null)
                    }
                  }}
                  onDrop={(event) => {
                    handlePageThumbnailDrop(event, pageId)
                  }}
                  onDragEnd={() => setDropTargetPageId(null)}
                >
                  <button
                    type="button"
                    className="page-thumbnail-select"
                    draggable={pageHasImage(pageId)}
                    aria-label={`Select Page ${pageNumber}`}
                    aria-current={activePageId === pageId ? 'page' : undefined}
                    onClick={() => void activatePage(pageId)}
                    onDragStart={(event) => handlePageImageDragStart(event, pageId)}
                  >
                    <span className="page-thumbnail-preview">
                      {preview
                        ? <img src={preview} alt={`Page ${pageNumber} preview`} draggable={false} />
                        : <span className="page-thumbnail-empty">Empty page</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="page-thumbnail-reorder-handle"
                    draggable
                    aria-label={`Drag Page ${pageNumber} to reorder`}
                    title="Drag to reorder"
                    onDragStart={(event) => handlePageReorderDragStart(event, pageId)}
                  >
                    <GripVertical size={14} aria-hidden="true" />
                  </button>
                  <div className="page-thumbnail-actions">
                    <span className="page-thumbnail-label">{pageNumber}</span>
                    <div className="page-thumbnail-actions-right">
                      <button
                        type="button"
                        className="page-thumbnail-action"
                        aria-label={`${page?.imageUrl ? 'Replace' : 'Upload or replace'} image on Page ${pageNumber}`}
                        title={page?.imageUrl ? 'Replace image' : 'Upload or replace image'}
                        onClick={() => isFirstPage
                          ? void activatePage(null).then(() => tools.openFilePicker())
                          : pageUploadInputsRef.current.get(pageId as number)?.click()}
                      >
                        {page?.imageUrl || (isFirstPage && pageOnePreview)
                          ? <RotateCcw size={14} />
                          : <Upload size={14} />}
                      </button>
                      <button
                        type="button"
                        className="page-thumbnail-action"
                        aria-label={`Duplicate Page ${pageNumber}`}
                        title="Duplicate page"
                        onClick={() => duplicatePage(pageId)}
                      >
                        <Copy size={14} />
                      </button>
                      {(!isFirstPage || pageHasImage(null) || addedPages.length > 0) && (
                        <button
                          type="button"
                          className="page-thumbnail-action delete-thumbnail-action"
                          aria-label={`Delete Page ${pageNumber}`}
                          title="Delete page"
                          onClick={() => isFirstPage ? void handleDeleteFirstPage() : deletePage(pageId as number)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                  {!isFirstPage && <input
                    ref={(element) => {
                      if (element) pageUploadInputsRef.current.set(pageId as number, element)
                      else pageUploadInputsRef.current.delete(pageId as number)
                    }}
                    className="page-upload-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => {
                      uploadPageImage(pageId as number, event.currentTarget.files?.[0])
                      event.currentTarget.value = ''
                    }}
                  />}
                </div>
              )
            })}
 
            <button type="button" className="page-thumbnail-add" onClick={addPage} aria-label="Add page" title="Add page">
              <CopyPlus size={30} strokeWidth={1} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
        { canvas.hasDocument && (
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
    )}

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
