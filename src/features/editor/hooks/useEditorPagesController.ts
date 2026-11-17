import { useCallback, useRef, useState } from 'react'
import type {
  Dispatch,
  MutableRefObject,
  SetStateAction,
} from 'react'
import type { Canvas, FabricImage, Rect } from 'fabric'
import type {
  AddedEditorPage,
  AddedPageActions,
  EditorSnapshot,
  FilterId,
  PersistedEditorPages,
} from '../model/types'

type UseEditorPagesControllerOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  suppressHistoryRef: MutableRefObject<boolean>
  cropObjectRef: MutableRefObject<Rect | null>
  cropOriginalSnapshotRef: MutableRefObject<string | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  imageSourceRef: MutableRefObject<string>
  selectedFilterRef: MutableRefObject<FilterId>
  filterIntensityRef: MutableRefObject<number>
  backgroundRemovedRef: MutableRefObject<boolean>
  backgroundColorRef: MutableRefObject<string>

  setBackgroundRemoved: (value: boolean) => void
  setBackgroundColor: (value: string) => void
  setIsRemovingBackground: (value: boolean) => void
  setBackgroundProgress: (value: string) => void
  setSelectedFilter: (value: FilterId) => void
  setFilterIntensity: (value: number) => void
  setDimensions: (value: { width: number; height: number }) => void

  syncObjects: () => void
  resizeDisplay: () => void
  serializeEditorSnapshot: (canvas: Canvas) => string
  restoreCanvasSnapshot: (snapshot: EditorSnapshot) => Promise<void>
  initializeHistory: (canvas: Canvas) => void
}

type SnapshotData = {
  width: number
  height: number
  scene: Record<string, unknown> & { objects?: unknown[] }
  editor?: {
    filterId?: string
    filterIntensity?: number
    backgroundRemoved?: boolean
    backgroundColor?: string
  }
}

export function useEditorPagesController({
  canvasRef,
  suppressHistoryRef,
  cropObjectRef,
  cropOriginalSnapshotRef,
  imageObjectRef,
  imageSourceRef,
  selectedFilterRef,
  filterIntensityRef,
  backgroundRemovedRef,
  backgroundColorRef,
  setBackgroundRemoved,
  setBackgroundColor,
  setIsRemovingBackground,
  setBackgroundProgress,
  setSelectedFilter,
  setFilterIntensity,
  setDimensions,
  syncObjects,
  resizeDisplay,
  serializeEditorSnapshot,
  restoreCanvasSnapshot,
  initializeHistory,
}: UseEditorPagesControllerOptions) {
  const [items, setItemsState] = useState<AddedEditorPage[]>([])
  const [activeId, setActiveIdState] = useState<number | null>(null)
  const [switching, setSwitching] = useState(false)
  const [pageOnePreview, setPageOnePreview] = useState('')
  const [persistedStateVersion, setPersistedStateVersion] = useState(0)
  const [pageOrder, setPageOrderState] = useState<Array<number | null>>([null])

  const itemsRef = useRef<AddedEditorPage[]>([])
  const activeIdRef = useRef<number | null>(null)
  const pageOneSnapshotRef = useRef<string | undefined>(undefined)
  const pageOneImageSourceRef = useRef('')
  const actionsRef = useRef<AddedPageActions | null>(null)
  const pageOrderRef = useRef<Array<number | null>>([null])


  // Keep refs in sync so async page switching always reads the latest state.
  const setItems = useCallback<Dispatch<SetStateAction<AddedEditorPage[]>>>(
    (nextValue) => {
      const nextItems = typeof nextValue === 'function'
        ? nextValue(itemsRef.current)
        : nextValue

      itemsRef.current = nextItems
      setItemsState(nextItems)
      const validIds = new Set<number | null>([null, ...nextItems.map((page) => page.id)])
      const nextOrder = pageOrderRef.current.filter((PageId) => validIds.has(PageId))
      nextItems.forEach((page) => {
        if (!nextOrder.includes(page.id)) {
          nextOrder.push(page.id)
        }
      })
      if (nextOrder.some((pageId, index) => pageId !== pageOrderRef.current[index])|| nextOrder.length !== pageOrderRef.current.length) {
        pageOrderRef.current = nextOrder
        setPageOrderState(nextOrder)
      }
      setPersistedStateVersion((version) => version + 1)
    },
    [],
  )

  const setActiveId = useCallback<Dispatch<SetStateAction<number | null>>>(
    (nextValue) => {
      const nextId = typeof nextValue === 'function'
        ? nextValue(activeIdRef.current)
        : nextValue

      activeIdRef.current = nextId
      setActiveIdState(nextId)
      setPersistedStateVersion((version) => version + 1)
    },
    [],
  )

  const capturePreview = useCallback((canvas: Canvas) => {
    try {
      return canvas.toDataURL({
        format: 'png',
        multiplier: 0.2,
      })
    } catch {
      return ''
    }
  }, [])

  const saveActivePage = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const snapshot = serializeEditorSnapshot(canvas)
    const preview = capturePreview(canvas)
    const imageSource = imageObjectRef.current?.getSrc() || imageSourceRef.current
    setPersistedStateVersion((version) => version + 1)

    if (activeIdRef.current === null) {
      pageOneSnapshotRef.current = snapshot
      pageOneImageSourceRef.current = imageSource
      setPageOnePreview(preview)
      return
    }

    const pageId = activeIdRef.current

    setItems((current) =>
      current.map((page) =>
        page.id === pageId
          ? {
              ...page,
              snapshot,
              preview,
              imageSource,
              imageUrl: imageSource || undefined,
            }
          : page,
      ),
    )
  }, [
    canvasRef,
    serializeEditorSnapshot,
    capturePreview,
    imageObjectRef,
    imageSourceRef,
    setItems,
  ])

  const setPageOrder = useCallback((nextOrder: Array<number | null>) => {
    pageOrderRef.current = nextOrder
    setPageOrderState(nextOrder)
    setPersistedStateVersion((version) => version + 1)
  }, [])

  const reorder = useCallback((
      fromId: number | null,
      toId: number | null,
    ) => {
      if (fromId === toId) return
 
      const currentOrder = pageOrderRef.current
 
      const fromIndex = currentOrder.indexOf(fromId)
      const toIndex = currentOrder.indexOf(toId)
 
      if (fromIndex === -1 || toIndex === -1) return
 
      const nextOrder = [...currentOrder]
      const [movedPage] = nextOrder.splice(fromIndex, 1)
 
      nextOrder.splice(toIndex, 0, movedPage)
 
      setPageOrder(nextOrder)
  }, [setPageOrder])
 

  const createBlankSnapshot = useCallback((source: string): string => {
    const parsed = JSON.parse(source) as SnapshotData

    parsed.scene.objects = []
    delete parsed.scene.backgroundImage
    delete parsed.scene.backgroundColor
    parsed.scene.background = '#ffffff'

    parsed.editor = {
      filterId: 'original',
      filterIntensity: 100,
      backgroundRemoved: false,
      backgroundColor: '#ffffff',
    }

    return JSON.stringify(parsed)
  }, [])

  const getSnapshot = useCallback((pageId: number | null) => {
    if (pageId === null) return pageOneSnapshotRef.current
    return itemsRef.current.find((page) => page.id === pageId)?.snapshot
  }, [])

  const getPersistedState = useCallback((): PersistedEditorPages => ({
    items,
    activeId,
    pageOneSnapshot: pageOneSnapshotRef.current,
    pageOneImageSource: pageOneImageSourceRef.current,
    pageOnePreview,
    pageOrder,
  }), [activeId, items, pageOnePreview, pageOrder])

  const restorePersistedState = useCallback((saved?: PersistedEditorPages) => {
    const restoredItems = Array.isArray(saved?.items)
      ? saved.items.filter((page) => page && Number.isInteger(page.id))
      : []

    const validIds = new Set<number | null>([
      null,
      ...restoredItems.map((page) => page.id),
    ])
 
    const restoredOrder = Array.isArray(saved?.pageOrder)
      ? saved.pageOrder.filter(
          (id): id is number | null => validIds.has(id),
        )
      : [null, ...restoredItems.map((page) => page.id)]
 
    const uniqueOrder = restoredOrder.filter(
      (id, index) => restoredOrder.indexOf(id) === index,
    )
 
    for (const id of validIds) {
      if (!uniqueOrder.includes(id)) {
        uniqueOrder.push(id)
      }
    }
 
    pageOrderRef.current = uniqueOrder
    setPageOrderState(uniqueOrder)
 
    const requestedActiveId = saved?.activeId ?? null
    const restoredActiveId = requestedActiveId === null || restoredItems.some((page) => page.id === requestedActiveId)
      ? requestedActiveId
      : null
    const canvas = canvasRef.current

    setItems(restoredItems)
    setActiveId(restoredActiveId)
    pageOneSnapshotRef.current = saved?.pageOneSnapshot ?? (
      canvas ? serializeEditorSnapshot(canvas) : undefined
    )
    pageOneImageSourceRef.current = saved?.pageOneImageSource ?? (
      imageObjectRef.current?.getSrc() || imageSourceRef.current
    )
    setPageOnePreview(saved?.pageOnePreview ?? (canvas ? capturePreview(canvas) : ''))
  }, [canvasRef, capturePreview, imageObjectRef, imageSourceRef, serializeEditorSnapshot, setActiveId, setItems])

  const select = useCallback(async (pageId: number | null) => {
    if (switching || activeIdRef.current === pageId) return

    const canvas = canvasRef.current
    if (!canvas) return

    if (pageId !== null && !itemsRef.current.some((page) => page.id === pageId)) {
      return
    }

    setSwitching(true)

    try {
      // Save the currently active page before restoring another one.
      saveActivePage()

      const targetPage = pageId === null
        ? undefined
        : itemsRef.current.find((page) => page.id === pageId)

      const storedSnapshot = pageId === null
        ? pageOneSnapshotRef.current
        : targetPage?.snapshot

      const currentSnapshot = serializeEditorSnapshot(canvas)
      const snapshotString = storedSnapshot || createBlankSnapshot(currentSnapshot)
      const parsedSnapshot = JSON.parse(snapshotString) as SnapshotData & {
        editor?: {
          filterId?: string
          filterIntensity?: number
          backgroundRemoved?: boolean
          backgroundColor?: string
        }
      }
      if (
        pageId !== null &&
        !parsedSnapshot.scene.objects?.length &&
        !parsedSnapshot.scene.backgroundImage
      ) {
        parsedSnapshot.scene.background = '#ffffff'
      }

      // Restore the image source before loadFromJSON resolves image tokens.
      imageSourceRef.current = pageId === null
        ? pageOneImageSourceRef.current
        : targetPage?.imageSource || targetPage?.imageUrl || ''

      selectedFilterRef.current = (parsedSnapshot.editor?.filterId || 'original') as typeof selectedFilterRef.current
      filterIntensityRef.current = parsedSnapshot.editor?.filterIntensity ?? 100
      backgroundRemovedRef.current = parsedSnapshot.editor?.backgroundRemoved ?? false
      backgroundColorRef.current = parsedSnapshot.editor?.backgroundColor ?? '#ffffff'

      cropObjectRef.current = null
      cropOriginalSnapshotRef.current = null

      setIsRemovingBackground(false)
      setBackgroundProgress('')
      setBackgroundRemoved(backgroundRemovedRef.current)
      setBackgroundColor(backgroundColorRef.current)
      setSelectedFilter(selectedFilterRef.current)
      setFilterIntensity(filterIntensityRef.current)

      suppressHistoryRef.current = true

      await restoreCanvasSnapshot(parsedSnapshot as EditorSnapshot)

      // Restore the image source after Fabric has loaded the page.
      imageSourceRef.current = imageObjectRef.current?.getSrc() ?? ''

      canvas.discardActiveObject()
      canvas.requestRenderAll()

      setDimensions({
        width: canvas.getWidth(),
        height: canvas.getHeight(),
      })

      syncObjects()
      resizeDisplay()

      // Start a fresh history timeline for the newly selected page.
      suppressHistoryRef.current = false
      initializeHistory(canvas)

      setActiveId(pageId)
    } catch (error) {
      console.error('Unable to switch editor page:', error)
    } finally {
      suppressHistoryRef.current = false
      setSwitching(false)
    }
  }, [
    switching,
    canvasRef,
    saveActivePage,
    serializeEditorSnapshot,
    createBlankSnapshot,
    imageSourceRef,
    selectedFilterRef,
    filterIntensityRef,
    backgroundRemovedRef,
    backgroundColorRef,
    cropObjectRef,
    cropOriginalSnapshotRef,
    setIsRemovingBackground,
    setBackgroundProgress,
    setBackgroundRemoved,
    setBackgroundColor,
    setSelectedFilter,
    setFilterIntensity,
    suppressHistoryRef,
    restoreCanvasSnapshot,
    imageObjectRef,
    setDimensions,
    syncObjects,
    resizeDisplay,
    initializeHistory,
    setActiveId,
  ])

  const replace = useCallback((pageId: number) => {
    actionsRef.current?.replace(pageId)
  }, [])

  const deletePage = useCallback((pageId: number) => {
    actionsRef.current?.delete(pageId)
    }, [])

  const deleteFirstPage = useCallback(async () => {
    const firstPage = itemsRef.current[0]
    if (!firstPage) return false
    await select(firstPage.id)
    if (activeIdRef.current !== firstPage.id) return false
    saveActivePage()
    const promotedPage = itemsRef.current.find(
        (page) => page.id === firstPage.id,
    )
    if (!promotedPage) return false
    pageOneSnapshotRef.current = promotedPage.snapshot
    pageOneImageSourceRef.current = promotedPage.imageSource || promotedPage.imageUrl || ''
    setPageOnePreview(promotedPage.preview || '')
    setItems((current) =>
        current.filter((page) => page.id !== promotedPage.id),
    )
    setActiveId(null)
    return true
  }, [select, saveActivePage, setItems, setActiveId])
 

  const registerActions = useCallback((actions: AddedPageActions | null) => {
    actionsRef.current = actions
  }, [])

  return {
    items,
    setItems,
    activeId,
    setActiveId,
    switching,
    pageOnePreview,
    version: persistedStateVersion,
    saveActivePage,
    getPersistedState,
    restorePersistedState,
    replace,
    delete:deletePage,
    select,
    getSnapshot,
    registerActions,
    deleteFirstPage,
    reorder,
    order: pageOrder,
  }
}