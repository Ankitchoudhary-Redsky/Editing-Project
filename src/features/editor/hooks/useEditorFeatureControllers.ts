import type { UseEditorFeatureControllersOptions } from '../model/types'
import { useImageBackground } from './useImageBackground'
import { useTableEditor } from './useTableEditor'
import { usePixelDrawing } from './usePixelDrawing'
import { useObjectEditing } from './useObjectEditing'
import { useShapeDrawing } from './useShapeDrawing'

export function useEditorFeatureControllers({
  canvas,
  refs,
  state,
  actions,
}: UseEditorFeatureControllersOptions) {
  const background = useImageBackground({
    canvasRef: refs.canvasRef,
    imageObjectRef: refs.imageObjectRef,
    imageSourceRef: refs.imageSourceRef,
    backgroundRemovedRef: refs.backgroundRemovedRef,
    backgroundColorRef: refs.backgroundColorRef,
    backgroundRemoved: state.backgroundRemoved,
    isRemovingBackground: state.isRemovingBackground,
    backgroundProgress: state.backgroundProgress,
    backgroundColor: state.backgroundColor,
    setBackgroundRemoved: actions.setBackgroundRemoved,
    setIsRemovingBackground: actions.setIsRemovingBackground,
    setBackgroundProgress: actions.setBackgroundProgress,
    setBackgroundColor: actions.setBackgroundColor,
    recordHistory: actions.recordHistory,
    syncObjects: actions.syncObjects,
    setNotice: actions.setNotice,
  })

  const table = useTableEditor({
    canvas,
    canvasRef: refs.canvasRef,
    imageObjectRef: refs.imageObjectRef,
    activeToolRef: refs.activeToolRef,
    setActiveTool: actions.setActiveTool,
    setActiveDrawingMode: actions.setActiveDrawingMode,
    recordHistory: actions.recordHistory,
    setNotice: actions.setNotice,
  })

  const pixelDrawing = usePixelDrawing({
    canvas,
    canvasRef: refs.canvasRef,
    imageObjectRef: refs.imageObjectRef,
    activeTool: state.activeTool,
    activeToolRef: refs.activeToolRef,
    activeDrawingMode: state.activeDrawingMode,
    drawingColor: state.drawingColor,
    brushSize: state.brushSize,
    tableEditing: table.isEditingTable,
    recordHistory: actions.recordHistory,
    syncObjects: actions.syncObjects,
    setNotice: actions.setNotice,
  })

  const objectEditing = useObjectEditing({
    canvas,
    canvasRef: refs.canvasRef,
    imageObjectRef: refs.imageObjectRef,
    cropObjectRef: refs.cropObjectRef,
    selectedObject: state.selectedObject,
    selectedIsImage: state.selectedIsImage,
    cropActive: state.cropActive,
    textValue: state.textValue,
    fontFamily: state.fontFamily,
    fontSize: state.fontSize,
    textColor: state.textColor,
    textOpacity: state.textOpacity,
    textOutline: state.textOutline,
    textOutlineWidth: state.textOutlineWidth,
    textShadow: state.textShadow,
    shapeKind: state.shapeKind,
    fillColor: state.fillColor,
    transparentFill: state.transparentFill,
    strokeColor: state.strokeColor,
    strokeWidth: state.strokeWidth,
    shapeOpacity: state.shapeOpacity,
    setActiveTool: actions.setActiveTool,
    setTextValue: actions.setTextValue,
    recordHistory: actions.recordHistory,
  })

  useShapeDrawing({
    canvas,
    canvasRef: refs.canvasRef,
    imageObjectRef: refs.imageObjectRef,
    activeTool: state.activeTool,
    hasDocument: state.hasDocument,
    shapeKind: state.shapeKind,
    fillColor: state.fillColor,
    transparentFill: state.transparentFill,
    strokeColor: state.strokeColor,
    strokeWidth: state.strokeWidth,
    shapeOpacity: state.shapeOpacity,
    suppressHistoryRef: refs.suppressHistoryRef,
    recordHistory: actions.recordHistory,
    syncObjects: actions.syncObjects,
  })

  return { background, table, pixelDrawing, objectEditing }
}