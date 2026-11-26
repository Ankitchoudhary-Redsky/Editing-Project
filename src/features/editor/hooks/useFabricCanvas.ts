import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import { Canvas, type FabricObject } from 'fabric'
import { RotateCw } from 'lucide-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { EditableThreeDShape,disposeSharedThreeDRenderer } from '../operations/EditableThreeDShape'
import { EditableThreeDEmoji } from '../operations/EditableThreeDEmoji'

const rotationIcon = new Image()
rotationIcon.src =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    renderToStaticMarkup(
      createElement(RotateCw, {
        size: 15,
        color: '#2c7660',
        strokeWidth: 2.2,
      }),
    ),
  )

function renderRotationControl(
  ctx: CanvasRenderingContext2D,
  left: number,
  top: number,
  _styleOverride: unknown,
  fabricObject: FabricObject,
) {
  ctx.save()
  ctx.translate(left, top)
  const canvas = fabricObject.canvas;
  const element = canvas?.upperCanvasEl;
  const width = element?.clientWidth ?? 0;
  const displayScale = width > 0 ? element!.getBoundingClientRect().width / width : 1;
  ctx.scale(1 / Math.max(displayScale, 0.001), 1 / Math.max(displayScale, 0.001));
  // ctx.fillStyle = '#ffffff'
  // ctx.strokeStyle = '#2c7660'
  // ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.arc(0, 0, 11, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = '#2c7660'
  ctx.lineWidth = 1.5
  // ctx.lineCap = 'round'
  // ctx.lineJoin = 'round'
  // ctx.beginPath()
  // ctx.arc(0, 0, 5, -Math.PI * 0.78, Math.PI * 0.55)
  ctx.stroke()
  // const arrowX = Math.cos(Math.PI * 0.55) * 5
  // const arrowY = Math.sin(Math.PI * 0.55) * 5
  // ctx.beginPath()
  // ctx.moveTo(arrowX, arrowY)
  // ctx.lineTo(arrowX - 3.2, arrowY - 0.4)
  // ctx.moveTo(arrowX, arrowY)
  // ctx.lineTo(arrowX - 0.4, arrowY - 3.2)
  // ctx.stroke()
  if (rotationIcon.complete && rotationIcon.naturalWidth > 0) {
    ctx.drawImage(rotationIcon, -7.5, -7.5, 15, 15)
  }
  ctx.restore()
}
 

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
  }, [],)

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
      canvas.upperCanvasEl.draggable = false
      canvasRef.current = canvas
      setFabricCanvas(canvas)
      callbacksRef.current.initializeHistory(canvas)

      const changed = () => {
        const callbacks = callbacksRef.current
        callbacks.onUserEdit?.()
        if (callbacks.shouldSyncObjects?.() !== false){
        callbacks.syncObjects()
      }
        callbacks.recordHistory()
      }
      const objectAdded = (event: { target?: FabricObject }) => {
        const rotationControl = event.target?.controls?.mtr
        if (rotationControl) {
          rotationControl.render = renderRotationControl
          rotationControl.cursorStyle = `url("${rotationIcon.src}") 7.5 7.5, pointer`
        }
        changed()
      }
      const selectionChanged = () => {
      callbacksRef.current.syncSelection()
      }
  const userInteracted = () => {
    callbacksRef.current.onUserInteraction?.()
  }
      const releaseThreeDObject = (event: { target?: FabricObject }) => {
        if (event.target instanceof EditableThreeDShape){ event.target.releaseThreeDResources()}
        if (event.target instanceof EditableThreeDEmoji){ event.target.releaseThreeDResources()}
      }

      canvas.on('mouse:down', userInteracted)
      canvas.on('object:removed', releaseThreeDObject)
      canvas.on('selection:created', selectionChanged)
      canvas.on('selection:updated', selectionChanged)
      canvas.on('selection:cleared', selectionChanged)
      canvas.on('object:added', objectAdded)
      canvas.on('object:modified', changed)
      canvas.on('object:removed', changed)
      canvas.on('text:changed', changed)

      detachListeners = () => {
        canvas?.off('mouse:down', userInteracted)
        canvas?.off('object:removed', releaseThreeDObject)
        canvas?.off('selection:created', selectionChanged)
        canvas?.off('selection:updated', selectionChanged)
        canvas?.off('selection:cleared', selectionChanged)
        canvas?.off('object:added', objectAdded)
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
      if (stageElementRef.current){ resizeObserver.observe(stageElementRef.current) }

      if (cancelled) {
        resizeObserver.disconnect()
        detachListeners()
        canvas.getObjects().forEach((object) => {
          if (object instanceof EditableThreeDShape){ object.releaseThreeDResources() }
          if (object instanceof EditableThreeDEmoji){ object.releaseThreeDResources() }
        })
        disposeSharedThreeDRenderer()
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
      activeCanvas.getObjects().forEach((object) => {
        if (object instanceof EditableThreeDShape){ object.releaseThreeDResources() }
        if (object instanceof EditableThreeDEmoji){ object.releaseThreeDResources() }
      })
      disposeSharedThreeDRenderer()
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
    setFitScale((currentScale) => currentScale === nextScale ? currentScale : nextScale,)
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
