
import { FabricImage, filters } from 'fabric'
import type { FilterId } from '../model/types'
import { createPresetMatrix } from '../model/filters'

export function applyImageAdjustments(image: FabricImage, brightness: number, contrast: number, saturation: number, filterId: FilterId = 'original', intensity = 100, preview = false) {
  image.filters = []
  if (preview) {
    const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
    if (scale < 1) {
      image.filters.push(new filters.Resize({ scaleX: scale, scaleY: scale, resizeType: 'bilinear' }))
    }
  }
  const matrix = createPresetMatrix(filterId, intensity)
  if (matrix) {
    image.filters.push(
      new filters.ColorMatrix({ matrix, colorsOnly: true }),
    )
  }
  if (brightness !== 0) {
    image.filters.push(new filters.Brightness({ brightness: brightness / 100 }))
  }
  if (contrast !== 0) {
    image.filters.push(new filters.Contrast({ contrast: contrast / 100 }))
  }
  if (saturation !== 0) {
    image.filters.push(new filters.Saturation({ saturation: saturation / 100 }))
  }
  image.applyFilters()
}
