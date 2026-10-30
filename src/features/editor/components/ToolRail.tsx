import { useEditor } from '../EditorContext'
import { editorToolCategories, videoTools } from '../model/constants'

export function ToolRail() {
  const { tools, editorMode } = useEditor()
  const activeCategory = tools.active === 'music'
    ? 'upload'
    : editorToolCategories.find((category) => category.tools.some(({ id }) => id === tools.active))?.id
  const visibleTools = editorMode.active === 'image'
    ? editorToolCategories.map(({ id, label, icon, defaultTool }) => ({
      id,
      label,
      icon,
      defaultTool,
      active: activeCategory === id,
    }))
    : videoTools.map(({ id, label, icon }) => ({
      id,
      label,
      icon,
      defaultTool: id,
      active: tools.active === id,
    }))

  return (
    <nav className="tool-rail" aria-label="Editor tools">
      {visibleTools.map(({ id, label, icon: Icon, defaultTool, active }) => (
        <button
          key={id}
          className={`rail-tool ${active ? 'active' : ''}`}
          onClick={() => {
            tools.setActive(defaultTool)
            if (defaultTool === 'crop') tools.beginCrop()
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