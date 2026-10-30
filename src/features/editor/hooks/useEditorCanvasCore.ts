import { useCallback, useEffect, useRef } from 'react'
import { Canvas, FabricImage, Rect, type FabricObject } from 'fabric'
import type { FilterId, EditorTool, UseEditorCanvasCoreOptions } from '../model/types'
import { BACKGROUND_IMAGE_NAME, serializeCanvas } from '../model/constants'
import { useFabricCanvas } from './useFabricCanvas'
import { useHistoryRecorder } from './useHistoryRecorder'

export function useEditorCanvasCore({
  activeTool,
  setZoom,
  setHasDocument,
  setHasImage,
  setSelectedObject,
  setObjects,
  setSelectedIsImage,
  setImageThumbnail,
  setCropRotation,
}: UseEditorCanvasCoreOptions) {
  const canvasRef = useRef<Canvas | null>(null)
  const suppressHistoryRef = useRef(false)
  const cropObjectRef = useRef<Rect | null>(null)
  const cropOriginalSnapshotRef = useRef<string | null>(null)
  const imageObjectRef = useRef<FabricImage | null>(null)
  const imageSourceRef = useRef('')
  const selectedFilterRef = useRef<FilterId>('original')
  const filterIntensityRef = useRef(100)
  const backgroundRemovedRef = useRef(false)
  const backgroundColorRef = useRef('#ffffff')
  const activeToolRef = useRef<EditorTool>('upload')
  const userEditedBeforeDraftLoadRef = useRef(false)
  const syncedObjectsRef = useRef<FabricObject[]>([])

  const markUserEditedBeforeDraftLoad = useCallback(() => {
    if (!suppressHistoryRef.current) userEditedBeforeDraftLoadRef.current = true
  }, [])
  const markUserInteractionBeforeDraftLoad = useCallback(() => {
    userEditedBeforeDraftLoadRef.current = true
  }, [])
  const shouldSyncCanvasObjects = useCallback(() => !suppressHistoryRef.current, [])

  const syncSelection = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const active = canvas.getActiveObject() ?? null
    setSelectedObject(active)
    setSelectedIsImage(active === imageObjectRef.current)
  }, [setSelectedIsImage, setSelectedObject])

  const syncObjects = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const currentObjects = canvas.getObjects()
    const image = currentObjects.find(
      (item) => item instanceof FabricImage && item.get('name') !== BACKGROUND_IMAGE_NAME,
    )
    if (image && (
      image.selectable || image.evented || !image.lockMovementX || !image.lockMovementY ||
      !image.lockScalingX || !image.lockScalingY || !image.lockRotation
    )) {
      image.set({
        selectable: false,
        evented: false,
        lockMovementX: true,
        lockMovementY: true,
        lockScalingX: true,
        lockScalingY: true,
        lockRotation: true,
      })
    }
    const imageObject = image instanceof FabricImage ? image : null
    if (imageObjectRef.current !== imageObject) imageObjectRef.current = imageObject
    setCropRotation(image instanceof FabricImage ? Math.round(image.angle || 0) : 0)
    setHasImage(Boolean(image))
    setHasDocument(Boolean(image))
    if (!(image instanceof FabricImage)) setImageThumbnail('')
    const visibleObjects = currentObjects.filter((item) => item !== cropObjectRef.current)
    const previousObjects = syncedObjectsRef.current
    if (
      visibleObjects.length !== previousObjects.length ||
      visibleObjects.some((item, index) => item !== previousObjects[index])
    ) {
      syncedObjectsRef.current = visibleObjects
      setObjects(visibleObjects)
    }

    syncSelection()
  }, [setCropRotation, setHasDocument, setHasImage, setImageThumbnail, setObjects, syncSelection])

  const serializeEditorSnapshot = useCallback((canvas: Canvas) => {
    const base = serializeCanvas(canvas)
    return JSON.stringify({
      ...base,
      editor: {
        filterId: selectedFilterRef.current,
        filterIntensity: filterIntensityRef.current,
        backgroundRemoved: backgroundRemovedRef.current,
        backgroundColor: backgroundColorRef.current,
      },
    })
  }, [])

  const history = useHistoryRecorder({
    canvasRef,
    suppressHistoryRef,
    serializeSnapshot: serializeEditorSnapshot,
    syncObjects,
  })
  const fabric = useFabricCanvas({
    canvasRef,
    recordHistory: history.recordHistory,
    initializeHistory: history.initialize,
    syncObjects,
    syncSelection,
    setZoom,
    onUserEdit: markUserEditedBeforeDraftLoad,
    onUserInteraction: markUserInteractionBeforeDraftLoad,
    shouldSyncObjects: shouldSyncCanvasObjects,
  })

  useEffect(() => {
    activeToolRef.current = activeTool
  }, [activeTool])

  return {
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
    activeToolRef,
    userEditedBeforeDraftLoadRef,
      markUserInteractionBeforeDraftLoad,
    serializeEditorSnapshot,
    syncObjects,
    syncSelection,
    history,
    fabric,
  }
}