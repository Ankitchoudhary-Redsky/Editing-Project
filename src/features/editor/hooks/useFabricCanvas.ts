import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas } from 'fabric'

function calculateFitScale(canvas: Canvas, stage: HTMLDivElement) {
  const bounds = stage.getBoundingClientRect()
  return Math.max(
    0.08,
    Math.min(
      (bounds.width - 96) / canvas.getWidth(),
      (bounds.height - 96) / canvas.getHeight(),
      1.5,
    ),
  )
}

export function useFabricCanvas({
  canvasRef,
  recordHistory,
  initializeHistory,
  syncObjects,
  syncSelection,
  setZoom,
  onUserEdit,
  onUserInteraction,
  shouldSyncObjects,
}: {
  canvasRef: MutableRefObject<Canvas | null>
  recordHistory: (immediate?: boolean) => void
  initializeHistory: (canvas: Canvas) => void
  syncObjects: () => void
  syncSelection: () => void
  setZoom: (zoom: number) => void
  onUserEdit?: () => void
  onUserInteraction?: () => void
  shouldSyncObjects?: () => boolean
}) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const stageElementRef = useRef<HTMLDivElement | null>(null)
  const disposePromiseRef = useRef<Promise<boolean> | null>(null)
  const callbacksRef = useRef({ recordHistory, initializeHistory, syncObjects, syncSelection, onUserEdit, onUserInteraction, shouldSyncObjects })
  const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null)
  const [fitScale, setFitScale] = useState(1)

  const setCanvasElement = useCallback((element: HTMLCanvasElement | null) => {
    canvasElementRef.current = element
  }, [])

  const setStageElement = useCallback((element: HTMLDivElement | null) => {
    stageElementRef.current = element
  }, [])

  useEffect(() => {
    callbacksRef.current = { recordHistory, initializeHistory, syncObjects, syncSelection, onUserEdit, onUserInteraction, shouldSyncObjects }
  }, [initializeHistory, onUserEdit, onUserInteraction, recordHistory, shouldSyncObjects, syncObjects, syncSelection])

  useEffect(() => {
    let cancelled = false
    let canvas: Canvas | null = null
    let resizeObserver: ResizeObserver | null = null
    let detachListeners: (() => void) | null = null

    const initialize = async () => {
      if (disposePromiseRef.current) await disposePromiseRef.current
      if (cancelled) return
      const element = canvasElementRef.current
      if (!element) return

      canvas = new Canvas(element, {
        width: 1200,
        height: 800,
        preserveObjectStacking: true,
        selection: true,
        backgroundColor: 'rgba(0,0,0,0)',
      })
      canvasRef.current = canvas
      setFabricCanvas(canvas)
      callbacksRef.current.initializeHistory(canvas)

      const changed = () => {
        const callbacks = callbacksRef.current
        callbacks.onUserEdit?.()
        if (callbacks.shouldSyncObjects?.() !== false) callbacks.syncObjects()
        callbacks.recordHistory()
      }
      const selectionChanged = () => callbacksRef.current.syncSelection()
  const userInteracted = () => callbacksRef.current.onUserInteraction?.()

  canvas.on('mouse:down', userInteracted)
      canvas.on('selection:created', selectionChanged)
      canvas.on('selection:updated', selectionChanged)
      canvas.on('selection:cleared', selectionChanged)
      canvas.on('object:added', changed)
      canvas.on('object:modified', changed)
      canvas.on('object:removed', changed)
      canvas.on('text:changed', changed)
      detachListeners = () => {
        canvas?.off('mouse:down', userInteracted)
        canvas?.off('selection:created', selectionChanged)
        canvas?.off('selection:updated', selectionChanged)
        canvas?.off('selection:cleared', selectionChanged)
        canvas?.off('object:added', changed)
        canvas?.off('object:modified', changed)
        canvas?.off('object:removed', changed)
        canvas?.off('text:changed', changed)
      }

      const fitCanvas = () => {
        const stage = stageElementRef.current
        if (!stage || !canvas) return
        const nextScale = calculateFitScale(canvas, stage)
        setFitScale((currentScale) => currentScale === nextScale ? currentScale : nextScale)
      }

      resizeObserver = new ResizeObserver(fitCanvas)
      canvas.renderAll()
      fitCanvas()
      if (stageElementRef.current) resizeObserver.observe(stageElementRef.current)

      if (cancelled) {
        resizeObserver.disconnect()
        detachListeners()
        disposePromiseRef.current = Promise.resolve(canvas.dispose())
        await disposePromiseRef.current
      }
    }

    void initialize()

    return () => {
      cancelled = true
      resizeObserver?.disconnect()
      if (!canvas) return
      const activeCanvas = canvas
      detachListeners?.()
      if (canvasRef.current === activeCanvas) {
        canvasRef.current = null
        setFabricCanvas(null)
      }
      disposePromiseRef.current = Promise.resolve(activeCanvas.dispose())
    }
  }, [canvasRef])

  const resizeDisplay = useCallback(() => {
    const canvas = canvasRef.current
    const stage = stageElementRef.current
    if (!canvas || !stage) return
    const nextScale = calculateFitScale(canvas, stage)
    setFitScale((currentScale) => currentScale === nextScale ? currentScale : nextScale)
  }, [canvasRef])

  const fitToScreen = useCallback(() => {
    setZoom(1)
    resizeDisplay()
  }, [resizeDisplay, setZoom])

  return {
    fabricCanvas,
    fitScale,
    setCanvasElement,
    setStageElement,
    resizeDisplay,
    fitToScreen,
  }
}
