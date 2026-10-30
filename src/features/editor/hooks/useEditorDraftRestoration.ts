import { useCallback } from 'react'
import type {
  PersistedEditorDraft,
  ResizeSettings,
  UseEditorDraftRestorationOptions,
} from '../model/types'

export function useEditorDraftRestoration({
  projectSettings,
  designSettings,
}: UseEditorDraftRestorationOptions) {
  const {
    setProjectName,
    setActiveTool,
    setZoom,
    setVideoAudio,
    setExportFormat,
    setExportScale,
    setExportWatermark,
  } = projectSettings
  const {
    setDrawingColor,
    setBrushSize,
    setActiveDrawingMode,
    setBrightness,
    setContrast,
    setSaturation,
    setTextValue,
    setFontFamily,
    setFontSize,
    setTextColor,
    setTextBackground,
    setTextOpacity,
    setTextOutline,
    setTextOutlineWidth,
    setTextShadow,
    setShapeKind,
    setFillColor,
    setTransparentFill,
    setStrokeColor,
    setStrokeWidth,
    setShapeOpacity,
  } = designSettings

  return useCallback((
    draft: PersistedEditorDraft,
    restoreResize: (settings: ResizeSettings) => void,
  ) => {
    setProjectName(draft.projectName)
    setActiveTool(draft.activeTool === 'select' ? 'crop' : draft.activeTool)
    setZoom(draft.zoom)
    setDrawingColor(draft.drawingColor)
    setBrushSize(draft.brushSize)
    setActiveDrawingMode(draft.activeDrawingMode)
    setBrightness(draft.brightness)
    setContrast(draft.contrast)
    setSaturation(draft.saturation)
    restoreResize({
      width: draft.resizeWidth,
      height: draft.resizeHeight,
      keepRatio: draft.keepRatio,
      scaleArtwork: draft.scaleArtwork,
    })
    setTextValue(draft.textValue)
    setFontFamily(draft.fontFamily)
    setFontSize(draft.fontSize)
    setTextColor(draft.textColor)
    setTextBackground(draft.textBackground)
    setTextOpacity(draft.textOpacity)
    setTextOutline(draft.textOutline)
    setTextOutlineWidth(draft.textOutlineWidth)
    setTextShadow(draft.textShadow)
    setShapeKind(draft.shapeKind)
    setFillColor(draft.fillColor)
    setTransparentFill(draft.transparentFill)
    setStrokeColor(draft.strokeColor)
    setStrokeWidth(draft.strokeWidth)
    setShapeOpacity(draft.shapeOpacity)
    setExportFormat(draft.exportFormat)
    setExportScale(draft.exportScale)
    setExportWatermark(draft.exportWatermark)
    setVideoAudio({
      ...draft.videoAudio,
      music: {
        ...draft.videoAudio.music,
        url: draft.videoAudio.music.file ? URL.createObjectURL(draft.videoAudio.music.file) : '',
      },
      voice: {
        ...draft.videoAudio.voice,
        url: draft.videoAudio.voice.file ? URL.createObjectURL(draft.videoAudio.voice.file) : '',
      },
    })
  }, [
    setActiveDrawingMode,
    setActiveTool,
    setBrightness,
    setBrushSize,
    setContrast,
    setDrawingColor,
    setExportFormat,
    setExportScale,
    setExportWatermark,
    setFillColor,
    setFontFamily,
    setFontSize,
    setProjectName,
    setSaturation,
    setShapeKind,
    setShapeOpacity,
    setStrokeColor,
    setStrokeWidth,
    setTextBackground,
    setTextColor,
    setTextOpacity,
    setTextOutline,
    setTextOutlineWidth,
    setTextShadow,
    setTextValue,
    setTransparentFill,
    setVideoAudio,
    setZoom,
  ])
}