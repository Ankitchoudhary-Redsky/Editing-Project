import { useCallback } from 'react'
import { loadTemplate } from '../../templates/operations/loadTemplate'
import type { EditorTemplate } from '../../templates/model/template.types'
import { createEditorContextValue } from '../createEditorContextValue'
import type { EditorRuntime, EditorSettings, EditorUiState } from '../model/types'
import { useEditorDocumentActions } from './useEditorDocumentActions'
import { useEditorKeyboardShortcuts } from './useEditorKeyboardShortcuts'
import { useEditorProjectPersistence } from './useEditorProjectPersistence'
import { useEditorToolActions } from './useEditorToolActions'
import { useTextAnimation } from './useTextAnimation'
import { useEditorPagesController } from './useEditorPagesController'
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
  const loadTemplateIntoEditor = useCallback(
    async (template: EditorTemplate): Promise<void> => {
      const canvas = canvasRef.current
      if (!canvas) {
        throw new Error('The editor canvas is not ready yet.')
      }
      cropObjectRef.current = null
      cropOriginalSnapshotRef.current = null
      const loaded = await loadTemplate(canvas, template)
      if (!loaded) {
        throw new Error('The template could not be loaded.')
      }
      selectedFilterRef.current = 'original'
      filterIntensityRef.current = 100
      backgroundRemovedRef.current = false
      backgroundColorRef.current = '#ffffff'

      settings.setSelectedFilter('original')
      settings.setFilterIntensity(100)
      settings.setBackgroundRemoved(false)
      settings.setBackgroundColorState('#ffffff')
      settings.setBrightness(0)
      settings.setContrast(0)
      settings.setSaturation(0)
      ui.setDimensions({
        width: canvas.getWidth(),
        height: canvas.getHeight(),
      })

      ui.setCropActive(false)
      ui.setCropRotation(0)
      ui.setImageThumbnail(template.thumbnail || '')
      ui.setNotice('Template loaded successfully.')

      settings.setProjectName(template.name)
      settings.setActiveTool('select')
      settings.setZoom(1)
      syncObjects()
      resizeDisplay()
      initializeHistory(canvas)
    },
    [
      canvasRef,
      cropObjectRef,
      cropOriginalSnapshotRef,
      selectedFilterRef,
      filterIntensityRef,
      backgroundRemovedRef,
      backgroundColorRef,
      settings,
      ui,
      syncObjects,
      resizeDisplay,
      initializeHistory,
    ],
  )
  const animation = useTextAnimation({
    canvas: fabricCanvas,
    selectedObject: ui.selectedObject,
    selectedIsImage: ui.selectedIsImage,
    historyVersion,
    recordHistory,
  })
  const { background, table, pixelDrawing, objectEditing } = editorFeatures
  const { restoreCanvasSnapshot, restoreResize, canvasTransforms, undo, redo } = snapshotController

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
    setShareBusy: settings.setShareBusy,
    restartAnimations: animation.restart,
    setNotice: ui.setNotice,
  })

  const pages = useEditorPagesController({
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
  setBackgroundRemoved: settings.setBackgroundRemoved,
  setBackgroundColor: settings.setBackgroundColorState,
  setIsRemovingBackground: settings.setIsRemovingBackground,
  setBackgroundProgress: settings.setBackgroundProgress,
  setSelectedFilter: settings.setSelectedFilter,
  setFilterIntensity: settings.setFilterIntensity,
  setDimensions: ui.setDimensions,
  syncObjects,
  resizeDisplay,
  serializeEditorSnapshot: canvasCore.serializeEditorSnapshot,
  restoreCanvasSnapshot,
  initializeHistory,
})

  useEditorProjectPersistence({
    canvasRef,
    fabricCanvas,
    suppressHistoryRef,
    userEditedBeforeDraftLoadRef,
    draftReady: ui.draftReady,
    setDraftReady: ui.setDraftReady,
    historyVersion,
    pagesVersion: pages.version,
    draftSettings: settings.draftSettings,
    resizeSettings: {
      width: canvasTransforms.resize.width,
      height: canvasTransforms.resize.height,
      keepRatio: canvasTransforms.resize.keepRatio,
      scaleArtwork: canvasTransforms.resize.scaleArtwork,
    },
    restoreCanvasSnapshot,
    getPagesSnapshot: pages.getPersistedState,
    restorePages: pages.restorePersistedState,
    restoreDraftSettings: settings.restoreDraftSettings,
    restoreResize,
    initializeHistory,
    touchHistory,
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
    animation,
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
    pages
  })

  return {
    contextValue,
    historyVersion,
    setUploadInputElement: documentActions.setUploadInputElement,
    setCanvasElement,
    setStageElement,
    loadTemplateIntoEditor,
  }
}