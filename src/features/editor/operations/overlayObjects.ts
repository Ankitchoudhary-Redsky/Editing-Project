import { Canvas, IText, Shadow, Textbox } from 'fabric'

export const signatureStyles = [
  { id: 'elegant', label: 'Elegant', fontFamily: 'Snell Roundhand', fontStyle: 'italic', fontWeight: 'normal' },
  { id: 'classic', label: 'Classic', fontFamily: 'Apple Chancery', fontStyle: 'italic', fontWeight: 'normal' },
  { id: 'handwritten', label: 'Handwritten', fontFamily: 'Bradley Hand', fontStyle: 'normal', fontWeight: 'normal' },
  { id: 'flowing', label: 'Flowing', fontFamily: 'Georgia', fontStyle: 'italic', fontWeight: 'normal' },
  { id: 'fine', label: 'Fine', fontFamily: 'Lucida Handwriting', fontStyle: 'italic', fontWeight: 'normal' },
  { id: 'casual', label: 'Casual', fontFamily: 'Marker Felt', fontStyle: 'normal', fontWeight: 'normal' },
  { id: 'bold', label: 'Bold', fontFamily: 'Comic Sans MS', fontStyle: 'normal', fontWeight: 'bold' },
  { id: 'formal', label: 'Formal', fontFamily: 'Calibri', fontStyle: 'italic', fontWeight: 'normal' },
] as const

const stickyNoteColors = ['#fff0a8', '#ffd6c9', '#d8f0d2', '#d7eaff', '#f4dafa', '#ffe1a8']
export const STICKY_NOTE_MIN_HEIGHT = 112

export function createSignatureObject(
  canvas: Canvas,
  value: string,
  style: (typeof signatureStyles)[number],
) {
  const signature = new IText(value, {
    left: canvas.getWidth() * 0.18,
    top: canvas.getHeight() * 0.4,
    fontFamily: style.fontFamily,
    fontSize: Math.max(28, Math.min(64, canvas.getWidth() * 0.055)),
    fontStyle: style.fontStyle,
    fontWeight: style.fontWeight,
    fill: '#343a35',
    editable: true,
    shadow: new Shadow({ color: 'rgba(20, 35, 28, 0.18)', blur: 2, offsetX: 1, offsetY: 1 }),
    cornerColor: '#2c7660',
    cornerStyle: 'circle',
    cornerSize: 12,
    transparentCorners: false,
    name: 'Signature',
  })
  canvas.add(signature)
  canvas.setActiveObject(signature)
  canvas.requestRenderAll()
  return signature
}

export function createStickyNoteObject(canvas: Canvas) {
  const color = stickyNoteColors[Math.floor(Math.random() * stickyNoteColors.length)]
  const note = new Textbox('Write a note...', {
    left: canvas.getWidth() * 0.2,
    top: canvas.getHeight() * 0.25,
    width: Math.min(220, canvas.getWidth() * 0.45),
    height: STICKY_NOTE_MIN_HEIGHT,
    fontFamily: 'Avenir Next, sans-serif',
    fontSize: Math.max(14, Math.min(22, canvas.getWidth() * 0.02)),
    fill: '#343a35',
    backgroundColor: color,
    textAlign: 'left',
    lineHeight: 1.25,
    padding: 14,
    editable: true,
    shadow: new Shadow({ color: 'rgba(24, 30, 25, 0.2)', blur: 10, offsetX: 2, offsetY: 4 }),
    cornerColor: '#2c7660',
    cornerStyle: 'circle',
    transparentCorners: false,
    name: 'Sticky note',
  })
  note.set({ height: Math.max(STICKY_NOTE_MIN_HEIGHT, note.height) })
  canvas.add(note)
  canvas.setActiveObject(note)
  canvas.requestRenderAll()
  return note
}