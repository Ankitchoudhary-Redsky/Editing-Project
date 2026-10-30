export type GridLayoutId = 'side-by-side' | 'stacked' | 'four-grid' | 'three-columns' | 'feature-left' | 'feature-top'

export type GridCellBounds = { id: string; index: number; left: number; top: number; width: number; height: number }

type NormalizedCell = { x: number; y: number; width: number; height: number }

const layoutCells: Record<GridLayoutId, NormalizedCell[]> = {
  'side-by-side': [
    { x: 0, y: 0, width: 0.5, height: 1 },
    { x: 0.5, y: 0, width: 0.5, height: 1 },
  ],
  stacked: [
    { x: 0, y: 0, width: 1, height: 0.5 },
    { x: 0, y: 0.5, width: 1, height: 0.5 },
  ],
  'four-grid': [
    { x: 0, y: 0, width: 0.5, height: 0.5 },
    { x: 0.5, y: 0, width: 0.5, height: 0.5 },
    { x: 0, y: 0.5, width: 0.5, height: 0.5 },
    { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
  ],
  'three-columns': [
    { x: 0, y: 0, width: 1 / 3, height: 1 },
    { x: 1 / 3, y: 0, width: 1 / 3, height: 1 },
    { x: 2 / 3, y: 0, width: 1 / 3, height: 1 },
  ],
  'feature-left': [
    { x: 0, y: 0, width: 0.62, height: 1 },
    { x: 0.62, y: 0, width: 0.38, height: 0.5 },
    { x: 0.62, y: 0.5, width: 0.38, height: 0.5 },
  ],
  'feature-top': [
    { x: 0, y: 0, width: 1, height: 0.58 },
    { x: 0, y: 0.58, width: 0.5, height: 0.42 },
    { x: 0.5, y: 0.58, width: 0.5, height: 0.42 },
  ],
}

export function getGridCells(layoutId: GridLayoutId, canvasWidth = 1200, canvasHeight = 900, gap = 12): GridCellBounds[] {
  const safeGap = Math.max(0, Math.min(64, gap))
  return layoutCells[layoutId].map((cell, index) => {
    const horizontalInset = safeGap * (1 - cell.width)
    const verticalInset = safeGap * (1 - cell.height)
    return {
      id: `cell-${index + 1}`,
      index: index + 1,
      left: cell.x * canvasWidth + (cell.x > 0 ? safeGap / 2 : 0),
      top: cell.y * canvasHeight + (cell.y > 0 ? safeGap / 2 : 0),
      width: cell.width * canvasWidth - horizontalInset,
      height: cell.height * canvasHeight - verticalInset,
    }
  })
}

export async function loadImageElement(source: string, remote = false): Promise<HTMLImageElement> {
  const image = new Image()
  if (remote) image.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('This image URL could not be loaded. The host may block cross-origin access.'))
    image.src = source
  })
  if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth > 12000 || image.naturalHeight > 12000) {
    throw new Error('This image has invalid or unsupported dimensions.')
  }
  return image
}

export function cropImageToCell(source: CanvasImageSource, sourceWidth: number, sourceHeight: number, width: number, height: number) {
  const output = document.createElement('canvas')
  output.width = Math.max(1, Math.round(width))
  output.height = Math.max(1, Math.round(height))
  const context = output.getContext('2d')
  if (!context) throw new Error('Could not prepare this image for its grid cell.')

  const scale = Math.max(output.width / sourceWidth, output.height / sourceHeight)
  const cropWidth = output.width / scale
  const cropHeight = output.height / scale
  const cropX = (sourceWidth - cropWidth) / 2
  const cropY = (sourceHeight - cropHeight) / 2
  context.drawImage(source, cropX, cropY, cropWidth, cropHeight, 0, 0, output.width, output.height)

  try {
    return output.toDataURL('image/jpeg', 0.9)
  } catch {
    throw new Error('The image host blocks canvas access. Try downloading the image and choosing it from your device.')
  }
}