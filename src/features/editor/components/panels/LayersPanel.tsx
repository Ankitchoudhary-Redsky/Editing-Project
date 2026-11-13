import { ArrowDown, ArrowUp, Eye, EyeOff, FileImage, Lock, Pencil, Shapes, Table2, Trash2, Type, Unlock } from 'lucide-react'
import { FabricImage, IText, type FabricObject } from 'fabric'
import { useState } from 'react'
import { useEditor } from '../../EditorContext'
import { BACKGROUND_IMAGE_NAME } from '../../model/constants'
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
    const objectCanvas = object.toCanvasElement({ multiplier: 1, enableRetinaScaling: false })
    if (!objectCanvas.width || !objectCanvas.height) return ''
    const thumbnailCanvas = document.createElement('canvas')
    thumbnailCanvas.width = 32
    thumbnailCanvas.height = 32
    const context = thumbnailCanvas.getContext('2d')
    if (!context) return ''
    const scale = Math.min(32 / objectCanvas.width, 32 / objectCanvas.height)
    const width = objectCanvas.width * scale
    const height = objectCanvas.height * scale
    context.drawImage(objectCanvas, (32 - width) / 2, (32 - height) / 2, width, height)
    const source = thumbnailCanvas.toDataURL('image/png')
    layerThumbnailCache.set(object, { key, source })
    return source
  } catch {
    return ''
  }
}

export function LayersPanel() {
  const { canvas, shapes, table, tools } = useEditor()
  const [renamingObject, setRenamingObject] = useState<FabricObject | null>(null)
  const [renameValue, setRenameValue] = useState('')
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
        const layerName = isTable ? `Table ${tableId}` : objectName(object, index)
        const isLocked = object.get('layerLocked') === true
        const isSelected = isTable
          ? table.activeId === tableId && table.editing
          : canvas.selected === object
        const finishRename = () => {
          if (renamingObject !== object) return
          shapes.renameLayer(object, renameValue)
          setRenamingObject(null)
        }
        return <div key={isTable ? `table-${tableId}` : `${index}-${layerName}`} className={`layer-row ${isSelected ? 'selected' : ''} ${object.visible ? '' : 'hidden'}`}>
          {renamingObject === object ? <input
            className="layer-rename-input"
            aria-label="Layer name"
            autoFocus
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onBlur={finishRename}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === 'Enter') event.currentTarget.blur()
              if (event.key === 'Escape') setRenamingObject(null)
            }}
          /> : <button className="layer-select" disabled={isLocked} onClick={() => {
            if (isTable) table.select(tableId)
            else {
              table.finishEditing()
              if (object.get('name') === BACKGROUND_IMAGE_NAME) tools.setActive('layers')
              shapes.selectLayer(object)
            }
          }}><span className="layer-thumb">{thumbnail ? <img src={thumbnail} alt="" /> : <Icon size={16} />}</span><span>{layerName}</span></button>}
          <button className="layer-mini" title={object.visible ? 'Hide layer' : 'Show layer'} aria-label={`${object.visible ? 'Hide' : 'Show'} ${layerName}`} disabled={isTable} onClick={() => shapes.setLayerVisibility(object, !object.visible)}>{object.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
          <button className="layer-mini" title={isLocked ? 'Unlock layer' : 'Lock layer'} aria-label={`${isLocked ? 'Unlock' : 'Lock'} ${layerName}`} disabled={isTable} onClick={() => shapes.setLayerLocked(object, !isLocked)}>{isLocked ? <Lock size={14} /> : <Unlock size={14} />}</button>
          <button className="layer-mini" title="Rename layer" aria-label={`Rename ${layerName}`} disabled={isTable} onClick={() => { setRenameValue(layerName); setRenamingObject(object) }}><Pencil size={14} /></button>
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