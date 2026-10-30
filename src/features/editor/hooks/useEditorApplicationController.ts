import { createEditorContextValue } from '../createEditorContextValue'
import type { EditorRuntime, EditorSettings, EditorUiState } from '../model/types'
import { useEditorDocumentActions } from './useEditorDocumentActions'
import { useEditorKeyboardShortcuts } from './useEditorKeyboardShortcuts'
import { useEditorProjectPersistence } from './useEditorProjectPersistence'
import { useEditorToolActions } from './useEditorToolActions'


export function useEditorApplicationController({
  settings,
  ui,
  runtime,
}: {
  settings: EditorSettings
  ui: EditorUiState
  runtime: EditorRuntime
}) {
  const { canvasCore, editorFeatures, snapshotController, historyVersion } = runtime
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
    userEditedBeforeDraftLoadRef,
    markUserInteractionBeforeDraftLoad,
    syncObjects,
  } = canvasCore
  const { recordHistory, initialize: initializeHistory, touch: touchHistory } = canvasCore.history
  const { fabricCanvas, setCanvasElement, setStageElement, resizeDisplay } = canvasCore.fabric
  const { background, table, pixelDrawing, objectEditing } = editorFeatures
  const { restoreCanvasSnapshot, restoreResize, canvasTransforms, undo, redo } = snapshotController

  useEditorProjectPersistence({
    canvasRef,
    fabricCanvas,
    suppressHistoryRef,
    userEditedBeforeDraftLoadRef,
    draftReady: ui.draftReady,
    setDraftReady: ui.setDraftReady,
    hasDocument: ui.hasDocument,
    historyVersion,
    draftSettings: settings.draftSettings,
    resizeSettings: {
      width: canvasTransforms.resize.width,
      height: canvasTransforms.resize.height,
      keepRatio: canvasTransforms.resize.keepRatio,
      scaleArtwork: canvasTransforms.resize.scaleArtwork,
    },
    restoreCanvasSnapshot,
    restoreDraftSettings: settings.restoreDraftSettings,
    restoreResize,
    initializeHistory,
    touchHistory,
    setNotice: ui.setNotice,
  })

  const documentActions = useEditorDocumentActions({
    uploadOptions: {
      canvasRef,
      imageObjectRef,
      imageSourceRef,
      suppressHistoryRef,
      selectedFilterRef,
      filterIntensityRef,
      backgroundRemovedRef,
      backgroundColorRef,
      setBackgroundRemoved: settings.setBackgroundRemoved,
      setBackgroundColor: settings.setBackgroundColorState,
      setIsRemovingBackground: settings.setIsRemovingBackground,
      setBackgroundProgress: settings.setBackgroundProgress,
      setSelectedFilter: settings.setSelectedFilter,
      setFilterIntensity: settings.setFilterIntensity,
      setDimensions: ui.setDimensions,
      setHasDocument: ui.setHasDocument,
      setImageThumbnail: ui.setImageThumbnail,
      setBrightness: settings.setBrightness,
      setContrast: settings.setContrast,
      setSaturation: settings.setSaturation,
      setZoom: settings.setZoom,
      resizeDisplay,
      initializeHistory,
      syncObjects,
      markUserInteractionBeforeDraftLoad,
      setNotice: ui.setNotice,
      setDraggingFile: ui.setDraggingFile,
    },
    resetTables: table.reset,
    resetDrawing: pixelDrawing.reset,
    canvasRef,
    imageObjectRef,
    cropObjectRef,
    cropOriginalSnapshotRef,
    suppressHistoryRef,
    setHasImage: ui.setHasImage,
    setHasDocument: ui.setHasDocument,
    setImageThumbnail: ui.setImageThumbnail,
    setCropActive: ui.setCropActive,
    setDimensions: ui.setDimensions,
    restoreResize,
    restoreBackground: background.restore,
    setIsRemovingBackground: settings.setIsRemovingBackground,
    setBackgroundProgress: settings.setBackgroundProgress,
    recordHistory,
    syncObjects,
    resizeDisplay,
    setNotice: ui.setNotice,
    setDraggingFile: ui.setDraggingFile,
  })

  const toolActions = useEditorToolActions({
    canvasRef,
    imageObjectRef,
    selectedFilterRef,
    filterIntensityRef,
    activeTool: settings.activeTool,
    brightness: settings.brightness,
    contrast: settings.contrast,
    saturation: settings.saturation,
    projectName: settings.projectName,
    exportFormat: settings.exportFormat,
    exportScale: settings.exportScale,
    exportWatermark: settings.exportWatermark,
    videoPreview: settings.videoPreview,
    cancelCrop: canvasTransforms.cancelCrop,
    setActiveTool: settings.setActiveTool,
    recordHistory,
    setBrightness: settings.setBrightness,
    setContrast: settings.setContrast,
    setSaturation: settings.setSaturation,
    setSelectedFilter: settings.setSelectedFilter,
    setFilterIntensity: settings.setFilterIntensity,
    setPreviewUrl: settings.setPreviewUrl,
    setPreviewMode: settings.setPreviewMode,
    setPreviewOpen: settings.setPreviewOpen,
    setExportOpen: settings.setExportOpen,
    setExportBusy: settings.setExportBusy,
    setNotice: ui.setNotice,
  })

  useEditorKeyboardShortcuts({
    undo,
    redo,
    deleteSelected: objectEditing.deleteSelected,
    handleTableKeyboardInput: table.handleKeyboardInput,
  })

  const contextValue = createEditorContextValue({
    settings,
    canvasCore,
    documentActions,
    features: editorFeatures,
    snapshot: snapshotController,
    toolActions,
    ui: {
      dimensions: ui.dimensions,
      hasDocument: ui.hasDocument,
      hasImage: ui.hasImage,
      selectedObject: ui.selectedObject,
      objects: ui.objects,
      selectedIsImage: ui.selectedIsImage,
      imageThumbnail: ui.imageThumbnail,
      draggingFile: ui.draggingFile,
      setDraggingFile: ui.setDraggingFile,
      notice: ui.notice,
      setNotice: ui.setNotice,
    },
  })

  return {
    contextValue,
    historyVersion,
    setUploadInputElement: documentActions.setUploadInputElement,
    setCanvasElement,
    setStageElement,
  }
}