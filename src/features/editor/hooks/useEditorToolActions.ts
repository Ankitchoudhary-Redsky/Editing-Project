import { useCallback, useRef } from 'react'
import type { EditorTool, FilterId, UseEditorToolActionsOptions } from '../model/types'
import { applyImageAdjustments } from '../operations/imageAdjustments'
import { createEditorPreview, downloadEditorImage } from '../operations/editorExport'
import { exportAnimatedCanvas } from '../operations/animatedExport'
import { drawProjectWatermark } from '../operations/projectWatermark'

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
  setShareBusy,
  restartAnimations,
  setNotice,
}: UseEditorToolActionsOptions) {
  const adjustmentPreviewRef = useRef(false)

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
      adjustmentPreviewRef.current,
    )
    canvasRef.current?.requestRenderAll()
    if (!adjustmentPreviewRef.current) recordHistory()
  }

  const beginAdjustmentPreview = () => {
    adjustmentPreviewRef.current = true
  }

  const finishAdjustmentPreview = (
    nextBrightness: number,
    nextContrast: number,
    nextSaturation: number,
  ) => {
    if (!adjustmentPreviewRef.current) return
    adjustmentPreviewRef.current = false
    setBrightness(nextBrightness)
    setContrast(nextContrast)
    setSaturation(nextSaturation)
    applyAdjustments(nextBrightness, nextContrast, nextSaturation)
    recordHistory(true)
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
      if (exportFormat === 'gif' || exportFormat === 'mp4') {
        restartAnimations()
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const blob = await exportAnimatedCanvas(canvas, exportFormat, exportScale, exportWatermark)
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        const safeName = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'pixel-studio-design'
        link.href = url
        link.download = `${safeName}.${exportFormat}`
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        setExportOpen(false)
        return
      }
      await downloadEditorImage(canvas, projectName, exportFormat, exportScale, exportWatermark)
      setExportOpen(false)
    } catch {
      setNotice('Export failed. Try a smaller output size or PNG format.')
    } finally {
      setExportBusy(false)
    }
  }

  const shareDesign = async () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setShareBusy(true)
    try {
      const output = canvas.toCanvasElement(exportScale)
      if (exportWatermark) await drawProjectWatermark(output)
      const blob = await new Promise<Blob>((resolve, reject) => {
        output.toBlob((result) => {
          if (result) resolve(result)
          else reject(new Error('Could not prepare the image for sharing.'))
        }, 'image/png')
      })
      const safeName = projectName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'pixel-studio-design'
      const file = new File([blob], `${safeName}.png`, { type: 'image/png' })
      if (typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) !== false) {
        await navigator.share({ files: [file], title: projectName })
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = file.name
        link.click()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
        setNotice('Image sharing is not available in this browser. The PNG was downloaded instead.')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      setNotice('Could not share the image. Please try exporting it instead.')
    } finally {
      setShareBusy(false)
    }
  }

  return {
    setActiveEditorTool,
    applyAdjustments,
    beginAdjustmentPreview,
    finishAdjustmentPreview,
    changeFilter,
    changeFilterIntensity,
    resetFilter,
    resetAdjustments,
    openPreview,
    downloadDesign,
    shareDesign,
  }
}