export function drawProjectWatermark(
  canvas: HTMLCanvasElement,
//   projectName: string,
) {
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not prepare the project watermark.')

  const fontSize = Math.max(14, Math.round(canvas.width * 0.022))
  const paddingX = Math.round(fontSize * 0.75)
  const paddingY = Math.round(fontSize * 0.5)
  const margin = Math.max(12, Math.round(canvas.width * 0.018))
//   const label = `By eStudio - ${projectName.trim() || 'Untitled design'}`
  const label = `By eStudio`
  const maxTextWidth = Math.max(1, canvas.width * 0.72 - paddingX * 2)

  context.save()
  context.font = `600 ${fontSize}px sans-serif`
  context.textBaseline = 'middle'
  const textWidth = Math.min(context.measureText(label).width, maxTextWidth)
  const boxWidth = textWidth + paddingX * 2
  const boxHeight = fontSize + paddingY * 2
  const left = Math.max(0, canvas.width - boxWidth - margin)
  const top = Math.max(0, canvas.height - boxHeight - margin)

  context.fillStyle = 'rgba(18, 26, 22, 0.68)'
  context.fillRect(left, top, boxWidth, boxHeight)
  context.fillStyle = '#ffffff'
  context.fillText(label, left + paddingX, top + boxHeight / 2, maxTextWidth)
  context.restore()
}