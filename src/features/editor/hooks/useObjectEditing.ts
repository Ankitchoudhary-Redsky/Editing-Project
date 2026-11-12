import { useCallback, useEffect } from 'react'
import { FabricImage, IText, Shadow, type FabricObject } from 'fabric'
import type { TextDesignOptions, TextProperty, UseObjectEditingOptions } from '../model/types'
import { BACKGROUND_IMAGE_NAME, DRAWING_LAYER_NAME, shapeNames } from '../model/constants'
import { objectName } from '../model/objectName'
import { addImageInsideShape, constrainShapeToImage, createShapeObject, isShapeObject, syncImageWithShape } from '../operations/shapeObjects'
import { createTextInsideShape, createTextObject, syncParentShapeForText, syncTextWithShape, updateLinkedTextFontSize } from '../operations/textObjects'

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
  textBackground,
  textOpacity,
  textOutline,
  textOutlineWidth,
  textShadow,
  shapeKind,
  lineStyle,
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
    const constrainAndSync = (event: { target?: FabricObject }) => {
      const target = event.target
      if (target && isShapeObject(target)) {
        constrainShapeToImage(canvas, imageObjectRef.current, target)
        syncImageWithShape(canvas, target)
        syncTextWithShape(canvas, target)
      } else if (target instanceof IText) {
        syncParentShapeForText(canvas, target)
      }
    }
    canvas.on('object:moving', constrainAndSync)
    canvas.on('object:scaling', constrainAndSync)
    canvas.on('object:rotating', constrainAndSync)
    return () => {
      canvas.off('object:moving', constrainAndSync)
      canvas.off('object:scaling', constrainAndSync)
      canvas.off('object:rotating', constrainAndSync)
    }
  }, [canvas, imageObjectRef])

  const selectedIsShape = Boolean(
    selectedObject && !selectedIsImage && !(selectedObject instanceof IText) && !cropActive,
  )

  const createText = (design?: TextDesignOptions) => {
    const canvas = canvasRef.current
    if (!canvas) return
    createTextObject(canvas, {
      value: design?.value ?? textValue,
      fontFamily: design?.fontFamily ?? fontFamily,
      fontSize: design?.fontSize ?? fontSize,
      color: design?.color ?? textColor,
      opacity: design?.opacity ?? textOpacity,
      outline: design?.outline ?? textOutline,
      outlineWidth: design?.outlineWidth ?? textOutlineWidth,
      shadow: design?.shadow ?? textShadow,
      fontWeight: design?.fontWeight,
      fontStyle: design?.fontStyle,
      backgroundColor: design?.backgroundColor,
      textAlign: design?.textAlign,
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
      lineStyle,
    })
    recordHistory(true)
  }

  const addTextToShape = () => {
    const canvas = canvasRef.current
    if (!canvas || !selectedObject || !isShapeObject(selectedObject)) return
    const text = createTextInsideShape(canvas, selectedObject, {
      value: textValue,
      fontFamily,
      fontSize,
      color: textColor,
      opacity: textOpacity,
      outline: textOutline,
      outlineWidth: textOutlineWidth,
      shadow: textShadow,
      backgroundColor: textBackground,
    })
    canvas.setActiveObject(text)
    recordHistory(true)
  }

  const addImageToShape = async (file: File) => {
    const canvas = canvasRef.current
    if (!canvas || !selectedObject || !isShapeObject(selectedObject)) return
    await addImageInsideShape(canvas, selectedObject, file)
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
    } else if (property === 'fontSize' && active.get('textParentId')) {
      updateLinkedTextFontSize(canvasRef.current!, active as IText, Number(value))
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
    if (active === imageObjectRef.current) {imageObjectRef.current = null;}
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
    if (!canvas || object.get('layerLocked') === true) return
    canvas.setActiveObject(object)
    canvas.requestRenderAll()
  }

  const setLayerVisibility = (object: FabricObject, visible: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return
    object.set('visible', visible)
    if (!visible && canvas.getActiveObject() === object) canvas.discardActiveObject()
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const setLayerLocked = (object: FabricObject, locked: boolean) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const isPrimaryImage = object === imageObjectRef.current
    object.set({
      layerLocked: locked,
      selectable: !locked && !isPrimaryImage,
      evented: !locked && !isPrimaryImage,
      lockMovementX: locked || isPrimaryImage,
      lockMovementY: locked || isPrimaryImage,
      lockScalingX: locked || isPrimaryImage,
      lockScalingY: locked || isPrimaryImage,
      lockRotation: locked || isPrimaryImage,
    })
    if (locked && canvas.getActiveObject() === object) canvas.discardActiveObject()
    canvas.requestRenderAll()
    recordHistory(true)
  }

  const renameLayer = (object: FabricObject, name: string) => {
    const canvas = canvasRef.current
    const normalizedName = name.trim()
    if (!canvas || !normalizedName) return
    object.set('name', normalizedName)
    canvas.requestRenderAll()
    recordHistory(true)
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

  const updateShadow = (
    shadow: Shadow | null,
    target: FabricObject | null = selectedObject,
    size?: number,
    imageSize?: number,
  ) => {
    const canvas = canvasRef.current
    if (!canvas || !target || target === cropObjectRef.current) return
    const name = target.get('name')
    if (name === DRAWING_LAYER_NAME || name === BACKGROUND_IMAGE_NAME) return
    target.set('shadow', shadow)
    if (size !== undefined) target.set('shadowSize', size)
    if (imageSize !== undefined && target instanceof FabricImage) {
      const currentScaleX = target.scaleX ?? 1
      const currentScaleY = target.scaleY ?? 1
      const baseScaleX = Number(target.get('shadowArtworkBaseScaleX') ?? currentScaleX)
      const baseScaleY = Number(target.get('shadowArtworkBaseScaleY') ?? currentScaleY)
      const center = target.getCenterPoint()
      target.set({
        scaleX: baseScaleX * imageSize / 100,
        scaleY: baseScaleY * imageSize / 100,
        shadowArtworkSize: imageSize,
        shadowArtworkBaseScaleX: baseScaleX,
        shadowArtworkBaseScaleY: baseScaleY,
      })
      target.setPositionByOrigin(center, 'center', 'center')
    }
    target.setCoords()
    if (canvas.getActiveObject() !== target) canvas.setActiveObject(target)
    canvas.requestRenderAll()
    recordHistory()
  }

  return {
    selectedIsShape,
    createText,
    addTextToShape,
    addImageToShape,
    addShape,
    updateText,
    deleteSelected,
    duplicateSelected,
    selectLayer,
    setLayerVisibility,
    setLayerLocked,
    renameLayer,
    moveLayer,
    updateShapeAppearance,
    updateShadow,
  }
}
