export type EditPoint = {
  x: number
  y: number
}

export type PixelEditMode = 'brush' | 'lasso'

export async function editImagePixels(
  source: string,
  canvasWidth: number,
  canvasHeight: number,
  points: EditPoint[],
  brushSize: number,
  mode: PixelEditMode,
): Promise<string> {
  if (points.length === 0) {
    throw new Error('Draw an area to edit first.')
  }

  const image = new Image()
  image.src = source
  await image.decode()

  const output = document.createElement('canvas')
  output.width = image.naturalWidth
  output.height = image.naturalHeight

  const context = output.getContext('2d', {
    willReadFrequently: true,
  })

  if (!context) {
    throw new Error('Could not edit this image.')
  }

  context.drawImage(image, 0, 0)

  const scaleX = output.width / canvasWidth
  const scaleY = output.height / canvasHeight

  context.save()
  context.globalCompositeOperation = 'destination-out'
  context.lineCap = 'round'
  context.lineJoin = 'round'

  if (mode === 'brush') {
    context.strokeStyle = '#000'
    context.fillStyle = '#000'
    context.lineWidth = brushSize * ((scaleX + scaleY) / 2)
    context.beginPath()
    context.moveTo(points[0].x * scaleX, points[0].y * scaleY)

    for (const point of points.slice(1)) {
      context.lineTo(point.x * scaleX, point.y * scaleY)
    }

    if (points.length === 1) {
      context.arc(
        points[0].x * scaleX,
        points[0].y * scaleY,
        (brushSize * (scaleX + scaleY)) / 4,
        0,
        Math.PI * 2,
      )
      context.fill()
    } else {
      context.stroke()
    }
  } else {
    if (points.length < 3) {
      context.restore()
      throw new Error('Draw a larger closed selection first.')
    }

    context.beginPath()
    context.moveTo(points[0].x * scaleX, points[0].y * scaleY)

    for (const point of points.slice(1)) {
      context.lineTo(point.x * scaleX, point.y * scaleY)
    }

    context.closePath()
    context.fill()
  }

  context.restore()
  return output.toDataURL('image/png')
}