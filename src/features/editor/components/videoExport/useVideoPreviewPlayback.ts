import { useEffect, useRef, useState } from 'react'
import type { VideoPreviewData } from '../../model/types'

function playPreviewTracks(
  music: HTMLAudioElement,
  voice: HTMLAudioElement | null,
  video: VideoPreviewData,
): Promise<void[]> {
  const tracks = [music, ...(voice && video.voiceOverUrl ? [voice] : [])]
  const ready = tracks.every(
    (track) => track.readyState >= HTMLMediaElement.HAVE_METADATA,
  )

  if (!ready) {
    return Promise.all(
      tracks.map(
        (track) =>
          new Promise<void>((resolve, reject) => {
            if (track.readyState >= HTMLMediaElement.HAVE_METADATA) {
              resolve()
            } else if (track.error) {
              reject(new Error('Could not load a preview audio track.'))
            } else {
              track.addEventListener('loadedmetadata', () => resolve(), { once: true })
              track.addEventListener('error', () => reject(new Error('Could not load a preview audio track.')), { once: true })
            }
          }),
      ),
    ).then(() => playPreviewTracks(music, voice, video))
  }

  music.currentTime = video.startTime
  music.volume = video.volume / 100

  if (voice && video.voiceOverUrl) {
    voice.currentTime = video.voiceOverStartTime ?? 0
    voice.volume = (video.voiceOverVolume ?? 100) / 100
  }

  return Promise.all([
    music.play(),
    voice && video.voiceOverUrl ? voice.play() : Promise.resolve(),
  ]).catch((error: unknown) => {
    music.pause()
    voice?.pause()
    throw error
  })
}

export function useVideoPreviewPlayback(video: VideoPreviewData) {
  const musicRef = useRef<HTMLAudioElement>(null)
  const voiceRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const duration = Math.max(0, video.endTime - video.startTime)

  useEffect(() => {
    const music = musicRef.current
    const voice = voiceRef.current
    let cancelled = false
    if (!music || !video.audioUrl) return

    void playPreviewTracks(music, voice, video)
      .then(() => {
        if (!cancelled) setIsPlaying(true)
        else {
          music.pause()
          voice?.pause()
        }
      })
      .catch(() => {
        if (!cancelled) setIsPlaying(false)
      })

    return () => {
      cancelled = true
      music.pause()
      voice?.pause()
    }
  }, [video])

  function handleTimeUpdate() {
    const music = musicRef.current
    const voice = voiceRef.current
    if (!music) return

    if (music.currentTime >= video.endTime) {
      music.pause()
      music.currentTime = video.endTime
      voice?.pause()
      setElapsed(duration)
      setIsPlaying(false)
      return
    }

    if (music.currentTime < video.startTime) {
      music.currentTime = video.startTime
      return
    }

    const currentElapsed = Math.min(duration, music.currentTime - video.startTime)
    setElapsed(currentElapsed)

    if (voice && video.voiceOverUrl && !voice.paused && voice.readyState >= HTMLMediaElement.HAVE_METADATA) {
      const expectedVoiceTime = (video.voiceOverStartTime ?? 0) + currentElapsed
      if (expectedVoiceTime < voice.duration && Math.abs(voice.currentTime - expectedVoiceTime) > 0.2) {
        voice.currentTime = expectedVoiceTime
      }
    }
  }

  function togglePlayback() {
    const music = musicRef.current
    const voice = voiceRef.current
    if (!music) return

    if (music.paused) {
      void playPreviewTracks(music, voice, video)
        .then(() => setIsPlaying(true))
        .catch(() => setIsPlaying(false))
    } else {
      music.pause()
      voice?.pause()
      setIsPlaying(false)
    }
  }

  function seekPreview(value: number) {
    const music = musicRef.current
    const voice = voiceRef.current
    if (!music) return

    const nextElapsed = Math.max(0, Math.min(duration, value))
    music.currentTime = video.startTime + nextElapsed
    setElapsed(nextElapsed)

    if (nextElapsed >= duration) {
      music.pause()
      voice?.pause()
      setIsPlaying(false)
      return
    }

    if (voice && video.voiceOverUrl) {
      const voiceTime = (video.voiceOverStartTime ?? 0) + nextElapsed
      if (voiceTime < voice.duration) {
        voice.currentTime = voiceTime
        if (isPlaying && voice.paused) void voice.play().catch(() => {})
      } else {
        voice.pause()
      }
    }
  }

  return {
    musicRef,
    voiceRef,
    isPlaying,
    elapsed,
    duration,
    setIsPlaying,
    handleTimeUpdate,
    togglePlayback,
    seekPreview,
  }
}