import { useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { TrimDrag , UseAudioTrimOptions } from "../../model/types"

export function useAudioTrim({
  sourceDuration,
  busy,
  startTime,
  endTime,
  setStartTime,
  setEndTime,
  stopPreview,
  setError,
}: UseAudioTrimOptions) {
  const [isDraggingTrim, setIsDraggingTrim] = useState(false)
  const waveformRef = useRef<HTMLDivElement | null>(null)
  const trimDragRef = useRef<TrimDrag | null>(null)

  function updateStartTime(value: number) {
    stopPreview()
    setStartTime(Math.max(0, Math.min(value, endTime - 1)))
    setError('')
  }

  function updateEndTime(value: number) {
    stopPreview()
    setEndTime(Math.min(sourceDuration, Math.max(value, startTime + 1)))
    setError('')
  }

  function getTimeFromPointer(clientX: number) {
    const bounds = waveformRef.current?.getBoundingClientRect()
    if (!bounds || !sourceDuration) return 0
    const progress = Math.max(0, Math.min(1, (clientX - bounds.left) / bounds.width))
    return Math.round(progress * sourceDuration)
  }

  function handleTrimPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!sourceDuration || busy) return
    const bounds = waveformRef.current?.getBoundingClientRect()
    if (!bounds) return

    const trimTarget = (event.target as HTMLElement).closest<HTMLElement>('[data-trim-part]')
    let part = trimTarget?.dataset.trimPart as TrimDrag['part'] | undefined
    if (!part) {
      const pointerTime = getTimeFromPointer(event.clientX)
      part = Math.abs(pointerTime - startTime) <= Math.abs(pointerTime - endTime)
        ? 'start'
        : 'end'
    }

    stopPreview()
    setError('')
    trimDragRef.current = {
      pointerId: event.pointerId,
      part,
      startX: event.clientX,
      startTime,
      endTime,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsDraggingTrim(true)
    event.preventDefault()
  }

  function handleTrimPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = trimDragRef.current
    const bounds = waveformRef.current?.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId || !bounds) return

    const delta = ((event.clientX - drag.startX) / bounds.width) * sourceDuration
    if (drag.part === 'move') {
      const duration = drag.endTime - drag.startTime
      const nextStart = Math.max(0, Math.min(sourceDuration - duration, drag.startTime + delta))
      setStartTime(nextStart)
      setEndTime(nextStart + duration)
      return
    }

    const pointerTime = getTimeFromPointer(event.clientX)
    if (drag.part === 'start') {
      setStartTime(Math.max(0, Math.min(pointerTime, endTime - 1)))
    } else {
      setEndTime(Math.min(sourceDuration, Math.max(pointerTime, startTime + 1)))
    }
  }

  function handleTrimPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (trimDragRef.current?.pointerId !== event.pointerId) return
    trimDragRef.current = null
    setIsDraggingTrim(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleTrimKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, part: 'start' | 'end') {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
    event.preventDefault()
    const direction = event.key === 'ArrowRight' ? 1 : -1
    if (part === 'start') updateStartTime(startTime + direction)
    else updateEndTime(endTime + direction)
  }

  return {
    isDraggingTrim,
    waveformRef,
    handleTrimPointerDown,
    handleTrimPointerMove,
    handleTrimPointerUp,
    handleTrimKeyDown,
  }
}
