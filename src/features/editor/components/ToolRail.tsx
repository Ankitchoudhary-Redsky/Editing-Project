import { useEffect, useRef } from "react";
import { useEditor } from "../EditorContext";
import { editorToolCategories, videoTools } from "../model/constants";
import { Layers3 } from "lucide-react";

export function ToolRail() {
  const { tools, editorMode } = useEditor();
  const activeCategory =
    tools.active === "music"
      ? "library"
      : editorToolCategories.find((category) =>
          category.tools.some(({ id }) => id === tools.active),
        )?.id;
  const visibleTools =
    editorMode.active === "image"
      ? editorToolCategories.filter(({ id }) => id !== "upload").map(({ id, label, icon, defaultTool }) => ({
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
        }));

  return (
    <nav className="tool-rail" aria-label="Editor tools">
      {visibleTools.map(({ id, label, icon: Icon, defaultTool, active }) => (
        <button
          key={id}
          className={`rail-tool ${active ? "active" : ""}`}
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
  const previousTool = useRef<typeof tools.active>("upload");
  useEffect(() => {
    if (tools.active !== "layers") previousTool.current = tools.active;
  }, [tools.active]);

  return (
    <nav className="workspace-layers-toggle" aria-label="Layer controls">
      <button
        type="button"
        className={`workspace-layers-button${tools.active === "layers" ? " active" : ""}`}
        onClick={() => tools.setActive(tools.active === "layers" ? previousTool.current : "layers")}
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
