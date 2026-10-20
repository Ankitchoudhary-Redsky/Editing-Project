import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal'

export async function removeImageBackground(
  source: string,
  onProgress?: (message: string) => void,
): Promise<string> {
  const result = await imglyRemoveBackground(source, {
    progress: (key, current, total) => {
      const percent = total > 0
        ? Math.round((current / total) * 100)
        : 0

      onProgress?.(`${key.replaceAll(':', ' ')} — ${percent}%`)
    },
  })

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Could not convert the result to an image.'))
      }
    }

    reader.onerror = () => {
      reject(new Error('Could not read the background-removal result.'))
    }

    reader.readAsDataURL(result)
  })
}

export async function hasTransparentPixels(
  source: string,
): Promise<boolean> {
  const image = new Image()
  image.src = source
  await image.decode()

  const sample = document.createElement('canvas')
  sample.width = 64
  sample.height = 64

  const context = sample.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) return false

  context.drawImage(image, 0, 0, 64, 64)

  const pixels = context.getImageData(0, 0, 64, 64).data

  for (let i = 3; i < pixels.length; i += 4) {
    if (pixels[i] < 250) return true
  }

  return false
}