import { useCallback, useRef, useState } from 'react'
import { Canvas, FabricImage, Rect } from 'fabric'
import type { MutableRefObject } from 'react'
import type { EditorTool } from '../model/types'
import { applyCanvasCrop, createCropFrame, updateCropRatio } from '../operations/cropCanvas'

type UseCanvasTransformsOptions = {
  canvasRef: MutableRefObject<Canvas | null>
  imageObjectRef: MutableRefObject<FabricImage | null>
  cropObjectRef: MutableRefObject<Rect | null>
  hasDocument: boolean
  dimensions: { width: number; height: number }
  setDimensions: (dimensions: { width: number; height: number }) => void
  cropActive: boolean
  cropRotation: number
  setCropActive: (active: boolean) => void
  setCropRotation: (rotation: number) => void
  setActiveTool: (tool: EditorTool) => void
  suppressHistoryRef: MutableRefObject<boolean>
  recordHistory: (immediate?: boolean) => void
  syncObjects: () => void
  resizeDisplay: () => void
}

export function useCanvasTransforms({
  canvasRef,
  imageObjectRef,
  cropObjectRef,
  hasDocument,
  dimensions,
  setDimensions,
  cropActive,
  cropRotation,
  setCropActive,
  setCropRotation,
  setActiveTool,
  suppressHistoryRef,
  recordHistory,
  syncObjects,
  resizeDisplay,
}: UseCanvasTransformsOptions) {
  const [cropRatio, setCropRatio] = useState('Free')
  const [resizeWidth, setResizeWidth] = useState(1200)
  const [resizeHeight, setResizeHeight] = useState(800)
  const [keepRatio, setKeepRatio] = useState(true)
  const [scaleArtwork, setScaleArtwork] = useState(true)
  const cropTransformChangedRef = useRef(false)

  const beginCrop = () => {
    const canvas = canvasRef.current
    if (!canvas || !hasDocument || cropObjectRef.current) return
    const cropFrame = createCropFrame(canvas)
    cropTransformChangedRef.current = false
    cropObjectRef.current = cropFrame
    setCropActive(true)
    suppressHistoryRef.current = true
    canvas.add(cropFrame)
    suppressHistoryRef.current = false
    canvas.setActiveObject(cropFrame)
    canvas.requestRenderAll()
    setActiveTool('crop')
  }

  const changeCropRatio = (ratioName: string) => {
    setCropRatio(ratioName)
    const cropFrame = cropObjectRef.current
    const canvas = canvasRef.current
    if (!cropFrame || !canvas) return
    updateCropRatio(canvas, cropFrame, ratioName)
  }

  const flipImage = (axis: 'horizontal' | 'vertical') => {
    const image = imageObjectRef.current
    const canvas = canvasRef.current
    if (!image || !canvas) return
    const property = axis === 'horizontal' ? 'flipX' : 'flipY'
    image.set(property, !image[property])
    image.setCoords()
    canvas.requestRenderAll()
    cropTransformChangedRef.current = true
  }

  const setImageRotation = (angle: number) => {
    const image = imageObjectRef.current
    const canvas = canvasRef.current
    if (!image || !canvas) return
    const nextAngle = Math.max(-180, Math.min(180, Math.round(angle)))
    const center = image.getCenterPoint()
    image.set('angle', nextAngle)
    image.setPositionByOrigin(center, 'center', 'center')
    image.setCoords()
    setCropRotation(nextAngle)
    canvas.requestRenderAll()
    cropTransformChangedRef.current = true
  }

  const applyCrop = () => {
    const canvas = canvasRef.current
    const cropFrame = cropObjectRef.current
    if (!canvas || !cropFrame) return
    suppressHistoryRef.current = true
    const cropDimensions = applyCanvasCrop(canvas, cropFrame, imageObjectRef.current)
    if (!cropDimensions) {
      suppressHistoryRef.current = false
      return
    }
    cropObjectRef.current = null
    setCropActive(false)
    setDimensions(cropDimensions)
    setActiveTool('select')
    suppressHistoryRef.current = false
    cropTransformChangedRef.current = false
    recordHistory(true)
    syncObjects()
    resizeDisplay()
  }

  const cancelCrop = useCallback((nextTool: EditorTool = 'select') => {
    const canvas = canvasRef.current
    const cropFrame = cropObjectRef.current
    if (!canvas || !cropFrame) {
      setActiveTool(nextTool)
      return
    }
    suppressHistoryRef.current = true
    canvas.remove(cropFrame)
    cropObjectRef.current = null
    setCropActive(false)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    suppressHistoryRef.current = false
    setActiveTool(nextTool)
    if (cropTransformChangedRef.current) recordHistory(true)
    cropTransformChangedRef.current = false
  }, [canvasRef, cropObjectRef, recordHistory, setActiveTool, setCropActive, suppressHistoryRef])

  const applyResize = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = Math.min(12000, Math.max(1, Math.round(resizeWidth)))
    const height = Math.min(12000, Math.max(1, Math.round(resizeHeight)))
    const scaleX = width / canvas.getWidth()
    const scaleY = height / canvas.getHeight()
    if (scaleArtwork) {
      canvas.getObjects().forEach((object) => {
        object.set({ left: (object.left ?? 0) * scaleX, top: (object.top ?? 0) * scaleY, scaleX: (object.scaleX ?? 1) * scaleX, scaleY: (object.scaleY ?? 1) * scaleY })
        object.setCoords()
      })
    }
    canvas.setDimensions({ width, height })
    canvas.requestRenderAll()
    setDimensions({ width, height })
    setResizeWidth(width)
    setResizeHeight(height)
    recordHistory(true)
    resizeDisplay()
  }

  const updateResizeWidth = (value: number) => {
    setResizeWidth(value)
    if (keepRatio && dimensions.width) setResizeHeight(Math.round(value * dimensions.height / dimensions.width))
  }

  const updateResizeHeight = (value: number) => {
    setResizeHeight(value)
    if (keepRatio && dimensions.height) setResizeWidth(Math.round(value * dimensions.width / dimensions.height))
  }

  return {
    crop: {
      active: cropActive,
      ratio: cropRatio,
      rotation: cropRotation,
      setRatio: setCropRatio,
      changeRatio: changeCropRatio,
      flipHorizontal: () => flipImage('horizontal'),
      flipVertical: () => flipImage('vertical'),
      setRotation: setImageRotation,
      apply: applyCrop,
      cancel: cancelCrop,
      begin: beginCrop,
    },
    resize: {
      width: resizeWidth,
      height: resizeHeight,
      setWidth: updateResizeWidth,
      setHeight: updateResizeHeight,
      keepRatio,
      setKeepRatio,
      scaleArtwork,
      setScaleArtwork,
      apply: applyResize,
    },
    cancelCrop,
  }
}
