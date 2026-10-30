import { useEffect, useState } from 'react'
import { WAVEFORM_BAR_COUNT } from './videoExportUtils'

export function useAudioWaveform(waveformFile) {
  const [waveformPeaks, setWaveformPeaks] = useState([])

  useEffect(() => {
    let cancelled = false
    let audioContext

    async function createWaveform() {
      if (!waveformFile) {
        setWaveformPeaks([])
        return
      }

      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      if (!AudioContextClass) {
        setWaveformPeaks([])
        return
      }

      try {
        audioContext = new AudioContextClass()
        const audioBuffer = await audioContext.decodeAudioData(await waveformFile.arrayBuffer())
        const peaks = Array.from({ length: WAVEFORM_BAR_COUNT }, (_, index) => {
          const start = Math.floor((index * audioBuffer.length) / WAVEFORM_BAR_COUNT)
          const end = Math.max(
            start + 1,
            Math.floor(((index + 1) * audioBuffer.length) / WAVEFORM_BAR_COUNT),
          )
          let peak = 0

          for (let channel = 0; channel < audioBuffer.numberOfChannels; channel += 1) {
            const samples = audioBuffer.getChannelData(channel)
            for (let sample = start; sample < end; sample += 1) {
              peak = Math.max(peak, Math.abs(samples[sample] || 0))
            }
          }
          return peak
        })

        if (!cancelled) setWaveformPeaks(peaks)
      } catch {
        if (!cancelled) setWaveformPeaks([])
      } finally {
        if (audioContext && audioContext.state !== 'closed') {
          await audioContext.close().catch(() => {})
        }
      }
    }

    createWaveform()
    return () => {
      cancelled = true
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(() => {})
      }
    }
  }, [waveformFile])

  return waveformPeaks
}
