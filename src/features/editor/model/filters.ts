
import type { FilterId } from './types'

export const filterPresets: { id: FilterId; name: string; description: string }[] = [
  { id: 'original', name: 'Original', description: 'Natural colors' },
  { id: 'grayscale', name: 'Grayscale', description: 'Classic gray tones' },
  { id: 'blackWhite', name: 'B&W', description: 'High-contrast monochrome' },
  { id: 'sepia', name: 'Sepia', description: 'Warm brown tones' },
  { id: 'vintage', name: 'Vintage', description: 'Faded film look' },
  { id: 'retro', name: 'Retro', description: 'Old-school colors' },
  { id: 'warm', name: 'Warm', description: 'Golden colors' },
  { id: 'cool', name: 'Cool', description: 'Cool blue tones' },
  { id: 'vivid', name: 'Vivid', description: 'Rich colors' },
  { id: 'cinematic', name: 'Cinematic', description: 'Moody color grading' },
  { id: 'dramatic', name: 'Dramatic', description: 'Strong contrast' },
  { id: 'fade', name: 'Fade', description: 'Soft, faded colors' },
  { id: 'pastel', name: 'Pastel', description: 'Light pastel tones' },
  { id: 'noir', name: 'Noir', description: 'Dark monochrome' },
  { id: 'dreamy', name: 'Dreamy', description: 'Soft, airy colors' },
]

const identity = [
  1, 0, 0, 0, 0,
  0, 1, 0, 0, 0,
  0, 0, 1, 0, 0,
  0, 0, 0, 1, 0,
]

const grayscale = [
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 1, 0,
]

const matrices: Partial<Record<FilterId, number[]>> = {
  grayscale,
  blackWhite: [
    0.45, 0.45, 0.1, 0, -0.06,
    0.45, 0.45, 0.1, 0, -0.06,
    0.45, 0.45, 0.1, 0, -0.06,
    0, 0, 0, 1, 0,
  ],
  sepia: [
    0.393, 0.769, 0.189, 0, 0,
    0.349, 0.686, 0.168, 0, 0,
    0.272, 0.534, 0.131, 0, 0,
    0, 0, 0, 1, 0,
  ],
  vintage: [
    0.48, 0.62, 0.12, 0, 0.025,
    0.32, 0.65, 0.12, 0, 0.015,
    0.22, 0.43, 0.20, 0, 0.005,
    0, 0, 0, 1, 0,
  ],
  retro: [
    1.12, 0.02, 0, 0, 0.02,
    0.02, 0.94, 0.02, 0, 0.01,
    0, 0.04, 0.78, 0, 0.015,
    0, 0, 0, 1, 0,
  ],
  warm: [
    1.08, 0.02, 0, 0, 0.015,
    0, 1.02, 0, 0, 0.005,
    0, 0, 0.88, 0, 0,
    0, 0, 0, 1, 0,
  ],
  cool: [
    0.92, 0, 0, 0, 0,
    0, 1, 0, 0, 0.005,
    0, 0.02, 1.12, 0, 0.02,
    0, 0, 0, 1, 0,
  ],
  vivid: [
    1.2, -0.1, -0.1, 0, 0,
    -0.1, 1.2, -0.1, 0, 0,
    -0.1, -0.1, 1.2, 0, 0,
    0, 0, 0, 1, 0,
  ],
  cinematic: [
    0.95, 0.02, 0, 0, 0.015,
    0, 0.96, 0.02, 0, 0.005,
    0.02, 0.08, 0.92, 0, 0.015,
    0, 0, 0, 1, 0,
  ],
  dramatic: [
    1.25, 0, 0, 0, -0.1,
    0, 1.25, 0, 0, -0.1,
    0, 0, 1.25, 0, -0.1,
    0, 0, 0, 1, 0,
  ],
  fade: [
    0.85, 0.05, 0.05, 0, 0.08,
    0.05, 0.85, 0.05, 0, 0.08,
    0.05, 0.05, 0.85, 0, 0.08,
    0, 0, 0, 1, 0,
  ],
  pastel: [
    0.85, 0.05, 0.05, 0, 0.12,
    0.05, 0.85, 0.05, 0, 0.12,
    0.05, 0.05, 0.85, 0, 0.12,
    0, 0, 0, 1, 0,
  ],
  noir: [
    0.2126, 0.7152, 0.0722, 0, -0.12,
    0.2126, 0.7152, 0.0722, 0, -0.12,
    0.2126, 0.7152, 0.0722, 0, -0.12,
    0, 0, 0, 1, 0,
  ],
  dreamy: [
    0.92, 0.04, 0.04, 0, 0.08,
    0.04, 0.92, 0.04, 0, 0.06,
    0.04, 0.04, 0.92, 0, 0.08,
    0, 0, 0, 1, 0,
  ],
}

export function createPresetMatrix(id: FilterId, intensity: number): number[] | null {
  const preset = matrices[id]
  if (!preset || id === 'original') return null

  const amount = Math.max(0, Math.min(100, intensity)) / 100
  return preset.map((value, index) => {
    return identity[index] + (value - identity[index]) * amount
  })
}
