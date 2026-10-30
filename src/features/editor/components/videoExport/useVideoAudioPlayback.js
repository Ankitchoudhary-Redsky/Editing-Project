import { useEffect, useRef, useState } from 'react'

export function useVideoAudioPlayback({
  preview,
  imagePreviewUrl,
  videoAudio,
  setVideoAudio,
  setError,
}) {
  const {
    music: { file: musicFile, url: musicUrl },
    voice: { file: voiceFile, url: voiceUrl },
    startTime,
    endTime,
    musicVolume,
    voiceVolume,
  } = videoAudio
  const audioRef = useRef(null)
  const voiceAudioRef = useRef(null)
  const [isPreviewing, setIsPreviewing] = useState(false)

  useEffect(() => {
    preview.setVideo({
      imageUrl: imagePreviewUrl,
      audioUrl: musicFile ? musicUrl : voiceUrl,
      audioTrackLabel: musicFile ? 'Music' : 'Voice-over',
      startTime,
      endTime,
      volume: musicFile ? musicVolume : voiceVolume,
      voiceOverUrl: musicFile ? voiceUrl || undefined : undefined,
      voiceOverVolume: voiceVolume,
      voiceOverStartTime: 0,
    })
  }, [
    endTime,
    imagePreviewUrl,
    musicUrl,
    preview.setVideo,
    startTime,
    musicVolume,
    voiceFile,
    voiceUrl,
    voiceVolume,
  ])

  function stopPreview() {
    audioRef.current?.pause()
    voiceAudioRef.current?.pause()
    setIsPreviewing(false)
  }

  useEffect(() => {
    if (preview.open && preview.mode === 'video') stopPreview()
  }, [preview.mode, preview.open])

  useEffect(() => () => {
    audioRef.current?.pause()
    voiceAudioRef.current?.pause()
  }, [])

  async function playPreview(validAudioRange) {
    const primaryAudio = musicFile ? audioRef.current : voiceAudioRef.current
    if (!primaryAudio || !validAudioRange) return
    primaryAudio.pause()
    primaryAudio.currentTime = startTime
    primaryAudio.volume = musicFile ? musicVolume / 100 : voiceVolume / 100
    try {
      await primaryAudio.play()
      if (musicFile && voiceAudioRef.current && voiceUrl) {
        voiceAudioRef.current.currentTime = 0
        voiceAudioRef.current.volume = voiceVolume / 100
        await voiceAudioRef.current.play().catch(() => {})
      }
      setIsPreviewing(true)
      setError('')
    } catch {
      setIsPreviewing(false)
      setError('Audio preview could not be started.')
    }
  }

  function handlePreviewTimeUpdate(event, endTime) {
    const audio = event.currentTarget
    if (isPreviewing && audio.currentTime >= endTime) {
      audio.pause()
      audio.currentTime = endTime
      voiceAudioRef.current?.pause()
      setIsPreviewing(false)
    }
  }

  function handleVoiceTimeUpdate(event, musicFile, endTime) {
    if (!musicFile) handlePreviewTimeUpdate(event, endTime)
  }

  function handleMusicVolumeChange(event) {
    const nextVolume = Number(event.target.value)
    setVideoAudio((current) => ({ ...current, musicVolume: nextVolume }))
    if (audioRef.current) audioRef.current.volume = nextVolume / 100
  }

  function handleVoiceVolumeChange(event) {
    const nextVolume = Number(event.target.value)
    setVideoAudio((current) => ({ ...current, voiceVolume: nextVolume }))
    if (voiceAudioRef.current) voiceAudioRef.current.volume = nextVolume / 100
  }

  return {
    audioRef,
    voiceAudioRef,
    isPreviewing,
    setIsPreviewing,
    stopPreview,
    playPreview,
    handlePreviewTimeUpdate,
    handleVoiceTimeUpdate,
    handleMusicVolumeChange,
    handleVoiceVolumeChange,
  }
}