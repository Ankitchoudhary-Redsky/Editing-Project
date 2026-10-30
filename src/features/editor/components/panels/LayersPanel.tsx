import { ArrowDown, ArrowUp, FileImage, Shapes, Table2, Trash2, Type } from 'lucide-react'
import { FabricImage, IText, type FabricObject } from 'fabric'
import { useEditor } from '../../EditorContext'
import { objectName } from '../../model/objectName'
import type { CachedLayerThumbnail } from '../../model/types'
import { getTableId } from '../../operations/tableGeometry'

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
  const { canvas, shapes, table } = useEditor()
  const layerEntries: Array<{
    object: FabricObject
    index: number
    tableId: number | null
  }> = []
  const seenTableIds = new Set<number>()

  for (let index = canvas.objects.length - 1; index >= 0; index -= 1) {
    const object = canvas.objects[index]
    const tableId = getTableId(object)
    if (tableId === null) {
      layerEntries.push({ object, index, tableId: null })
    } else if (!seenTableIds.has(tableId)) {
      seenTableIds.add(tableId)
      layerEntries.push({ object, index, tableId })
    }
  }

  return (
    <div className="panel-content layers-content">
      <div className="layer-heading"><span>{layerEntries.length} layers</span><span>TOP</span></div>
      {layerEntries.map(({ object, index, tableId }) => {
        const isTable = tableId !== null
        const Icon = isTable ? Table2 : object instanceof FabricImage ? FileImage : object instanceof IText ? Type : Shapes
        const thumbnail = isTable ? '' : getLayerThumbnail(object)
        const isSelected = isTable
          ? table.activeId === tableId && table.editing
          : canvas.selected === object
        return <div key={isTable ? `table-${tableId}` : `${index}-${objectName(object, index)}`} className={`layer-row ${isSelected ? 'selected' : ''}`}>
          <button className="layer-select" onClick={() => {
            if (isTable) table.select(tableId)
            else {
              table.finishEditing()
              shapes.selectLayer(object)
            }
          }}><span className="layer-thumb">{thumbnail ? <img src={thumbnail} alt="" /> : <Icon size={16} />}</span><span>{isTable ? `Table ${tableId}` : objectName(object, index)}</span></button>
          <button className="layer-mini" title="Move forward" onClick={() => isTable ? table.moveLayer(tableId, 'forward') : shapes.moveLayer(object, 'forward')}><ArrowUp size={14} /></button>
          <button className="layer-mini" title="Move backward" onClick={() => isTable ? table.moveLayer(tableId, 'backward') : shapes.moveLayer(object, 'backward')}><ArrowDown size={14} /></button>
          <button className="layer-mini delete-mini" title="Delete layer" onClick={() => {
            if (isTable) {
              table.select(tableId)
              table.deleteTable()
            } else {
              shapes.selectLayer(object)
              shapes.delete()
            }
          }}><Trash2 size={14} /></button>
        </div>
      })}
      {!layerEntries.length && <p className="panel-note">Add text or shapes to start building your layers.</p>}
      {canvas.selected && getTableId(canvas.selected) === null && !table.editing && <div className="object-actions layer-actions"><button className="secondary-button" onClick={() => void shapes.duplicate()}><FileImage size={15} /> Duplicate</button><button className="secondary-button danger-action" onClick={shapes.delete}><Trash2 size={15} /> Delete</button></div>}
    </div>
  )
}