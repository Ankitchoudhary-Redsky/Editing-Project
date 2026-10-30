import type { EditorSettings, EditorUiState } from '../model/types'
import { useEditorCanvasCore } from './useEditorCanvasCore'
import { useEditorFeatureControllers } from './useEditorFeatureControllers'
import { useEditorSnapshotController } from './useEditorSnapshotController'
import { useEditorDrawingMode } from './useEditorDrawingMode'

export function useEditorCanvasRuntime({
  settings,
  ui,
}: {
  settings: EditorSettings
  ui: EditorUiState
}) {
  const canvasCore = useEditorCanvasCore({
    activeTool: settings.activeTool,
    setZoom: settings.setZoom,
    setHasDocument: ui.setHasDocument,
    setHasImage: ui.setHasImage,
    setSelectedObject: ui.setSelectedObject,
    setObjects: ui.setObjects,
    setSelectedIsImage: ui.setSelectedIsImage,
    setImageThumbnail: ui.setImageThumbnail,
    setCropRotation: ui.setCropRotation,
  })
  const {
    canvasRef,
    suppressHistoryRef,
    cropObjectRef,
    cropOriginalSnapshotRef,
    imageObjectRef,
    imageSourceRef,
    selectedFilterRef,
    filterIntensityRef,
    backgroundRemovedRef,
    backgroundColorRef,
    activeToolRef,
    serializeEditorSnapshot,
    syncObjects,
  } = canvasCore
  const {
    historyRef,
    historyIndexRef,
    historyTimerRef,
    historyVersion,
    recordHistory,
    syncHistoryControls,
    touch: touchHistory,
  } = canvasCore.history
  const {
    fabricCanvas,
    resizeDisplay,
  } = canvasCore.fabric

  const editorFeatures = useEditorFeatureControllers({
    canvas: fabricCanvas,
    refs: {
      canvasRef,
      imageObjectRef,
      imageSourceRef,
      backgroundRemovedRef,
      backgroundColorRef,
      activeToolRef,
      cropObjectRef,
      suppressHistoryRef,
    },
    state: {
      activeTool: settings.activeTool,
      hasDocument: ui.hasDocument,
      hasImage: ui.hasImage,
      selectedObject: ui.selectedObject,
      selectedIsImage: ui.selectedIsImage,
      cropActive: ui.cropActive,
      activeDrawingMode: settings.activeDrawingMode,
      drawingColor: settings.drawingColor,
      brushSize: settings.brushSize,
      backgroundRemoved: settings.backgroundRemoved,
      isRemovingBackground: settings.isRemovingBackground,
      backgroundProgress: settings.backgroundProgress,
      backgroundColor: settings.backgroundColor,
      textValue: settings.textValue,
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      textColor: settings.textColor,
      textOpacity: settings.textOpacity,
      textOutline: settings.textOutline,
      textOutlineWidth: settings.textOutlineWidth,
      textShadow: settings.textShadow,
      shapeKind: settings.shapeKind,
      fillColor: settings.fillColor,
      transparentFill: settings.transparentFill,
      strokeColor: settings.strokeColor,
      strokeWidth: settings.strokeWidth,
      shapeOpacity: settings.shapeOpacity,
    },
    actions: {
      setActiveTool: settings.setActiveTool,
      setActiveDrawingMode: settings.setActiveDrawingMode,
      setTextValue: settings.setTextValue,
      setBackgroundRemoved: settings.setBackgroundRemoved,
      setIsRemovingBackground: settings.setIsRemovingBackground,
      setBackgroundProgress: settings.setBackgroundProgress,
      setBackgroundColor: settings.setBackgroundColorState,
      recordHistory,
      syncObjects,
      setNotice: ui.setNotice,
    },
  })
  const { background, table } = editorFeatures

  useEditorDrawingMode({
    canvasRef,
    activeTool: settings.activeTool,
    activeDrawingMode: settings.activeDrawingMode,
    hasImage: ui.hasImage,
  })

  const snapshotController = useEditorSnapshotController({
    canvasRef,
    imageObjectRef,
    imageSourceRef,
    cropObjectRef,
    cropOriginalSnapshotRef,
    suppressHistoryRef,
    historyRef,
    historyIndexRef,
    historyTimerRef,
    backgroundRemovedRef,
    backgroundColorRef,
    selectedFilterRef,
    filterIntensityRef,
    serializeEditorSnapshot,
    restoreTables: table.restore,
    restoreBackground: background.restore,
    recordHistory,
    resizeDisplay,
    syncObjects,
    syncHistoryControls,
    touchHistory,
    setDimensions: ui.setDimensions,
    setHasDocument: ui.setHasDocument,
    setImageThumbnail: ui.setImageThumbnail,
    setBackgroundRemoved: settings.setBackgroundRemoved,
    setBackgroundColor: settings.setBackgroundColorState,
    setSelectedFilter: settings.setSelectedFilter,
    setFilterIntensity: settings.setFilterIntensity,
    hasDocument: ui.hasDocument,
    dimensions: ui.dimensions,
    cropActive: ui.cropActive,
    cropRotation: ui.cropRotation,
    setCropActive: ui.setCropActive,
    setCropRotation: ui.setCropRotation,
    setActiveTool: settings.setActiveTool,
  })

  return { canvasCore, editorFeatures, snapshotController, historyVersion }
}