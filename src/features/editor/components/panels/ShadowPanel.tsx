import { FabricImage, Shadow, type FabricObject } from 'fabric'
import { useEditor } from '../../EditorContext'
import { objectName } from '../../model/objectName'

const presets = [
  { id: 'glow', label: 'Glow', description: 'Soft halo around the object', blur: 24, distance: 0, angle: 90, color: '#32745d', opacity: 72 },
  { id: 'drop', label: 'Drop shadow', description: 'Shadow cast below the object', blur: 18, distance: 14, angle: 90, color: '#111111', opacity: 48 },
  { id: 'outline', label: 'Outline', description: 'Soft, visible edge around the object', blur: 8, distance: 0, angle: 90, color: '#111111', opacity: 68 },
  { id: 'curved', label: 'Curved shadow', description: 'Soft, curved shadow beneath the object', blur: 22, distance: 14, angle: 68, color: '#111111', opacity: 42 },
  { id: 'page-lift', label: 'Page lift', description: 'Lifts the object off the canvas', blur: 26, distance: 22, angle: 90, color: '#111111', opacity: 38 },
  { id: 'angled', label: 'Angled shadow', description: 'Shadow cast diagonally from the object', blur: 15, distance: 16, angle: 135, color: '#111111', opacity: 46 },
  { id: 'backdrop', label: 'Backdrop', description: 'Wide shadow behind the object', blur: 14, distance: 24, angle: 18, color: '#111111', opacity: 52 },
] as const

const presetControls = {
  glow: ['size', 'blur'],
  drop: ['blur', 'angle', 'distance'],
  outline: ['size'],
  curved: ['blur', 'distance', 'curve'],
  'page-lift': ['blur', 'angle', 'distance'],
  angled: ['blur', 'angle', 'distance'],
  backdrop: ['blur', 'angle', 'distance'],
} as const

function parseShadowColor(color: string) {
  const rgbMatch = color.match(/rgba?\(\s*([\d.]+)[, ]+([\d.]+)[, ]+([\d.]+)(?:\s*[,/]\s*([\d.]+))?\s*\)/i)
  if (rgbMatch) {
    const [, red, green, blue, alpha] = rgbMatch
    return {
      hex: `#${[red, green, blue].map((channel) => Math.round(Number(channel)).toString(16).padStart(2, '0')).join('')}`,
      opacity: alpha === undefined ? 100 : Math.round(Number(alpha) * 100),
    }
  }

  const hexMatch = color.match(/^#([\da-f]{3}|[\da-f]{6})$/i)
  if (hexMatch) {
    const value = hexMatch[1].length === 3
      ? hexMatch[1].split('').map((character) => character + character).join('')
      : hexMatch[1]
    return { hex: `#${value}`, opacity: 100 }
  }

  return { hex: '#17221c', opacity: 34 }
}

function buildShadow(color: string, opacity: number, blur: number, distance: number, angle: number, size: number) {
  const normalizedHex = color.replace('#', '')
  const channels = normalizedHex.length === 3
    ? normalizedHex.split('').map((channel) => parseInt(channel + channel, 16))
    : [0, 2, 4].map((offset) => parseInt(normalizedHex.slice(offset, offset + 2), 16))
  const radians = (angle * Math.PI) / 180
  const scale = size / 50
  return new Shadow({
    color: `rgba(${channels.join(', ')}, ${opacity / 100})`,
    blur: blur * scale,
    offsetX: Math.cos(radians) * distance * scale,
    offsetY: Math.sin(radians) * distance * scale,
  })
}

function getShadowSettings(shadow: Shadow | null | undefined, shadowSize = 50) {
  const color = parseShadowColor(shadow?.color ?? '#17221c')
  const offsetX = shadow?.offsetX ?? Math.cos(Math.PI / 4) * 8
  const offsetY = shadow?.offsetY ?? Math.sin(Math.PI / 4) * 8
  const distance = Math.hypot(offsetX, offsetY)
  const scale = shadowSize / 50 || 1
  return {
    color: color.hex,
    opacity: color.opacity,
    size: shadowSize,
    blur: Math.round((shadow?.blur ?? 20) / scale),
    distance: Math.round(distance / scale),
    angle: distance === 0 ? 90 : Math.round((Math.atan2(offsetY, offsetX) * 180 / Math.PI + 360) % 360),
    curve: Math.max(0, Math.min(100, Math.round((((Math.atan2(offsetY, offsetX) * 180 / Math.PI - 45 + 360) % 360) / 90) * 100))),
  }
}

function isEditableObject(object: FabricObject | null) {
  const name = object?.get('name')
  return Boolean(object && name !== '__pixel_studio_drawing_layer__' && name !== '__pixel_studio_background_image__')
}

export function ShadowPanel() {
  const { canvas, shadows } = useEditor()
  const selected = isEditableObject(canvas.selected)
    ? canvas.selected
    : canvas.objects.find((object) => isEditableObject(object)) ?? null
  const enabled = Boolean(selected)
  const shadowSize = selected ? Number(selected.get('shadowSize') ?? 50) : 50
  const imageSize = selected ? Number(selected.get('shadowArtworkSize') ?? 100) : 100
  const settings = { ...getShadowSettings(selected?.shadow, shadowSize), imageSize }
  const activePreset = selected?.shadow
    ? presets.find((preset) => (
      Math.abs(preset.blur - settings.blur) < 1 &&
      Math.abs(preset.distance - settings.distance) < 1 &&
      Math.abs(preset.angle - settings.angle) < 1 &&
      preset.color.toLowerCase() === settings.color.toLowerCase() &&
      Math.abs(preset.opacity - settings.opacity) < 2
    ))?.id
    : undefined
  const visibleControls: readonly string[] = activePreset
    ? presetControls[activePreset]
    : ['size', 'blur', 'angle', 'distance', 'curve']

  const update = (next: Partial<typeof settings>) => {
    if (!selected || !enabled) return
    const value = { ...settings, ...next }
    const angle = next.curve === undefined ? value.angle : 45 + value.curve * 0.9
    shadows.update(buildShadow(value.color, value.opacity, value.blur, value.distance, angle, value.size), selected, value.size, value.imageSize)
  }

  const applyPreset = (preset: typeof presets[number]) => {
    if (!selected) return
    let imageSize: number | undefined
    if (selected instanceof FabricImage) {
      const bounds = selected.getBoundingRect()
      const touchesCanvasEdge = bounds.left <= 4 || bounds.top <= 4 ||
        bounds.left + bounds.width >= canvas.dimensions.width - 4 ||
        bounds.top + bounds.height >= canvas.dimensions.height - 4
      if (touchesCanvasEdge) imageSize = Math.min(Number(selected.get('shadowArtworkSize') ?? 100), 90)
    }
    shadows.update(buildShadow(preset.color, preset.opacity, preset.blur, preset.distance, preset.angle, 50), selected, 50, imageSize)
  }

  return (
    <div className="panel-content shadow-panel">
      {!canvas.selected && selected && <p className="panel-note shadow-selection-note">Applying to {objectName(selected, canvas.objects.indexOf(selected))}. Select another layer from Layers to change the target.</p>}
      {!enabled && <p className="panel-note shadow-selection-note">Add or select a layer to apply a shadow.</p>}
          <section className="shadow-section">
            <div className="shadow-heading-row">
              <div><span className="field-label">Shadow style</span><p>Choose a preset</p></div>
            </div>
            <div className="shadow-preset-grid" role="group" aria-label="Shadow presets">
              <button
                type="button"
                className={`shadow-preset ${!selected?.shadow ? 'selected' : ''}`}
                aria-pressed={!selected?.shadow}
                aria-label="No shadow"
                title="Remove the shadow"
                disabled={!enabled}
                onClick={() => selected && shadows.update(null, selected, 50, selected instanceof FabricImage ? 100 : undefined)}
              >
                <span className="shadow-preset-preview" aria-hidden="true"><span className="shadow-preset-sample" /></span>
                <span>None</span>
              </button>
              {presets.map((preset) => {
                const { id, label, description } = preset
                return (
                <button
                  key={id}
                  type="button"
                  className={`shadow-preset ${activePreset === id ? 'selected' : ''}`}
                  aria-pressed={activePreset === id}
                  aria-label={`${label}: ${description}`}
                  title={description}
                  disabled={!enabled}
                  onClick={() => applyPreset(preset)}
                >
                  <span className={`shadow-preset-preview shadow-preview-${id}`} aria-hidden="true"><span className="shadow-preset-sample" /></span>
                  <span>{label}</span>
                </button>
                )
              })}
            </div>
          </section>

          <section className="shadow-section shadow-controls">
            <div className="shadow-heading-row"><div><span className="field-label">Adjust shadow</span><p>Fine-tune the selected style</p></div></div>
            <div className="dimensions-fields shadow-color-fields">
              <label className="field-label color-field">Colour<input type="color" value={settings.color} disabled={!enabled} onChange={(event) => update({ color: event.target.value })} /></label>
              <label className="range-field"><span>Intensity <b>{settings.opacity}%</b></span><input type="range" min="0" max="100" value={settings.opacity} disabled={!enabled} onChange={(event) => update({ opacity: Number(event.target.value) })} /></label>
            </div>
            {visibleControls.includes('size') && <label className="range-field"><span>Size <b>{settings.size}</b></span><input type="range" min="0" max="100" value={settings.size} disabled={!enabled} onChange={(event) => update({ size: Number(event.target.value) })} /></label>}
            {selected instanceof FabricImage && <div className="shadow-image-size">
              <label className="range-field"><span>Image size <b>{settings.imageSize}%</b></span><input type="range" min="50" max="120" value={settings.imageSize} onChange={(event) => update({ imageSize: Number(event.target.value) })} /></label>
              <p>Reduce image size to make room for a clear shadow.</p>
            </div>}
            {visibleControls.includes('blur') && <label className="range-field"><span>Blur amount <b>{settings.blur}</b></span><input type="range" min="0" max="60" value={settings.blur} disabled={!enabled} onChange={(event) => update({ blur: Number(event.target.value) })} /></label>}
            {visibleControls.includes('angle') && <label className="range-field"><span>{activePreset === 'angled' ? 'Rotation' : activePreset === 'backdrop' ? 'Direction' : 'Angle'} <b>{settings.angle}°</b></span><input type="range" min="0" max="359" value={settings.angle} disabled={!enabled || settings.distance === 0} onChange={(event) => update({ angle: Number(event.target.value) })} /></label>}
            {visibleControls.includes('distance') && <label className="range-field"><span>Distance <b>{settings.distance}</b></span><input type="range" min="0" max="100" value={settings.distance} disabled={!enabled} onChange={(event) => update({ distance: Number(event.target.value) })} /></label>}
            {visibleControls.includes('curve') && <label className="range-field"><span>Curve <b>{settings.curve}</b></span><input type="range" min="0" max="100" value={settings.curve} disabled={!enabled || settings.distance === 0} onChange={(event) => update({ curve: Number(event.target.value) })} /></label>}
          </section>
    </div>
  )
}