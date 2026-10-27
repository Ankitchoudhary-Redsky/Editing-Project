import { useEditor } from '../EditorContext'
import { editorTools, videoTools } from '../model/constants'

export function ToolRail() {
  const { tools, editorMode } = useEditor()
  const visibleTools = editorMode.active === 'image' ? editorTools : videoTools

  return (
    <nav className="tool-rail" aria-label="Editor tools">
      {visibleTools.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`rail-tool ${tools.active === id ? 'active' : ''}`}
          onClick={() => {
            tools.setActive(id)
            if (id === 'crop') tools.beginCrop()
          }}
          title={label}
          aria-label={label}
        >
          <Icon size={19} strokeWidth={1.8} />
          <span>{label}</span>
        </button>
      ))}
      <div className="rail-spacer" />
    </nav>
  )
}