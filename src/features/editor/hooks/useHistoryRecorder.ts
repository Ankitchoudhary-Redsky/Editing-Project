import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import type { Canvas } from 'fabric'

export function useHistoryRecorder({
  canvasRef,
  suppressHistoryRef,
  serializeSnapshot,
  syncObjects,
}: {
  canvasRef: MutableRefObject<Canvas | null>
  suppressHistoryRef: MutableRefObject<boolean>
  serializeSnapshot: (canvas: Canvas) => string
  syncObjects: () => void
}) {
  const historyRef = useRef<string[]>([])
  const historyIndexRef = useRef(-1)
  const historyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [historyVersion, setHistoryVersion] = useState(0)

  const syncHistoryControls = useCallback(() => {
    setCanUndo(historyIndexRef.current > 0)
    setCanRedo(historyIndexRef.current < historyRef.current.length - 1)
  }, [])

  const recordHistory = useCallback((immediate = false) => {
    const canvas = canvasRef.current
    if (!canvas || suppressHistoryRef.current) return
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current)

    const saveSnapshot = () => {
      historyTimerRef.current = null
      if (canvasRef.current !== canvas) return
      const current = serializeSnapshot(canvas)
      const history = historyRef.current.slice(0, historyIndexRef.current + 1)
      if (history.at(-1) === current) return
      history.push(current)
      if (history.length > 60) history.shift()
      historyRef.current = history
      historyIndexRef.current = history.length - 1
      syncHistoryControls()
      setHistoryVersion((value) => value + 1)
      syncObjects()
    }

    if (immediate) saveSnapshot()
    else historyTimerRef.current = setTimeout(saveSnapshot, 220)
  }, [canvasRef, serializeSnapshot, suppressHistoryRef, syncHistoryControls, syncObjects])

  const initialize = useCallback((canvas: Canvas) => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current)
    historyTimerRef.current = null
    historyRef.current = [serializeSnapshot(canvas)]
    historyIndexRef.current = 0
    syncHistoryControls()
    setHistoryVersion((value) => value + 1)
  }, [serializeSnapshot, syncHistoryControls])

  const touch = useCallback(() => {
    setHistoryVersion((value) => value + 1)
  }, [])

  useEffect(() => () => {
    if (historyTimerRef.current) clearTimeout(historyTimerRef.current)
  }, [])

  return {
    historyRef,
    historyIndexRef,
    historyTimerRef,
    canUndo,
    canRedo,
    historyVersion,
    recordHistory,
    initialize,
    syncHistoryControls,
    touch,
  }
}
