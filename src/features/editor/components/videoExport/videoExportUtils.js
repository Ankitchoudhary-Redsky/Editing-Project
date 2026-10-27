export const FPS = 30
export const WAVEFORM_BAR_COUNT = 160

export function formatTime(seconds) {
  const totalSeconds = Math.max(0, Math.floor(seconds))
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
}

export function getAudioExtension(file) {
  const extension = file.name.match(/\.([a-z0-9]{1,8})$/i)?.[1]
  if (extension) return extension.toLowerCase()

  const extensionsByType = {
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/x-wav': 'wav',
  }
  return extensionsByType[file.type] || 'audio'
}
