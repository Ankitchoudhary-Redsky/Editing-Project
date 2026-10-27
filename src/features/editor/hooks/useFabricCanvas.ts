import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas } from 'fabric'

export function useFabricCanvas({
  canvasRef,
  recordHistory,
  initializeHistory,
  syncObjects,
  setZoom,
}: {
  canvasRef: MutableRefObject<Canvas | null>
  recordHistory: (immediate?: boolean) => void
  initializeHistory: (canvas: Canvas) => void
  syncObjects: () => void
  setZoom: (zoom: number) => void
}) {
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null)
  const stageElementRef = useRef<HTMLDivElement | null>(null)
  const [fabricCanvas, setFabricCanvas] = useState<Canvas | null>(null)
  const [fitScale, setFitScale] = useState(1)

  const setCanvasElement = useCallback((element: HTMLCanvasElement | null) => {
    canvasElementRef.current = element
  }, [])

  const setStageElement = useCallback((element: HTMLDivElement | null) => {
    stageElementRef.current = element
  }, [])

  useEffect(() => {
    const element = canvasElementRef.current
    if (!element) return

    const canvas = new Canvas(element, {
      width: 1200,
      height: 800,
      preserveObjectStacking: true,
      selection: true,
      backgroundColor: 'rgba(0,0,0,0)',
    })
    canvasRef.current = canvas
    setFabricCanvas(canvas)
    initializeHistory(canvas)

    const changed = () => {
      syncObjects()
      recordHistory()
    }

    canvas.on('selection:created', syncObjects)
    canvas.on('selection:updated', syncObjects)
    canvas.on('selection:cleared', syncObjects)
    canvas.on('object:added', changed)
    canvas.on('object:modified', changed)
    canvas.on('object:removed', changed)
    canvas.on('text:changed', changed)

    const fitCanvas = () => {
      const stage = stageElementRef.current
      if (!stage) return
      const bounds = stage.getBoundingClientRect()
      const scale = Math.min(
        (bounds.width - 96) / canvas.getWidth(),
        (bounds.height - 96) / canvas.getHeight(),
        1.5,
      )
      setFitScale(Math.max(0.08, scale))
    }

    const resizeObserver = new ResizeObserver(fitCanvas)
    canvas.renderAll()
    if (stageElementRef.current) resizeObserver.observe(stageElementRef.current)

    return () => {
      resizeObserver.disconnect()
      void canvas.dispose()
      if (canvasRef.current === canvas) {
        canvasRef.current = null
        setFabricCanvas(null)
      }
    }
  }, [canvasRef, initializeHistory, recordHistory, syncObjects])

  const resizeDisplay = useCallback(() => {
    const canvas = canvasRef.current
    const stage = stageElementRef.current
    if (!canvas || !stage) return
    const bounds = stage.getBoundingClientRect()
    const scale = Math.max(
      0.08,
      Math.min(
        (bounds.width - 96) / canvas.getWidth(),
        (bounds.height - 96) / canvas.getHeight(),
        1.5,
      ),
    )
    setFitScale(scale)
  }, [canvasRef])

  const fitToScreen = () => {
    setZoom(1)
    resizeDisplay()
  }

  return {
    fabricCanvas,
    fitScale,
    setCanvasElement,
    setStageElement,
    resizeDisplay,
    fitToScreen,
  }
}
