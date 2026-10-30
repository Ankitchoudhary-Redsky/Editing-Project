import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Plus } from 'lucide-react'
import { useEditor } from '../../EditorContext'
import type { TextDesignOptions } from '../../model/types'

const fontFamilies = ['Georgia', 'Arial', 'Verdana', 'Trebuchet MS', 'Courier New', 'Times New Roman']
const textDesigns: Array<{ name: string; sample: string; design: TextDesignOptions }> = [
  { name: 'Bold headline', sample: 'HEADLINE', design: { value: 'HEADLINE', fontFamily: 'Arial', fontSize: 48, color: '#ffffff', fontWeight: 'bold', textAlign: 'center', shadow: 'strong' } },
  { name: 'Elegant', sample: 'Elegant', design: { value: 'Elegant', fontFamily: 'Georgia', fontSize: 42, color: '#f5e6c8', fontStyle: 'italic', textAlign: 'center', shadow: 'soft' } },
  { name: 'Poster', sample: 'POSTER', design: { value: 'POSTER', fontFamily: 'Arial', fontSize: 50, color: '#f6bd4b', fontWeight: 'bold', outline: '#38261b', outlineWidth: 2, textAlign: 'center', shadow: 'strong' } },
  { name: 'Neon', sample: 'Neon', design: { value: 'Neon', fontFamily: 'Verdana', fontSize: 42, color: '#ff68c8', fontWeight: 'bold', outline: '#752455', outlineWidth: 1, textAlign: 'center', shadow: 'strong' } },
  { name: 'Caption label', sample: 'CAPTION', design: { value: 'CAPTION', fontFamily: 'Arial', fontSize: 22, color: '#ffffff', fontWeight: 'bold', backgroundColor: '#245a4a', textAlign: 'center' } },
  { name: 'Soft note', sample: 'a little note', design: { value: 'a little note', fontFamily: 'Georgia', fontSize: 30, color: '#ffffff', fontStyle: 'italic', shadow: 'soft' } },
]

export function TextPanel() {
  const { canvas, text } = useEditor()
  return (
    <div className="panel-content">
      <fieldset className="panel-control-group" disabled={!canvas.hasImage}>
        <button className="primary-button full-button" onClick={() => text.add()}><Plus size={16} /> Add a text box</button>
        <section className="text-design-section" aria-label="Ready-made text designs">
          <span className="field-label">Ready-made designs</span>
          <div className="text-design-grid">
            {textDesigns.map(({ name, sample, design }) => (
              <button key={name} className="text-design-card" onClick={() => text.add(design)} title={`Add ${name} text`}>
                <span className="text-design-preview" style={{
                  backgroundColor: design.backgroundColor ?? 'transparent',
                  color: design.color,
                  fontFamily: design.fontFamily,
                  fontWeight: design.fontWeight,
                  fontStyle: design.fontStyle,
                  textAlign: design.textAlign,
                  WebkitTextStroke: design.outlineWidth ? `${Math.min(design.outlineWidth, 1)}px ${design.outline}` : undefined,
                  textShadow: design.shadow ? '0 2px 5px rgba(0, 0, 0, .35)' : undefined,
                }}>{sample}</span>
                <span className="text-design-name">{name}</span>
              </button>
            ))}
          </div>
        </section>
        {text.selected && <div className="control-section"><label className="field-label">Text<textarea rows={3} value={text.selected.text ?? text.value} onChange={(event) => text.update('text', event.target.value)} /></label></div>}
        <div className="control-section"><span className="field-label">Font</span><select value={text.selected?.fontFamily ?? text.fontFamily} onChange={(event) => { text.setFontFamily(event.target.value); text.update('fontFamily', event.target.value) }}>{fontFamilies.map((family) => <option key={family}>{family}</option>)}</select></div>
        <div className="dimensions-fields"><label className="field-label">Size<input type="number" min="8" max="400" value={text.selected?.fontSize ?? text.fontSize} onChange={(event) => { const value = Number(event.target.value); text.setFontSize(value); text.update('fontSize', value) }} /></label><label className="field-label color-field">Color<input type="color" value={text.selected && typeof text.selected.fill === 'string' ? text.selected.fill : text.color} onChange={(event) => { text.setColor(event.target.value); text.update('fill', event.target.value) }} /></label></div>
        <label className="field-label color-field">Text background<input type="color" value={text.selected && typeof text.selected.backgroundColor === 'string' && text.selected.backgroundColor !== '' ? text.selected.backgroundColor : text.background} onChange={(event) => { text.setBackground(event.target.value); text.update('backgroundColor', event.target.value) }} /></label>
        <div className="dimensions-fields"><label className="field-label color-field">Outline<input type="color" value={text.selected && typeof text.selected.stroke === 'string' ? text.selected.stroke : text.outline} onChange={(event) => { text.setOutline(event.target.value); text.update('stroke', event.target.value) }} /></label><label className="field-label">Outline width<input type="number" min="0" max="24" value={text.selected?.strokeWidth ?? text.outlineWidth} onChange={(event) => { const value = Number(event.target.value); text.setOutlineWidth(value); text.update('strokeWidth', value) }} /></label></div>
        <label className="field-label">Shadow<select value={text.selected?.shadow ? (text.shadow === 'none' ? 'soft' : text.shadow) : text.shadow} onChange={(event) => { text.setShadow(event.target.value); text.update('shadow', event.target.value) }}><option value="none">None</option><option value="soft">Soft</option><option value="strong">Strong</option></select></label>
        {text.selected && <label className="field-label">Animation<select value={String(text.selected.get('textAnimation') ?? 'none')} onChange={(event) => text.update('textAnimation', event.target.value)}><option value="none">None</option><optgroup label="Loop"><option value="fade">Fade</option><option value="pulse">Pulse</option><option value="bounce">Bounce</option></optgroup><optgroup label="Enter"><option value="typewriter">Typewriter</option><option value="from-top">From top</option><option value="from-bottom">From bottom</option><option value="from-left">From left</option><option value="from-right">From right</option></optgroup></select></label>}
        <div className="format-toolbar"><button title="Bold" className={text.selected?.fontWeight === 'bold' ? 'pressed' : ''} onClick={() => text.update('fontWeight', text.selected?.fontWeight === 'bold' ? 'normal' : 'bold')}><Bold size={16} /></button><button title="Italic" className={text.selected?.fontStyle === 'italic' ? 'pressed' : ''} onClick={() => text.update('fontStyle', text.selected?.fontStyle === 'italic' ? 'normal' : 'italic')}><Italic size={16} /></button><span /><button title="Align left" onClick={() => text.update('textAlign', 'left')}><AlignLeft size={16} /></button><button title="Align center" onClick={() => text.update('textAlign', 'center')}><AlignCenter size={16} /></button><button title="Align right" onClick={() => text.update('textAlign', 'right')}><AlignRight size={16} /></button></div>
        <label className="range-field"><span>Opacity <b>{text.selected ? Math.round(text.selected.opacity * 100) : text.opacity}%</b></span><input type="range" min="0" max="100" value={text.selected ? Math.round(text.selected.opacity * 100) : text.opacity} onChange={(event) => { const value = Number(event.target.value); text.setOpacity(value); text.update('opacity', value / 100) }} /></label>
      </fieldset>
      <p className="panel-note">Double-click a text object to edit its contents on the canvas.</p>
    </div>
  )
}