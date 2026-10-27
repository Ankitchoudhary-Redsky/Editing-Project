import { useEffect, useRef, useState } from 'react'

export function useVoiceRecorder({
  voiceUrl,
  musicFile,
  setVoiceFile,
  setVoiceUrl,
  setVoiceDuration,
  setStartTime,
  setEndTime,
  stopPreview,
  setError,
}) {
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const voiceRecorderRef = useRef(null)
  const voiceStreamRef = useRef(null)
  const voiceChunksRef = useRef([])

  useEffect(() => () => {
    if (voiceRecorderRef.current?.state === 'recording') {
      voiceRecorderRef.current.stop()
    }
    voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  function setVoiceAudioFile(file) {
    if (!file) return
    if (!file.type.startsWith('audio/')) {
      setError('Please select a valid voice-over audio file.')
      return
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('Voice-over audio must be 50 MB or smaller.')
      return
    }

    stopPreview()
    setVoiceDuration(0)
    if (!musicFile) {
      setStartTime(0)
      setEndTime(0)
    }
    if (voiceUrl) URL.revokeObjectURL(voiceUrl)
    const url = URL.createObjectURL(file)
    setVoiceFile(file)
    setVoiceUrl(url)
    setError('')
  }

  function handleVoiceChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    setVoiceAudioFile(file)
  }

  async function startVoiceRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Voice recording is not supported in this browser. Please upload an audio file instead.')
      return
    }

    try {
      setError('')
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      voiceStreamRef.current = stream
      voiceChunksRef.current = []

      const preferredType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type))
      const recorder = preferredType
        ? new MediaRecorder(stream, { mimeType: preferredType })
        : new MediaRecorder(stream)
      voiceRecorderRef.current = recorder

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) voiceChunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setError('Voice recording failed. Please try again or upload an audio file.')
        setIsRecordingVoice(false)
        stream.getTracks().forEach((track) => track.stop())
        voiceStreamRef.current = null
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm'
        const blob = new Blob(voiceChunksRef.current, { type: mimeType })
        const extension = mimeType.includes('mp4') ? 'm4a' : 'webm'
        if (blob.size > 0) {
          setVoiceAudioFile(new File([blob], `voice-over-${Date.now()}.${extension}`, { type: mimeType }))
        }
        stream.getTracks().forEach((track) => track.stop())
        if (voiceStreamRef.current === stream) voiceStreamRef.current = null
        setIsRecordingVoice(false)
      }

      recorder.start()
      setIsRecordingVoice(true)
    } catch (recordingError) {
      setError(
        recordingError?.name === 'NotAllowedError'
          ? 'Microphone permission was denied. Allow microphone access or upload an audio file.'
          : 'Could not access the microphone. Please upload an audio file instead.',
      )
      voiceStreamRef.current?.getTracks().forEach((track) => track.stop())
      voiceStreamRef.current = null
      setIsRecordingVoice(false)
    }
  }

  function stopVoiceRecording() {
    if (voiceRecorderRef.current?.state === 'recording') {
      voiceRecorderRef.current.stop()
    }
  }

  function clearVoiceOver() {
    stopPreview()
    if (voiceUrl) URL.revokeObjectURL(voiceUrl)
    setVoiceUrl('')
    setVoiceFile(null)
    setVoiceDuration(0)
    if (!musicFile) {
      setStartTime(0)
      setEndTime(0)
    }
    setError('')
  }

  return {
    isRecordingVoice,
    handleVoiceChange,
    startVoiceRecording,
    stopVoiceRecording,
    clearVoiceOver,
  }
}
