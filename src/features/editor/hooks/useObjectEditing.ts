import { useCallback, useEffect } from 'react'
import { IText, Shadow, type FabricObject } from 'fabric'
import type { TextProperty, UseObjectEditingOptions } from '../model/types'
import { shapeNames } from '../model/constants'
import { objectName } from '../model/objectName'
import { constrainShapeToImage, createShapeObject, isShapeObject } from '../operations/shapeObjects'
import { createTextObject } from '../operations/textObjects'

export function useObjectEditing({
  canvas,
  canvasRef,
  imageObjectRef,
  cropObjectRef,
  selectedObject,
  selectedIsImage,
  cropActive,
  textValue,
  fontFamily,
  fontSize,
  textColor,
  textOpacity,
  textOutline,
  textOutlineWidth,
  textShadow,
  shapeKind,
  fillColor,
  transparentFill,
  strokeColor,
  strokeWidth,
  shapeOpacity,
  setActiveTool,
  setTextValue,
  recordHistory,
}: UseObjectEditingOptions) {
  useEffect(() => {
    if (!canvas) return
    const constrainShape = (event: { target?: FabricObject }) => {
      const target = event.target
      if (target && isShapeObject(target)) {
        constrainShapeToImage(canvas, imageObjectRef.current, target)
      }
    }
    canvas.on('object:moving', constrainShape)
    canvas.on('object:scaling', constrainShape)
    canvas.on('object:rotating', constrainShape)
    return () => {
      canvas.off('object:moving', constrainShape)
      canvas.off('object:scaling', constrainShape)
      canvas.off('object:rotating', constrainShape)
    }
  }, [canvas, imageObjectRef])

  const selectedIsShape = Boolean(
    selectedObject && !selectedIsImage && !(selectedObject instanceof IText) && !cropActive,
  )

  const createText = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    createTextObject(canvas, {
      value: textValue,
      fontFamily,
      fontSize,
      color: textColor,
      opacity: textOpacity,
      outline: textOutline,
      outlineWidth: textOutlineWidth,
      shadow: textShadow,
    })
    recordHistory(true)
    setActiveTool('text')
  }

  const addShape = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    createShapeObject(canvas, {
      kind: shapeKind,
      fill: fillColor,
      transparentFill,
      stroke: strokeColor,
      strokeWidth,
      opacity: shapeOpacity,
      name: shapeNames[shapeKind],
    })
    recordHistory(true)
  }

  const updateText = (property: TextProperty, value: string | number) => {
    const active = canvasRef.current?.getActiveObject()
    if (!(active instanceof IText)) return
    if (property === 'shadow') {
      const shadow = value === 'none'
        ? null
        : new Shadow({
          color: 'rgba(12, 20, 17, 0.48)',
          blur: value === 'soft' ? 12 : 3,
          offsetX: 2,
          offsetY: value === 'soft' ? 5 : 3,
        })
      active.set('shadow', shadow)
    } else {
      active.set(property, value)
    }
    active.setCoords()
    canvasRef.current?.requestRenderAll()
    recordHistory()
    if (property === 'text') setTextValue(String(value))
  }

  const deleteSelected = useCallback(() => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()
    if (!canvas || !active) return
    if (active === imageObjectRef.current) imageObjectRef.current = null
    canvas.remove(active)
    canvas.discardActiveObject()
    canvas.requestRenderAll()
    recordHistory(true)
  }, [canvasRef, imageObjectRef, recordHistory])

  const duplicateSelected = async () => {
    const canvas = canvasRef.current
    const active = canvas?.getActiveObject()
    if (!canvas || !active) return
    const clone = await active.clone()
    clone.set({ left: (active.left ?? 0) + 24, top: (active.top ?? 0) + 24 })
    clone.set('name', `${objectName(active, 0)} copy`)
    constrainShapeToImage(canvas, imageObjectRef.current, clone)
    canvas.add(clone)
    canvas.setActiveObject(clone)
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const selectLayer = (object: FabricObject) => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.setActiveObject(object)
    canvas.requestRenderAll()
  }

  const moveLayer = (object: FabricObject, direction: 'forward' | 'backward') => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (direction === 'forward') canvas.bringObjectForward(object)
    else if (object !== imageObjectRef.current) canvas.sendObjectBackwards(object)
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const updateShapeAppearance = (
    property: 'fill' | 'stroke' | 'strokeWidth' | 'opacity',
    value: string | number,
  ) => {
    if (!selectedObject || selectedIsImage || selectedObject instanceof IText || selectedObject === cropObjectRef.current) return
    selectedObject.set(property, value)
    canvasRef.current?.requestRenderAll()
    recordHistory()
  }

  return {
    selectedIsShape,
    createText,
    addShape,
    updateText,
    deleteSelected,
    duplicateSelected,
    selectLayer,
    moveLayer,
    updateShapeAppearance,
  }
}
