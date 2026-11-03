
import { Control, type FabricObject } from 'fabric'
import { Copy, Trash2 } from 'lucide-react'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

// Convert Lucide SVG icons into browser images
function createLucideImage(
  Icon: typeof Copy,
  color: string
): HTMLImageElement {
  const svg = renderToStaticMarkup(
    createElement(Icon, {
      size: 28,
      color,
      strokeWidth: 2.2,
    })
  )

  const image = new Image()

  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`

  return image
}

// Lucide icons
const duplicateIcon = createLucideImage(Copy, '#000000')
const deleteIcon = createLucideImage(Trash2, '#bc2727')

export function attachDeleteControl(object: FabricObject) {
  if (object.controls.deleteObject && object.controls.duplicateObject) return

  object.controls = {
    ...object.controls,

    // DUPLICATE CONTROL
    duplicateObject: new Control({
      x: 0.5,
      y: -0.5,
      offsetX: -78,
      offsetY: -37,
      sizeX: 72,
      sizeY: 72,
      cursorStyle: 'pointer',
      actionName: 'duplicate',

      mouseUpHandler: async (_eventData, transform) => {
        const target = transform.target
        const canvas = target.canvas

        if (!canvas) return false

        const clone = await target.clone()

        clone.set({
          left: (target.left ?? 0) + 24,
          top: (target.top ?? 0) + 24,
          name: `${target.get('name') || 'Object'} copy`,
        })

        canvas.add(clone)
        canvas.setActiveObject(clone)
        canvas.requestRenderAll()

        return true
      },

      render: (context, left, top) => {
        context.save()
        context.translate(left, top)

        // White circular background
        context.shadowColor = 'rgba(0, 0, 0, 0.12)'
        context.shadowBlur = 8
        context.shadowOffsetY = 2
        context.fillStyle = '#ffffff'

        context.beginPath()
        context.arc(0, 0, 32, 0, Math.PI * 2)
        context.fill()

        // Reset shadow
        context.shadowColor = 'transparent'
        context.shadowBlur = 0
        context.shadowOffsetY = 0

        // Lucide Copy icon
        if (duplicateIcon.complete && duplicateIcon.naturalWidth > 0) {
          context.drawImage(
            duplicateIcon,
            -14,
            -14,
            28,
            28
          )
        }

        context.restore()
      },
    }),

    // DELETE CONTROL
    deleteObject: new Control({
      x: 0.5,
      y: -0.5,
      offsetY: -37,
      sizeX: 72,
      sizeY: 72,
      cursorStyle: 'pointer',
      actionName: 'delete',

      mouseUpHandler: (_eventData, transform) => {
        const target = transform.target
        const canvas = target.canvas

        if (!canvas) return false

        const shapeId = target.get('shapeId')

        const linkedObjects = shapeId
          ? canvas.getObjects().filter(
              (item) =>
                item !== target &&
                (
                  item.get('textParentId') === shapeId ||
                  item.get('imageParentId') === shapeId
                )
            )
          : []

        canvas.remove(...linkedObjects, target)
        canvas.discardActiveObject()
        canvas.requestRenderAll()

        return true
      },

      render: (context, left, top) => {
        context.save()
        context.translate(left, top)

        // White circular background
        context.shadowColor = 'rgba(0, 0, 0, 0.12)'
        context.shadowBlur = 8
        context.shadowOffsetY = 2
        context.fillStyle = '#ffffff'

        context.beginPath()
        context.arc(0, 0, 32, 0, Math.PI * 2)
        context.fill()

        // Reset shadow
        context.shadowColor = 'transparent'
        context.shadowBlur = 0
        context.shadowOffsetY = 0

        // Lucide Trash2 icon
        if (deleteIcon.complete && deleteIcon.naturalWidth > 0) {
          context.drawImage(
            deleteIcon,
            -14,
            -14,
            28,
            28
          )
        }

        context.restore()
      },
    }),
  }
}
