import { useCallback } from 'react'
import type { EditorTool, FilterId, UseEditorToolActionsOptions } from '../model/types'
import { applyImageAdjustments } from '../operations/imageAdjustments'
import { createEditorPreview, downloadEditorImage } from '../operations/editorExport'

export function useEditorToolActions({
  canvasRef,
  imageObjectRef,
  selectedFilterRef,
  filterIntensityRef,
  activeTool,
  brightness,
  contrast,
  saturation,
  projectName,
  exportFormat,
  exportScale,
  exportWatermark,
  videoPreview,
  cancelCrop,
  setActiveTool,
  recordHistory,
  setBrightness,
  setContrast,
  setSaturation,
  setSelectedFilter,
  setFilterIntensity,
  setPreviewUrl,
  setPreviewMode,
  setPreviewOpen,
  setExportOpen,
  setExportBusy,
  setNotice,
}: UseEditorToolActionsOptions) {
  const setActiveEditorTool = useCallback((tool: EditorTool) => {
    if (activeTool === 'crop' && tool !== 'crop') {
      cancelCrop(tool)
      return
    }
    setActiveTool(tool)
  }, [activeTool, cancelCrop, setActiveTool])

  const applyAdjustments = (
    nextBrightness = brightness,
    nextContrast = contrast,
    nextSaturation = saturation,
  ) => {
    const image = imageObjectRef.current
    if (!image) return
    applyImageAdjustments(
      image,
      nextBrightness,
      nextContrast,
      nextSaturation,
      selectedFilterRef.current,
      filterIntensityRef.current,
    )
    canvasRef.current?.requestRenderAll()
    recordHistory()
  }

  const changeFilter = (id: FilterId) => {
    selectedFilterRef.current = id
    setSelectedFilter(id)
    applyAdjustments()
    recordHistory(true)
  }

  const changeFilterIntensity = (value: number) => {
    const next = Math.max(0, Math.min(100, value))
    filterIntensityRef.current = next
    setFilterIntensity(next)
    applyAdjustments()
    recordHistory(true)
  }

  const resetFilter = () => {
    selectedFilterRef.current = 'original'
    filterIntensityRef.current = 100
    setSelectedFilter('original')
    setFilterIntensity(100)
    applyAdjustments()
    recordHistory(true)
  }

  const resetAdjustments = () => {
    setBrightness(0)
    setContrast(0)
    setSaturation(0)
    applyAdjustments(0, 0, 0)
  }

  const openPreview = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setPreviewUrl(await createEditorPreview(canvas, exportWatermark))
    setPreviewMode(videoPreview?.audioUrl ? 'video' : 'image')
    setPreviewOpen(true)
  }

  const downloadDesign = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setExportBusy(true)
    try {
      await downloadEditorImage(canvas, projectName, exportFormat, exportScale, exportWatermark)
      setExportOpen(false)
    } catch {
      setNotice('Export failed. Try a smaller output size or PNG format.')
    } finally {
      setExportBusy(false)
    }
  }

  return {
    setActiveEditorTool,
    applyAdjustments,
    changeFilter,
    changeFilterIntensity,
    resetFilter,
    resetAdjustments,
    openPreview,
    downloadDesign,
  }
}