import { useEffect, useRef, useState } from 'react'
import { IText, Shadow, type Canvas, type FabricObject } from 'fabric'
import type { TextAnimation } from '../model/types'

type AnimationBase = {
  left: number
  top: number
  opacity: number
  scaleX: number
  scaleY: number
  angle: number
  shadow: FabricObject['shadow']
  text?: string
}

export function useTextAnimation({
  canvas,
  selectedObject,
  selectedIsImage,
  historyVersion,
  recordHistory,
}: {
  canvas: Canvas | null
  selectedObject: FabricObject | null
  selectedIsImage: boolean
  historyVersion: number
  recordHistory: (immediate?: boolean) => void
}) {
  const [animationVersion, setAnimationVersion] = useState(0)
  const startTimesRef = useRef(new WeakMap<FabricObject, number>())

  useEffect(() => {
    if (!canvas) return
    const baseValues = new WeakMap<FabricObject, AnimationBase>()
    let frameId = 0

    const renderAnimatedObjects = (time: number) => {
      const animatedObjects: Array<{ object: FabricObject; base: AnimationBase }> = []
      let shouldContinue = false

      for (const object of canvas.getObjects()) {
        const animation = object.get('textAnimation') as TextAnimation | undefined
        if (!animation || animation === 'none') continue

        let base = baseValues.get(object)
        if (!base) {
          base = {
            left: object.left ?? 0,
            top: object.top ?? 0,
            opacity: object.opacity,
            scaleX: object.scaleX,
            scaleY: object.scaleY,
            angle: object.angle,
            shadow: object.shadow,
            text: object instanceof IText ? object.text : undefined,
          }
          baseValues.set(object, base)
        } else if (
          object.left !== base.left ||
          object.top !== base.top ||
          object.opacity !== base.opacity ||
          object.scaleX !== base.scaleX ||
          object.scaleY !== base.scaleY ||
          object.angle !== base.angle ||
          object.shadow !== base.shadow ||
          (object instanceof IText && object.text !== base.text)
        ) {
          base = {
            left: object.left ?? 0,
            top: object.top ?? 0,
            opacity: object.opacity,
            scaleX: object.scaleX,
            scaleY: object.scaleY,
            angle: object.angle,
            shadow: object.shadow,
            text: object instanceof IText ? object.text : undefined,
          }
          baseValues.set(object, base)
        }

        const startTime = startTimesRef.current.get(object) ?? time
        startTimesRef.current.set(object, startTime)
        const elapsed = Math.max(0, time - startTime)
        const isLooping = ['fade', 'pulse', 'bounce', 'breathe', 'drift', 'tectonic', 'neon'].includes(animation)
        const isEntrance = ['from-top', 'from-bottom', 'from-left', 'from-right', 'pop', 'wipe', 'blur', 'succession', 'baseline', 'tumble', 'scrapbook', 'stomp'].includes(animation)
        const duration = animation === 'typewriter' && object instanceof IText
          ? Math.max(500, Math.min(1800, Array.from(base.text ?? '').length * 45))
          : isEntrance ? 1100 : 850
        const progress = Math.min(1, elapsed / duration)
        const effectProgress = animation === 'succession' ? Math.min(1, Math.max(0, elapsed - 140) / duration) : progress
        const easedProgress = 1 - Math.pow(1 - effectProgress, 4)
        const phase = time / 1000

        if (animation === 'fade') {
          object.set('opacity', base.opacity * (0.7 + Math.sin(phase * 2.4) * 0.3))
        } else if (animation === 'pulse') {
          const scale = 1 + Math.sin(phase * 3.2) * 0.06
          object.set({ scaleX: base.scaleX * scale, scaleY: base.scaleY * scale })
        } else if (animation === 'bounce') {
          object.set('top', base.top - (1 - Math.cos(phase * 3.2)) * 8)
        } else if (animation === 'breathe') {
          const scale = 1 + Math.sin(phase * 2.4) * 0.045
          object.set({ scaleX: base.scaleX * scale, scaleY: base.scaleY * scale })
        } else if (animation === 'drift') {
          object.set('left', base.left + Math.sin(phase * 1.8) * 10)
        } else if (animation === 'tectonic') {
          object.set('angle', base.angle + Math.sin(phase * 18) * 2.5)
        } else if (animation === 'neon') {
          const glow = 8 + (Math.sin(phase * 4) + 1) * 8
          object.set({ opacity: base.opacity * (0.82 + Math.sin(phase * 4) * 0.18), shadow: new Shadow({ color: '#b04dff', blur: glow, offsetX: 0, offsetY: 0 }) })
        } else if (animation === 'typewriter' && object instanceof IText) {
          const characters = Array.from(base.text ?? object.text)
          object.set('text', characters.slice(0, Math.ceil(characters.length * easedProgress)).join(''))
        } else if (animation === 'pop' || animation === 'succession') {
          const scale = 0.35 + easedProgress * 0.65
          object.set({ scaleX: base.scaleX * scale, scaleY: base.scaleY * scale, opacity: base.opacity * Math.min(1, effectProgress * 2) })
        } else if (animation === 'wipe') {
          object.set({ scaleX: base.scaleX * Math.max(0.02, easedProgress), opacity: base.opacity * Math.min(1, effectProgress * 2) })
        } else if (animation === 'blur') {
          object.set({ opacity: base.opacity * easedProgress, shadow: new Shadow({ color: 'rgba(36, 45, 59, .25)', blur: (1 - easedProgress) * 18, offsetX: 0, offsetY: 0 }) })
        } else if (animation === 'baseline') {
          object.set({ top: base.top + 14 * (1 - easedProgress), opacity: base.opacity * Math.min(1, effectProgress * 2) })
        } else if (animation === 'tumble') {
          object.set({ angle: base.angle + 360 * easedProgress, opacity: base.opacity * Math.min(1, effectProgress * 2) })
        } else if (animation === 'scrapbook') {
          object.set({ angle: base.angle + 8 * Math.sin(easedProgress * Math.PI), scaleX: base.scaleX * (0.84 + easedProgress * 0.16), scaleY: base.scaleY * (0.84 + easedProgress * 0.16), opacity: base.opacity * Math.min(1, effectProgress * 2) })
        } else if (animation === 'stomp') {
          const scale = 1 + Math.sin(effectProgress * Math.PI * 3) * (1 - effectProgress) * 0.35
          object.set({ scaleX: base.scaleX * scale, scaleY: base.scaleY * scale, opacity: base.opacity * Math.min(1, effectProgress * 3) })
        } else {
          const bounds = object.getBoundingRect()
          const margin = Math.max(24, Math.min(canvas.getWidth(), canvas.getHeight()) * 0.03)
          let offsetX = 0
          let offsetY = 0
          if (animation === 'from-top') offsetY = -bounds.top - bounds.height - margin
          if (animation === 'from-bottom') offsetY = canvas.getHeight() - bounds.top + margin
          if (animation === 'from-left') offsetX = -bounds.left - bounds.width - margin
          if (animation === 'from-right') offsetX = canvas.getWidth() - bounds.left + margin
          object.set({
            left: base.left + offsetX * (1 - easedProgress),
            top: base.top + offsetY * (1 - easedProgress),
            opacity: base.opacity * Math.min(1, progress * 2.2),
          })
        }

        shouldContinue ||= isLooping || progress < 1
        animatedObjects.push({ object, base })
      }

      if (!animatedObjects.length) return
      try {
        canvas.renderAll()
      } finally {
        for (const { object, base } of animatedObjects) {
          object.set({
            left: base.left,
            top: base.top,
            opacity: base.opacity,
            scaleX: base.scaleX,
            scaleY: base.scaleY,
            angle: base.angle,
            shadow: base.shadow,
            ...(object instanceof IText && base.text !== undefined ? { text: base.text } : {}),
          })
        }
      }

      if (shouldContinue) frameId = requestAnimationFrame(renderAnimatedObjects)
    }

    frameId = requestAnimationFrame(renderAnimatedObjects)
    return () => cancelAnimationFrame(frameId)
  }, [animationVersion, canvas, historyVersion])

  const apply = (animation: TextAnimation) => {
    if (!canvas || !selectedObject || selectedIsImage) return
    selectedObject.set('textAnimation', animation)
    startTimesRef.current.set(selectedObject, performance.now())
    setAnimationVersion((version) => version + 1)
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const remove = () => {
    if (!canvas || !selectedObject) return
    selectedObject.set('textAnimation', 'none')
    startTimesRef.current.delete(selectedObject)
    setAnimationVersion((version) => version + 1)
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const clear = () => {
    if (!canvas) return
    for (const object of canvas.getObjects()) object.set('textAnimation', 'none')
    startTimesRef.current = new WeakMap<FabricObject, number>()
    setAnimationVersion((version) => version + 1)
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const restart = () => {
    if (!canvas) return
    const startTime = performance.now()
    for (const object of canvas.getObjects()) {
      if (object.get('textAnimation') && object.get('textAnimation') !== 'none') {
        startTimesRef.current.set(object, startTime)
      }
    }
    setAnimationVersion((version) => version + 1)
  }

  return {
    selected: String(selectedObject?.get('textAnimation') ?? 'none') as TextAnimation,
    hasAnimations: Boolean(canvas?.getObjects().some((object) => String(object.get('textAnimation') ?? 'none') !== 'none')),
    apply,
    remove,
    clear,
    restart,
  }
}
