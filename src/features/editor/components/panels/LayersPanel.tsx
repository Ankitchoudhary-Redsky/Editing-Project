import { ArrowDown, ArrowUp, FileImage, Shapes, Trash2, Type } from 'lucide-react'
import { FabricImage, IText, type FabricObject } from 'fabric'
import { useEditor } from '../../EditorContext'
import { objectName } from '../../model/objectName'

export function LayersPanel() {
  const { canvas, shapes } = useEditor()
  return (
    <div className="panel-content layers-content">
      <div className="layer-heading"><span>{canvas.objects.length} objects</span><span>TOP</span></div>
      {[...canvas.objects].reverse().map((object: FabricObject, reversedIndex) => {
        const index = canvas.objects.length - reversedIndex - 1
        const Icon = object instanceof FabricImage ? FileImage : object instanceof IText ? Type : Shapes
        return <div key={`${index}-${objectName(object, index)}`} className={`layer-row ${canvas.selected === object ? 'selected' : ''}`}>
          <button className="layer-select" onClick={() => shapes.selectLayer(object)}><span className="layer-thumb"><Icon size={16} /></span><span>{objectName(object, index)}</span></button>
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