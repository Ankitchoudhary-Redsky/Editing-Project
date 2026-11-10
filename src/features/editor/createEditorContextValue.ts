import { IText } from 'fabric'
import type { CreateEditorContextValueOptions, EditorContextValue } from './model/types'

export function createEditorContextValue({
  settings,
  canvasCore,
  documentActions,
  features,
  snapshot,
  toolActions,
  animation,
  ui,
}: CreateEditorContextValueOptions): EditorContextValue {
  const { fabricCanvas, fitScale, fitToScreen } = canvasCore.fabric
  const selectedText = ui.selectedObject instanceof IText ? ui.selectedObject : null

  return {
    editorMode: {
      active: settings.editorMode,
      setActive: (mode) => {
        settings.setEditorMode(mode)
        toolActions.setActiveEditorTool(mode === 'image' ? 'upload' : 'video-upload')
      },
    },
    videoClip: settings.videoClip,
    fabricCanvas,
    canvas: {
      dimensions: ui.dimensions,
      hasDocument: ui.hasDocument,
      hasImage: ui.hasImage,
      imageThumbnail: ui.imageThumbnail,
      selected: ui.selectedObject,
      objects: ui.objects,
      selectedIsImage: ui.selectedIsImage,
      zoom: settings.zoom,
      setZoom: settings.setZoom,
      fitScale,
      fitToScreen,
    },
    history: {
      canUndo: canvasCore.history.canUndo,
      canRedo: canvasCore.history.canRedo,
      undo: () => void snapshot.undo(),
      redo: () => void snapshot.redo(),
    },
    project: {
      name: settings.projectName,
      setName: settings.setProjectName,
      isRenaming: settings.isRenaming,
      setIsRenaming: settings.setIsRenaming,
    },
    tools: {
      active: settings.activeTool,
      setActive: toolActions.setActiveEditorTool,
      openFilePicker: documentActions.openFilePicker,
      uploadFile: documentActions.uploadFile,
      beginCrop: snapshot.canvasTransforms.crop.begin,
      setDraggingFile: ui.setDraggingFile,
      notice: ui.notice,
      setNotice: ui.setNotice,
      deleteImage: documentActions.deleteImage,
    },
    crop: snapshot.canvasTransforms.crop,
    resize: snapshot.canvasTransforms.resize,
    text: {
      selected: selectedText,
      value: settings.textValue,
      fontFamily: settings.fontFamily,
      setFontFamily: settings.setFontFamily,
      fontSize: settings.fontSize,
      setFontSize: settings.setFontSize,
      color: settings.textColor,
      setColor: settings.setTextColor,
      background: settings.textBackground,
      setBackground: settings.setTextBackground,
      opacity: settings.textOpacity,
      setOpacity: settings.setTextOpacity,
      outline: settings.textOutline,
      setOutline: settings.setTextOutline,
      outlineWidth: settings.textOutlineWidth,
      setOutlineWidth: settings.setTextOutlineWidth,
      shadow: settings.textShadow,
      setShadow: settings.setTextShadow,
      add: features.objectEditing.createText,
      update: features.objectEditing.updateText,
    },
    shapes: {
      selected: ui.selectedObject,
      isSelectedShape: features.objectEditing.selectedIsShape,
      mode: settings.shapeToolMode,
      setMode: settings.setShapeToolMode,
      kind: settings.shapeKind,
      setKind: settings.setShapeKind,
      threeDKind: settings.threeDShapeKind,
      setThreeDKind: settings.setThreeDShapeKind,
      lineStyle: settings.lineStyle,
      setLineStyle: settings.setLineStyle,
      fill: settings.fillColor,
      setFill: settings.setFillColor,
      transparentFill: settings.transparentFill,
      setTransparentFill: settings.setTransparentFill,
      stroke: settings.strokeColor,
      setStroke: settings.setStrokeColor,
      strokeWidth: settings.strokeWidth,
      setStrokeWidth: settings.setStrokeWidth,
      opacity: settings.shapeOpacity,
      setOpacity: settings.setShapeOpacity,
      add: features.objectEditing.addShape,
      addText: features.objectEditing.addTextToShape,
      addImage: features.objectEditing.addImageToShape,
      duplicate: features.objectEditing.duplicateSelected,
      delete: features.objectEditing.deleteSelected,
      updateAppearance: features.objectEditing.updateShapeAppearance,
      moveLayer: features.objectEditing.moveLayer,
      selectLayer: features.objectEditing.selectLayer,
      setLayerVisibility: features.objectEditing.setLayerVisibility,
      setLayerLocked: features.objectEditing.setLayerLocked,
      renameLayer: features.objectEditing.renameLayer,
    },
    shadows: {
      update: features.objectEditing.updateShadow,
    },
    adjustments: {
      brightness: settings.brightness,
      setBrightness: settings.setBrightness,
      contrast: settings.contrast,
      setContrast: settings.setContrast,
      saturation: settings.saturation,
      setSaturation: settings.setSaturation,
      apply: toolActions.applyAdjustments,
      reset: toolActions.resetAdjustments,
    },
    preview: {
      open: settings.previewOpen,
      imageUrl: settings.previewUrl,
      mode: settings.previewMode,
      video: settings.videoPreview,
      setVideo: settings.setVideoPreview,
      show: toolActions.openPreview,
      close: () => settings.setPreviewOpen(false),
    },
    animation,
    videoAudio: settings.videoAudio,
    setVideoAudio: settings.setVideoAudio,
    draggingFile: ui.draggingFile,
    handleDrop: (event) => {
      if (settings.editorMode !== 'video') {
        documentActions.handleDrop(event)
        return
      }
      event.preventDefault()
      event.stopPropagation()
      ui.setDraggingFile(false)
      const file = event.dataTransfer.files[0]
      if (!file) return
      if (!file.type.startsWith('video/')) {
        ui.setNotice('Choose a video file to continue.')
        return
      }
      if (file.size > 500 * 1024 * 1024) {
        ui.setNotice('Videos must be smaller than 500 MB.')
        return
      }
      settings.videoClip.setFile(file)
      ui.setNotice('')
    },
    filters: {
      selected: settings.selectedFilter,
      intensity: settings.filterIntensity,
      setFilter: toolActions.changeFilter,
      setIntensity: toolActions.changeFilterIntensity,
      reset: toolActions.resetFilter,
    },
    background: features.background,
    drawing: {
      activeMode: settings.activeDrawingMode,
      setActiveMode: settings.setActiveDrawingMode,
      color: settings.drawingColor,
      setColor: settings.setDrawingColor,
      brushSize: settings.brushSize,
      setBrushSize: settings.setBrushSize,
      clearSelection: features.pixelDrawing.clearSelection,
      deleteSelection: features.pixelDrawing.deleteSelection,
    },
    export: {
      open: settings.exportOpen,
      setOpen: settings.setExportOpen,
      format: settings.exportFormat,
      setFormat: settings.setExportFormat,
      scale: settings.exportScale,
      setScale: settings.setExportScale,
      watermark: settings.exportWatermark,
      setWatermark: settings.setExportWatermark,
      busy: settings.exportBusy,
      download: toolActions.downloadDesign,
      shareBusy: settings.shareBusy,
      share: toolActions.shareDesign,
    },
    table: features.table,
  }
}