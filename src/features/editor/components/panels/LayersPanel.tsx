import { ArrowDown, ArrowUp, CopyPlus, Eye, EyeOff, FileImage, Lock, Pencil, Shapes, Square, SquareCheck, Table2, Trash2, Type, Unlock } from 'lucide-react'
import { FabricImage, IText, type FabricObject } from 'fabric'
import { useRef, useState } from 'react'
import { useEditor } from '../../EditorContext'
import { BACKGROUND_IMAGE_NAME, isDrawingLayerName } from '../../model/constants'
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
  const [checked, setChecked] = useState<FabricObject[]>([])
  const [renamingObject, setRenamingObject] = useState<FabricObject | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const cancelRenameRef = useRef(false)
  const contentObjects = canvas.objects
  const layerObjects = contentObjects.filter(
    (object) =>
      getTableId(object) === null &&
      (object.selectable !== false || isDrawingLayerName(object.get('name'))) &&
      object.get('layerLocked') !== true,
  )
  const activeChecked = checked.filter((object) => layerObjects.includes(object))
  const layerEntries: Array<{ object: FabricObject; index: number; tableId: number | null }> = []
  const seenTableIds = new Set<number>()

  for (let index = contentObjects.length - 1; index >= 0; index -= 1) {
    const object = contentObjects[index]
    const tableId = getTableId(object)
    if (tableId === null) {
      layerEntries.push({ object, index, tableId: null })
    } else if (!seenTableIds.has(tableId)) {
      seenTableIds.add(tableId)
      layerEntries.push({ object, index, tableId })
    }
  }

  const allSelected = layerObjects.length > 0 && activeChecked.length === layerObjects.length

  const toggleLayer = (object: FabricObject) => {
    if (isDrawingLayerName(object.get('name')) && object.get('layerLocked') !== true) {
      object.set({ selectable: true, evented: true })
    }
    const next = activeChecked.includes(object)
      ? activeChecked.filter((item) => item !== object)
      : [...activeChecked, object]
    setChecked(next)
    if (table.editing) table.finishEditing()
    shapes.selectLayers(next)
  }

  const toggleAll = () => {
    const next = activeChecked.length === layerObjects.length ? [] : [...layerObjects]
    setChecked(next)
    if (table.editing) table.finishEditing()
    shapes.selectLayers(next)
  }

  const moveSelection = (direction: "forward" | "backward") => {
    if (!activeChecked.length) return
    shapes.moveLayers(activeChecked, direction)
  }

  const removeLayer = (object: FabricObject) => {
    shapes.deleteLayers([object])
    setChecked((current) => current.filter((item) => item !== object))
  }

  const deleteChecked = () => {
    shapes.deleteLayers(activeChecked)
    setChecked([])
  }

  const duplicateChecked = async () => {
    const copies = await shapes.duplicateLayers(activeChecked)
    setChecked(copies)
  }

  return (
    <div className="panel-content layers-content">
      <div className="layer-heading">
        <span>{activeChecked.length ? `${activeChecked.length} selected` : `${layerEntries.length} layers`}</span>
        <button
          type="button"
          className="layer-select-all"
          onClick={toggleAll}
          title={allSelected ? "Clear selection" : "Select all layers"}
          aria-label={allSelected ? "Clear selection" : "Select all layers"}
        >
          {allSelected ? <SquareCheck size={16} /> : <Square size={16} />}
          <span>{allSelected ? "Clear" : "All"}</span>
        </button>
      </div>
      <div
        className="layer-bulk-actions"
        aria-label="Actions for selected layers"
      >
        <button
          type="button"
          className="mini-button"
          title="Duplicate selected layers"
          aria-label="Duplicate selected layers"
          disabled={!activeChecked.length}
          onClick={() => void duplicateChecked()}
        >
          <CopyPlus size={15} />
        </button>
        <button
          type="button"
          className="mini-button"
          title="Move selected layers forward"
          aria-label="Move selected layers forward"
          disabled={!activeChecked.length}
          onClick={() => moveSelection("forward")}
        >
          <ArrowUp size={15} />
        </button>
        <button
          type="button"
          className="mini-button"
          title="Move selected layers backward"
          aria-label="Move selected layers backward"
          disabled={!activeChecked.length}
          onClick={() => moveSelection("backward")}
        >
          <ArrowDown size={15} />
        </button>
        <button
          type="button"
          className="mini-button danger-action"
          title="Delete selected layers"
          aria-label="Delete selected layers"
          disabled={!activeChecked.length}
          onClick={deleteChecked}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {layerEntries.map(({ object, index, tableId }) => {
        const isTable = tableId !== null
        const isDrawingLayer = isDrawingLayerName(object.get('name'))
        const isLocked = object.get('layerLocked') === true
        const Icon = isTable
          ? Table2
          : object instanceof FabricImage
            ? FileImage
            : object instanceof IText
              ? Type
              : Shapes
        const layerName = isTable
          ? String(object.get('layerDisplayName') || `Table ${tableId}`)
          : objectName(object, index)
        const thumbnail = isTable ? '' : getLayerThumbnail(object)
        const isSelected = isTable
          ? table.activeId === tableId && table.editing
          : activeChecked.includes(object) || canvas.selected === object
        const finishRename = () => {
          if (cancelRenameRef.current) {
            cancelRenameRef.current = false
            return
          }
          if (renamingObject !== object) return
          if (isTable) table.renameLayer(tableId, renameValue)
          else shapes.renameLayer(object, renameValue)
          setRenamingObject(null)
        }

        return (
          <div
            key={isTable ? `table-${tableId}` : `${index}-${layerName}`}
            className={`layer-row ${isSelected ? 'selected' : ''} ${object.visible === false ? 'hidden' : ''}`}
            draggable={!isLocked && renamingObject !== object}
            onDragStart={(event) => {
              setDraggedIndex(index)
              event.dataTransfer.dropEffect = 'move';
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = 'move';
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggedIndex === null || draggedIndex === index)  {
                setDraggedIndex(null)
                return
              } 
              shapes.handleReorder(draggedIndex, index)
              setDraggedIndex(null)          
            }}
            onDragEnd={() => setDraggedIndex(null)}
          >
            {!isTable && (
              <button
                type="button"
                className="layer-check"
                aria-label={`${activeChecked.includes(object) ? 'Deselect' : 'Select'} ${layerName}`}
                aria-pressed={activeChecked.includes(object)}
                disabled={isLocked || (object.selectable === false && !isDrawingLayer)}
                onClick={() => toggleLayer(object)}
              >
                {activeChecked.includes(object) ? <SquareCheck size={18} /> : <Square size={18} />}
              </button>
            )}
            {renamingObject === object ? (
              <input
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
                  if (event.key === 'Escape') {
                    cancelRenameRef.current = true
                    setRenamingObject(null)
                  }
                }}
              />
            ) : (
              <button
                type="button"
                className="layer-select"
                disabled={isTable
                  ? isLocked || object.visible === false
                  : isLocked || (object.selectable === false && !isDrawingLayer)}
                onClick={() => {
                  if (isTable) {
                    if (activeChecked.length) {
                      setChecked([])
                      shapes.selectLayers([])
                    }
                    table.finishEditing()
                    table.select(tableId)
                    return
                  }
                  setChecked([object])
                  if (table.editing) table.finishEditing()
                  if (object.get('name') === BACKGROUND_IMAGE_NAME) tools.setActive('layers')
                  shapes.selectLayer(object)
                }}
              >
                <span className="layer-thumb">
                  {thumbnail ? <img src={thumbnail} alt="" /> : <Icon size={16} />}
                </span>
                <span>{layerName}</span>
              </button>
            )}
            <button
              type="button"
              className="layer-mini"
              title={object.visible === false ? 'Show layer' : 'Hide layer'}
              aria-label={`${object.visible === false ? 'Show' : 'Hide'} ${layerName}`}
              onClick={() => isTable
                ? table.setVisibility(tableId, object.visible === false)
                : shapes.setLayerVisibility(object, object.visible === false)}
            >
              {object.visible === false ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              type="button"
              className="layer-mini"
              title={isLocked ? 'Unlock layer' : 'Lock layer'}
              aria-label={`${isLocked ? 'Unlock' : 'Lock'} ${layerName}`}
              onClick={() => isTable
                ? table.setLocked(tableId, !isLocked)
                : shapes.setLayerLocked(object, !isLocked)}
            >
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
            <button
              type="button"
              className="layer-mini"
              title="Rename layer"
              aria-label={`Rename ${layerName}`}
              onClick={() => {
                setRenameValue(layerName)
                setRenamingObject(object)
              }}
            >
              <Pencil size={14} />
            </button>
            <button
              type="button"
              className="layer-mini"
              title="Move forward"
              aria-label={`Move ${layerName} forward`}
              onClick={() => isTable
                ? table.moveLayer(tableId, 'forward')
                : shapes.moveLayers(activeChecked.includes(object) ? activeChecked : [object], 'forward')}
            >
              <ArrowUp size={14} />
            </button>
            <button
              type="button"
              className="layer-mini"
              title="Move backward"
              aria-label={`Move ${layerName} backward`}
              onClick={() => isTable
                ? table.moveLayer(tableId, 'backward')
                : shapes.moveLayers(activeChecked.includes(object) ? activeChecked : [object], 'backward')}
            >
              <ArrowDown size={14} />
            </button>
            <button
              type="button"
              className="layer-mini delete-mini"
              title="Delete layer"
              aria-label={`Delete ${layerName}`}
              onClick={() => {
                if (isTable) {
                  table.select(tableId)
                  table.deleteTable()
                } else {
                  removeLayer(object)
                }
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        )
      })}
      {!layerEntries.length && (
        <p className="panel-note">
          Add text or shapes to start building your layers.
        </p>
      )}
      {canvas.selected && getTableId(canvas.selected) === null && !table.editing && (
        <div className="object-actions layer-actions">
          <button type="button" className="secondary-button" onClick={() => void shapes.duplicate()}>
            <CopyPlus size={15} /> Duplicate
          </button>
          <button type="button" className="secondary-button danger-action" onClick={shapes.delete}>
            <Trash2 size={15} /> Delete
          </button>
        </div>
      )}
    </div>
  )
}
