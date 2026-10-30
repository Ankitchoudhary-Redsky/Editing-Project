export function useVideoAudioActions({
  videoAudio,
  setVideoAudio,
  stopPreview,
  resetExportState,
  setError,
  setIsPreviewing,
}) {
  const {
    music: { file: musicFile, url: musicUrl },
    voice: { file: voiceFile, url: voiceUrl },
  } = videoAudio

  const updateMusicTrack = (updates) =>
    setVideoAudio((current) => ({
      ...current,
      music: { ...current.music, ...updates },
    }))
  const updateVoiceTrack = (updates) =>
    setVideoAudio((current) => ({
      ...current,
      voice: { ...current.voice, ...updates },
    }))

  const setMusicFile = (file) => updateMusicTrack({ file })
  const setMusicUrl = (url) => updateMusicTrack({ url })
  const setAudioDuration = (duration) => updateMusicTrack({ duration })
  const setVoiceFile = (file) => updateVoiceTrack({ file })
  const setVoiceUrl = (url) => updateVoiceTrack({ url })
  const setVoiceDuration = (duration) => updateVoiceTrack({ duration })
  const setStartTime = (value) =>
    setVideoAudio((current) => ({ ...current, startTime: value }))
  const setEndTime = (value) =>
    setVideoAudio((current) => ({ ...current, endTime: value }))

  function handleMusicChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    stopPreview()
    if (!file.type.startsWith('audio/')) {
      setError('Please select a valid audio file.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Audio file must be 50 MB or smaller.')
      return
    }
    if (musicUrl) URL.revokeObjectURL(musicUrl)
    setMusicFile(file)
    setMusicUrl(URL.createObjectURL(file))
    setAudioDuration(0)
    setStartTime(0)
    setEndTime(0)
    resetExportState()
    setError('')
  }

  function handleVoiceMetadata(event) {
    const loadedDuration = event.currentTarget.duration
    if (!Number.isFinite(loadedDuration) || loadedDuration <= 0) {
      setVoiceDuration(0)
      setError('Could not read the duration of this voice-over.')
      return
    }
    setVoiceDuration(loadedDuration)
    if (!musicFile) {
      setStartTime(0)
      setEndTime(loadedDuration)
    }
    setError('')
  }

  function handleAudioMetadata(event) {
    const loadedDuration = event.currentTarget.duration
    if (!Number.isFinite(loadedDuration) || loadedDuration <= 0) {
      setAudioDuration(0)
      setError('Could not read the duration of this audio file.')
      return
    }
    setAudioDuration(loadedDuration)
    setStartTime(0)
    setEndTime(loadedDuration)
    setError('')
  }

  function handleVoiceAudioError() {
    setVoiceDuration(0)
    setIsPreviewing(false)
    setError('This voice-over file could not be loaded or is not supported.')
  }

  function handleAudioError() {
    setAudioDuration(0)
    setIsPreviewing(false)
    setError('This audio file could not be loaded or is not supported.')
  }

  return {
    musicFile,
    musicUrl,
    voiceFile,
    voiceUrl,
    setStartTime,
    setEndTime,
    setVoiceFile,
    setVoiceUrl,
    setVoiceDuration,
    handleMusicChange,
    handleVoiceMetadata,
    handleAudioMetadata,
    handleVoiceAudioError,
    handleAudioError,
  }
}