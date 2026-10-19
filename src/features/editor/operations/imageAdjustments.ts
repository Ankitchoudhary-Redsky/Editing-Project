import { FabricImage, filters } from 'fabric'

export function applyImageAdjustments(image: FabricImage, brightness: number, contrast: number, saturation: number) {
  image.filters = []
  if (brightness !== 0) image.filters.push(new filters.Brightness({ brightness: brightness / 100 }))
  if (contrast !== 0) image.filters.push(new filters.Contrast({ contrast: contrast / 100 }))
  if (saturation !== 0) image.filters.push(new filters.Saturation({ saturation: saturation / 100 }))
  image.applyFilters()
}