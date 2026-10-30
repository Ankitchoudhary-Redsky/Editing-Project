import { ArrowDown, ArrowUp, FileImage, Shapes, Trash2, Type } from 'lucide-react'
import { FabricImage, IText, type FabricObject } from 'fabric'
import { useEditor } from '../../EditorContext'
import { objectName } from '../../model/objectName'
import type { CachedLayerThumbnail } from '../../model/types'

const layerThumbnailCache = new WeakMap<FabricObject, CachedLayerThumbnail>()

function getLayerThumbnail(object: FabricObject) {
  const key = [
    object.left,
    object.top,
    object.width,
    object.height,
    object.scaleX,
    object.scaleY,
    object.angle,
    object.flipX,
    object.flipY,
    object.opacity,
    object.fill,
    object.stroke,
    object.strokeWidth,
  ].join('|')
  const cached = layerThumbnailCache.get(object)
  const isCanvasBackedImage = object instanceof FabricImage && object.getElement() instanceof HTMLCanvasElement
  if (!isCanvasBackedImage && cached?.key === key) return cached.source

  try {
    const size = Math.max(object.getScaledWidth(), object.getScaledHeight(), 1)
    const source = object.toDataURL({
      format: 'png',
      multiplier: Math.min(0.25, 32 / size),
      enableRetinaScaling: false,
    })
    layerThumbnailCache.set(object, { key, source })
    return source
  } catch {
    return ''
  }
}

export function LayersPanel() {
  const { canvas, shapes } = useEditor()

  return (
    <div className="panel-content layers-content">
      <div className="layer-heading"><span>{canvas.objects.length} objects</span><span>TOP</span></div>
      {[...canvas.objects].reverse().map((object: FabricObject, reversedIndex) => {
        const index = canvas.objects.length - reversedIndex - 1
        const Icon = object instanceof FabricImage ? FileImage : object instanceof IText ? Type : Shapes
        const thumbnail = getLayerThumbnail(object)
        return <div key={`${index}-${objectName(object, index)}`} className={`layer-row ${canvas.selected === object ? 'selected' : ''}`}>
          <button className="layer-select" onClick={() => shapes.selectLayer(object)}><span className="layer-thumb">{thumbnail ? <img src={thumbnail} alt="" /> : <Icon size={16} />}</span><span>{objectName(object, index)}</span></button>
          <button className="layer-mini" title="Move forward" onClick={() => shapes.moveLayer(object, 'forward')}><ArrowUp size={14} /></button>
          <button className="layer-mini" title="Move backward" onClick={() => shapes.moveLayer(object, 'backward')}><ArrowDown size={14} /></button>
          <button className="layer-mini delete-mini" title="Delete layer" onClick={() => { shapes.selectLayer(object); shapes.delete() }}><Trash2 size={14} /></button>
        </div>
      })}
      {!canvas.objects.length && <p className="panel-note">Add text or shapes to start building your layers.</p>}
      {canvas.selected && <div className="object-actions layer-actions"><button className="secondary-button" onClick={() => void shapes.duplicate()}><FileImage size={15} /> Duplicate</button><button className="secondary-button danger-action" onClick={shapes.delete}><Trash2 size={15} /> Delete</button></div>}
    </div>
  )
}