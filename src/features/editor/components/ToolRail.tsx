import { useEditor } from "../EditorContext";
import { editorToolCategories } from "../model/constants";
import { Layers3 } from "lucide-react";

export function ToolRail() {
  const { tools } = useEditor();
  const activeCategory =
    tools.active === "music"
      ? "upload"
      : editorToolCategories.find((category) =>
          category.tools.some(({ id }) => id === tools.active),
        )?.id;

  return (
    <nav className="tool-rail" aria-label="Editor tools">
      {editorToolCategories
        .filter(({ id }) => id !== "layers")
        .map(({ id, label, icon: Icon, defaultTool }) => (
          <button
            key={id}
            className={`rail-tool ${activeCategory === id ? "active" : ""}`}
            onClick={() => {
              tools.setActive(defaultTool);
              if (defaultTool === "crop") tools.beginCrop();
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
  );
}

export function LayersRail() {
  const { tools } = useEditor();

  return (
    <nav className="layers-rail" aria-label="Layer controls">
      <button
        type="button"
        className={`rail-tool layers-rail-button${tools.active === "layers" ? " active" : ""}`}
        onClick={() => tools.setActive("layers")}
        title="Layers"
        aria-label="Layers"
        aria-pressed={tools.active === "layers"}
      >
        <Layers3 size={19} strokeWidth={1.8} />
        <span>Layers</span>
      </button>
    </nav>
  );
}
