import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { FabricImage, IText } from 'fabric'
import { Eraser, ImageUp, PenLine, Pencil, Plus, Type } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import { createSignatureObject, signatureStyles } from '../../operations/overlayObjects'

type SignatureMode = 'upload' | 'draw' | 'text'

export function SignaturePanel() {
  const { canvas, fabricCanvas, tools, text } = useEditor()
  const signatureFileRef = useRef<HTMLInputElement>(null)
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<SignatureMode>('upload')
  const [inkColor, setInkColor] = useState('#263d32')
  const [hasDrawing, setHasDrawing] = useState(false)
  const isDrawing = useRef(false)
  const selectedSignature = canvas.selected instanceof IText && canvas.selected.get('name') === 'Signature'
    ? canvas.selected
    : null
  const [name, setName] = useState('Your name')
  const [selectedStyle, setSelectedStyle] = useState(0)
  const signatureName = selectedSignature?.text ?? name
  const activeStyle = selectedSignature
    ? Math.max(0, signatureStyles.findIndex((style) => style.fontFamily === selectedSignature.fontFamily))
    : selectedStyle
  const previewName = signatureName.trim() || 'Your name'

  const getDrawingPoint = (event: PointerEvent<HTMLCanvasElement>) => {
    const element = event.currentTarget
    const bounds = element.getBoundingClientRect()
    return {
      x: (event.clientX - bounds.left) * (element.width / bounds.width),
      y: (event.clientY - bounds.top) * (element.height / bounds.height),
    }
  }

  const startDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    const element = event.currentTarget
    const context = element.getContext('2d')
    if (!context) return
    const point = getDrawingPoint(event)
    isDrawing.current = true
    element.setPointerCapture(event.pointerId)
    context.beginPath()
    context.moveTo(point.x, point.y)
    context.lineTo(point.x + 0.1, point.y + 0.1)
    context.strokeStyle = inkColor
    context.lineWidth = 4
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.stroke()
    setHasDrawing(true)
  }

  const continueDrawing = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current) return
    const context = event.currentTarget.getContext('2d')
    if (!context) return
    const point = getDrawingPoint(event)
    context.lineTo(point.x, point.y)
    context.stroke()
  }

  const stopDrawing = () => {
    isDrawing.current = false
  }

  const clearDrawing = () => {
    const element = drawingCanvasRef.current
    const context = element?.getContext('2d')
    if (element && context) context.clearRect(0, 0, element.width, element.height)
    setHasDrawing(false)
  }

  const addDrawing = async () => {
    const element = drawingCanvasRef.current
    if (!fabricCanvas || !canvas.hasImage || !element || !hasDrawing) return
    const signatureImage = await FabricImage.fromURL(element.toDataURL('image/png'))
    const maxWidth = Math.min(fabricCanvas.getWidth() * 0.48, 320)
    const maxHeight = Math.min(fabricCanvas.getHeight() * 0.24, 120)
    const scale = Math.min(maxWidth / (signatureImage.width ?? 1), maxHeight / (signatureImage.height ?? 1))
    signatureImage.set({
      left: fabricCanvas.getWidth() * 0.18,
      top: fabricCanvas.getHeight() * 0.4,
      scaleX: scale,
      scaleY: scale,
      cornerColor: '#2c7660',
      cornerStyle: 'circle',
      cornerSize: 12,
      transparentCorners: false,
      name: 'Signature',
    })
    fabricCanvas.add(signatureImage)
    fabricCanvas.setActiveObject(signatureImage)
    fabricCanvas.requestRenderAll()
    tools.setNotice('Signature added. Drag it to position or resize it.')
  }

  const applyStyle = (index: number) => {
    setSelectedStyle(index)
    if (selectedSignature) {
      const style = signatureStyles[index]
      text.updateSignatureStyle(style.fontFamily, style.fontStyle, style.fontWeight)
    }
  }

  const addSignature = () => {
    if (!fabricCanvas || !canvas.hasImage) return
    if (selectedSignature) {
      text.update('text', signatureName)
      const style = signatureStyles[activeStyle]
      text.updateSignatureStyle(style.fontFamily, style.fontStyle, style.fontWeight)
      tools.setNotice('Signature updated.')
      return
    }
    createSignatureObject(fabricCanvas, previewName, signatureStyles[selectedStyle])
    tools.setNotice('Signature added. Drag it to position or double-click to edit it.')
  }

  return (
    <div className="panel-content signature-panel">
      <input
        ref={signatureFileRef}
        className="visually-hidden"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void tools.addSignatureImage(file)
          event.currentTarget.value = ''
        }}
        aria-label="Upload signature image"
      />
      <div className="signature-mode-tabs" role="group" aria-label="Signature method">
        <button type="button" className={mode === 'upload' ? 'active' : ''} aria-pressed={mode === 'upload'} onClick={() => setMode('upload')}>
          <ImageUp size={15} /> Upload
        </button>
        <button type="button" className={mode === 'draw' ? 'active' : ''} aria-pressed={mode === 'draw'} onClick={() => setMode('draw')}>
          <Pencil size={15} /> Draw
        </button>
        <button type="button" className={mode === 'text' ? 'active' : ''} aria-pressed={mode === 'text'} onClick={() => setMode('text')}>
          <Type size={15} /> Text
        </button>
      </div>
      {mode === 'upload' && (
        <>
          <button
            className="secondary-button full-button"
            type="button"
            disabled={!canvas.hasImage}
            onClick={() => signatureFileRef.current?.click()}
          >
            <ImageUp size={16} /> Upload signature image
          </button>
          <p className="panel-note">Use a transparent PNG for a clean signature overlay.</p>
        </>
      )}
      {mode === 'draw' && (
        <>
          <div className="signature-draw-toolbar">
            <label className="signature-ink-control" title="Ink color">
              <span>Ink</span>
              <input aria-label="Signature ink color" type="color" value={inkColor} onChange={(event) => setInkColor(event.target.value)} />
            </label>
            <button type="button" className="secondary-button" onClick={clearDrawing} disabled={!hasDrawing}>
              <Eraser size={14} /> Clear
            </button>
          </div>
          <canvas
            ref={drawingCanvasRef}
            className="signature-draw-pad"
            width={640}
            height={200}
            aria-label="Draw your signature here"
            onPointerDown={startDrawing}
            onPointerMove={continueDrawing}
            onPointerUp={stopDrawing}
            onPointerCancel={stopDrawing}
            onLostPointerCapture={stopDrawing}
          />
          <button className="primary-button full-button" type="button" disabled={!canvas.hasImage || !hasDrawing} onClick={() => void addDrawing()}>
            <Plus size={16} /> Add drawn signature
          </button>
        </>
      )}
      {mode === 'text' && (
        <>
          <label className="field-label">
            Name
            <input
              value={signatureName}
              onChange={(event) => {
                setName(event.target.value)
                if (selectedSignature) text.update('text', event.target.value)
              }}
              maxLength={60}
            />
          </label>
          <div className="signature-style-heading">
            <span className="field-label">Choose a style</span>
            <span>8 styles</span>
          </div>
          <div className="signature-style-grid">
            {signatureStyles.map((style, index) => (
              <button
                key={style.id}
                type="button"
                className={`signature-style ${activeStyle === index ? 'selected' : ''}`}
                aria-pressed={activeStyle === index}
                onClick={() => applyStyle(index)}
              >
                <span className="signature-preview" style={{ fontFamily: `'${style.fontFamily}', cursive`, fontStyle: style.fontStyle, fontWeight: style.fontWeight }}>
                  {previewName}
                </span>
                <span className="signature-style-label">{style.label}</span>
              </button>
            ))}
          </div>
          <button className="primary-button full-button" type="button" disabled={!canvas.hasImage || !signatureName.trim()} onClick={addSignature}>
            <Plus size={16} /> {selectedSignature ? 'Apply to selected signature' : 'Add signature'}
          </button>
          <p className="panel-note"><PenLine size={13} /> Select to move or resize. Double-click to edit on the image.</p>
        </>
      )}
      {!canvas.hasImage && <p className="panel-note">Open an image to add a signature.</p>}
    </div>
  )
}