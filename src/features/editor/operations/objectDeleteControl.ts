import { Control, type FabricObject } from 'fabric'

export function attachDeleteControl(object: FabricObject) {
  if (object.controls.deleteObject) return

  object.controls = {
    ...object.controls,
    deleteObject: new Control({
      x: 0.5,
      y: -0.5,
      offsetY: -14,
      sizeX: 24,
      sizeY: 24,
      cursorStyle: 'pointer',
      actionName: 'delete',
      mouseUpHandler: (_eventData, transform) => {
        const target = transform.target
        const canvas = target.canvas
        if (!canvas) return false

        const shapeId = target.get('shapeId')
        const linkedObjects = shapeId
          ? canvas.getObjects().filter((item) => item !== target && (
            item.get('textParentId') === shapeId || item.get('imageParentId') === shapeId
          ))
          : []
        canvas.remove(...linkedObjects, target)
        canvas.discardActiveObject()
        canvas.requestRenderAll()
        return true
      },
      render: (context, left, top) => {
        context.save()
        context.translate(left, top)
        context.shadowColor = 'rgba(24, 35, 29, 0.2)'
        context.shadowBlur = 4
        context.shadowOffsetY = 1
        context.fillStyle = '#c84f4a'
        context.beginPath()
        context.arc(0, 0, 10, 0, Math.PI * 2)
        context.fill()
        context.shadowColor = 'transparent'
        context.shadowBlur = 0
        context.shadowOffsetY = 0
        context.strokeStyle = '#ffffff'
        context.lineWidth = 1.4
        context.lineCap = 'round'
        context.lineJoin = 'round'
        context.beginPath()
        context.moveTo(-3.5, -4)
        context.lineTo(3.5, -4)
        context.moveTo(-1.5, -6)
        context.lineTo(1.5, -6)
        context.moveTo(-2.5, -3)
        context.lineTo(-2, 5)
        context.lineTo(2, 5)
        context.lineTo(2.5, -3)
        context.moveTo(-0.7, -2)
        context.lineTo(-0.7, 3)
        context.moveTo(0.7, -2)
        context.lineTo(0.7, 3)
        context.stroke()
        context.restore()
      },
    }),
  }
}