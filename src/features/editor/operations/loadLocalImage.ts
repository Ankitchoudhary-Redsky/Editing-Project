import { FabricImage } from 'fabric'
import type { Dimensions } from '../model/types'

export type LoadedLocalImage = {
  image: FabricImage
  source: string
  dimensions: Dimensions
  thumbnail: string
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Image data is invalid'))
    reader.onerror = () => reject(new Error('Image could not be read'))
    reader.readAsDataURL(file)
  })
}

export async function loadLocalImage(file: File): Promise<LoadedLocalImage> {
  const source = await readFileAsDataUrl(file)
  const image = await FabricImage.fromURL(source)
  const width = image.width ?? 0
  const height = image.height ?? 0
  if (!width || !height || width > 12000 || height > 12000) {
    throw new Error('This image has invalid or unsupported dimensions.')
  }

  const thumbnailCanvas = document.createElement('canvas')
  thumbnailCanvas.width = 96
  thumbnailCanvas.height = 96
  const context = thumbnailCanvas.getContext('2d')
  const scale = Math.min(96 / width, 96 / height)
  if (context) context.drawImage(image.getElement(), (96 - width * scale) / 2, (96 - height * scale) / 2, width * scale, height * scale)

  return {
    image,
    source,
    dimensions: { width, height },
    thumbnail: thumbnailCanvas.toDataURL('image/jpeg', 0.8),
  }
}