import {
  Activity,
  ArrowDown,
  ArrowRight,
  Blend,
  CircleDot,
  Copy,
  Layers3,
  Minus,
  Move,
  RotateCw,
  Sparkles,
  Wind,
  Zap,
} from 'lucide-react'
import { useEditor } from '../../EditorContext'
import type { TextAnimation } from '../../model/types'

const effects: Array<{ id: TextAnimation; label: string; icon: typeof Sparkles }> = [
  { id: 'pop', label: 'Pop', icon: CircleDot },
  { id: 'wipe', label: 'Wipe', icon: ArrowRight },
  { id: 'blur', label: 'Blur', icon: Blend },
  { id: 'succession', label: 'Succession', icon: Layers3 },
  { id: 'breathe', label: 'Breathe', icon: Wind },
  { id: 'baseline', label: 'Baseline', icon: Minus },
  { id: 'drift', label: 'Drift', icon: Move },
  { id: 'tectonic', label: 'Tectonic', icon: Activity },
  { id: 'tumble', label: 'Tumble', icon: RotateCw },
  { id: 'neon', label: 'Neon', icon: Zap },
  { id: 'scrapbook', label: 'Scrapbook', icon: Copy },
  { id: 'stomp', label: 'Stomp', icon: ArrowDown },
]

const addOnEffects: Array<{ id: TextAnimation; label: string; icon: typeof Sparkles }> = [
  { id: 'fade', label: 'Fade', icon: Blend },
  { id: 'pulse', label: 'Pulse', icon: CircleDot },
  { id: 'bounce', label: 'Bounce', icon: ArrowDown },
  { id: 'typewriter', label: 'Typewriter', icon: Minus },
]

export function AnimatePanel() {
  const { canvas, animation } = useEditor()
  const canAnimate = Boolean(canvas.selected && !canvas.selectedIsImage)

  return (
    <div className="panel-content animate-panel">
      <p className="panel-note">
        {canAnimate ? 'Choose an effect for the selected object.' : 'Select text or a shape on the canvas to animate it.'}
      </p>
      <section className="animation-section" aria-label="Animation presets">
        <div className="animation-effect-grid">
          {effects.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`animation-effect-card ${animation.selected === id ? 'selected' : ''}`}
              aria-pressed={animation.selected === id}
              disabled={!canAnimate}
              onClick={() => animation.apply(id)}
            >
              <span className={`animation-effect-art effect-${id}`}><Icon size={24} /></span>
              <span className="animation-effect-label">{label}</span>
            </button>
          ))}
        </div>
      </section>
      <section className="animation-section" aria-label="Add-on effects">
        <strong className="animation-section-title">Add-on effects</strong>
        <div className="animation-addon-grid">
          {addOnEffects.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`animation-addon-option ${animation.selected === id ? 'selected' : ''}`}
              aria-label={label}
              aria-pressed={animation.selected === id}
              title={label}
              disabled={!canAnimate}
              onClick={() => animation.apply(id)}
            >
              <Icon size={19} />
            </button>
          ))}
        </div>
      </section>
      <div className="animation-actions">
        <button type="button" className="primary-button full-button" disabled={!canAnimate || animation.selected === 'none'} onClick={animation.remove}>
          Remove animation
        </button>
        <button type="button" className="secondary-button full-button" disabled={!animation.hasAnimations} onClick={animation.clear}>
          Clear animations
        </button>
      </div>
    </div>
  )
}