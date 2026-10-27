import logoUrl from '../../../assets/logo.png'

export async function drawProjectWatermark(canvas: HTMLCanvasElement) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the project watermark.')

  const logo = new Image()
  logo.src = logoUrl
  await logo.decode()

  const fontSize = Math.max(14, Math.round(canvas.width * 0.022))
  const logoSize = fontSize * 1.35
  const gap = Math.round(fontSize * 0.3)
  const margin = Math.max(12, Math.round(canvas.width * 0.018))

  context.save()
  context.textBaseline = 'middle'
  context.font = `700 ${fontSize}px Georgia, serif`
  const eWidth = context.measureText('e').width
  context.font = `400 ${fontSize}px Georgia, serif`
  const studioWidth = context.measureText('studio').width
  const watermarkWidth = logoSize + gap + eWidth + studioWidth
  const left = Math.max(0, canvas.width - watermarkWidth - margin)
  const top = Math.max(0, canvas.height - logoSize - margin)

  context.drawImage(logo, left, top, logoSize, logoSize)
  const textLeft = left + logoSize + gap
  context.font = `700 ${fontSize}px Georgia, serif`
  context.fillStyle = '#213421'
  context.fillText('e', textLeft, top + logoSize / 2)
  context.font = `400 ${fontSize}px Georgia, serif`
  context.fillStyle = '#32745d'
  context.fillText('studio', textLeft + eWidth, top + logoSize / 2)
  context.restore()
}