import { Canvas, IText, Shadow } from 'fabric'
import type { NewTextOptions } from '../model/types'

export function createTextObject(canvas: Canvas, options: NewTextOptions) {
  const text = new IText(options.value || 'Your text here', {
    left: canvas.getWidth() * 0.2,
    top: canvas.getHeight() * 0.35,
    fontFamily: options.fontFamily,
    fontSize: options.fontSize,
    fill: options.color,
    stroke: options.outlineWidth > 0 ? options.outline : undefined,
    strokeWidth: options.outlineWidth,
    opacity: options.opacity / 100,
    shadow: options.shadow === 'none' ? null : new Shadow({ color: 'rgba(12, 20, 17, 0.48)', blur: options.shadow === 'soft' ? 12 : 3, offsetX: 2, offsetY: options.shadow === 'soft' ? 5 : 3 }),
    editable: true,
    cornerColor: '#2c7660',
    transparentCorners: false,
    name: 'Text',
  })
  canvas.add(text)
  canvas.setActiveObject(text)
  canvas.requestRenderAll()
  text.enterEditing()
  text.selectAll()
  return text
}