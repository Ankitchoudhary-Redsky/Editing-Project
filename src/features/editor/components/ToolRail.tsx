import { useEditor } from '../EditorContext'
import { editorTools } from '../model/constants'

export function ToolRail() {
  const { tools } = useEditor()

  return (
    <nav className="tool-rail" aria-label="Editor tools">
      {editorTools.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`rail-tool ${tools.active === id ? 'active' : ''}`}
          onClick={() => {
            tools.setActive(id)
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