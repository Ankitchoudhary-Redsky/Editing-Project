import { useEditor } from '../EditorContext'
import { editorToolCategories } from '../model/constants'

export function ToolRail() {
  const { tools } = useEditor()
  const activeCategory = tools.active === 'music'
    ? 'upload'
    : editorToolCategories.find((category) => category.tools.some(({ id }) => id === tools.active))?.id

  return (
    <nav className="tool-rail" aria-label="Editor tools">
      {editorToolCategories.map(({ id, label, icon: Icon, defaultTool }) => (
        <button
          key={id}
          className={`rail-tool ${activeCategory === id ? 'active' : ''}`}
          onClick={() => {
            tools.setActive(defaultTool)
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