import { useState } from 'react'
import type { EditorTool, ExportFormat, VideoAudioDraft, VideoPreviewData } from '../model/types'

export function useEditorProjectSettingsState() {
  const [activeTool, setActiveTool] = useState<EditorTool>('upload')
  const [projectName, setProjectName] = useState('Untitled')
  const [isRenaming, setIsRenaming] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewMode, setPreviewMode] = useState<'image' | 'video'>('image')
  const [videoPreview, setVideoPreview] = useState<VideoPreviewData | null>(null)
  const [videoAudio, setVideoAudio] = useState<VideoAudioDraft>({
    music: { file: null, url: '', duration: 0 },
    voice: { file: null, url: '', duration: 0 },
    startTime: 0,
    endTime: 0,
    musicVolume: 80,
    voiceVolume: 100,
  })
  const [zoom, setZoom] = useState(1)
  const [exportOpen, setExportOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png')
  const [exportScale, setExportScale] = useState(1)
  const [exportWatermark, setExportWatermark] = useState(true)
  const [exportBusy, setExportBusy] = useState(false)

  return {
    activeTool, setActiveTool,
    projectName, setProjectName,
    isRenaming, setIsRenaming,
    previewUrl, setPreviewUrl,
    previewOpen, setPreviewOpen,
    previewMode, setPreviewMode,
    videoPreview, setVideoPreview,
    videoAudio, setVideoAudio,
    zoom, setZoom,
    exportOpen, setExportOpen,
    exportFormat, setExportFormat,
    exportScale, setExportScale,
    exportWatermark, setExportWatermark,
    exportBusy, setExportBusy,
  }
}