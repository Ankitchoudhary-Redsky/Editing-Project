import { useEffect, useRef, useState } from 'react'
import type { EditorMode, EditorTool, ExportFormat, VideoAudioDraft, VideoClipDraft, VideoPreviewData } from '../model/types'

export function useEditorProjectSettingsState() {
  const [activeTool, setActiveTool] = useState<EditorTool>('upload')
  const [editorMode, setEditorMode] = useState<EditorMode>('image')
  const [videoClip, setVideoClip] = useState<VideoClipDraft>({
    file: null,
    url: '',
    duration: 0,
    trimStart: 0,
    trimEnd: 0,
  })
  const [isTrimmingVideo, setIsTrimmingVideo] = useState(false)
  const videoUrlRef = useRef('')
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
  const [shareBusy, setShareBusy] = useState(false)

  useEffect(() => () => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
  }, [])

  const setVideoFile = (file: File) => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
    const url = URL.createObjectURL(file)
    videoUrlRef.current = url
    setVideoClip({ file, url, duration: 0, trimStart: 0, trimEnd: 0 })
  }

  const clearVideo = () => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
    videoUrlRef.current = ''
    setVideoClip({ file: null, url: '', duration: 0, trimStart: 0, trimEnd: 0 })
  }

  const setVideoDuration = (duration: number) => {
    if (!Number.isFinite(duration) || duration <= 0) return
    setVideoClip((current) => ({
      ...current,
      duration,
      trimEnd: current.trimEnd > 0 ? Math.min(current.trimEnd, duration) : duration,
    }))
  }

  const setVideoTrimStart = (trimStart: number) => {
    setVideoClip((current) => ({ ...current, trimStart }))
  }

  const setVideoTrimEnd = (trimEnd: number) => {
    setVideoClip((current) => ({ ...current, trimEnd }))
  }

  return {
    activeTool, setActiveTool,
    editorMode, setEditorMode,
    videoClip: {
      ...videoClip,
      isTrimming: isTrimmingVideo,
      setTrimming: setIsTrimmingVideo,
      setFile: setVideoFile,
      clear: clearVideo,
      setDuration: setVideoDuration,
      setTrimStart: setVideoTrimStart,
      setTrimEnd: setVideoTrimEnd,
    },
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
    shareBusy, setShareBusy,
  }
}