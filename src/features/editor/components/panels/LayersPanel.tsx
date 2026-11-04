import {
  ArrowDown,
  ArrowUp,
  CopyPlus,
  FileImage,
  Shapes,
  Square,
  SquareCheck,
  Trash2,
  Type,
} from "lucide-react";
import { FabricImage, IText, type FabricObject } from "fabric";
import { useEditor } from "../../EditorContext";
import { objectName } from "../../model/objectName";
import { useEffect, useState } from "react";

export function LayersPanel() {
  const { canvas, shapes } = useEditor();
  const [checked, setChecked] = useState<FabricObject[]>([]);
  const layerObjects = canvas.objects.filter(
    (object) => object.selectable !== false,
  );
  const allSelected =
    layerObjects.length > 0 && checked.length === layerObjects.length;

  useEffect(() => {
    setChecked((current) => {
      const next = current.filter((object) => layerObjects.includes(object));
      return next.length === current.length ? current : next;
    });
  }, [canvas.objects]);

  const toggleLayer = (object: FabricObject) => {
    const next = checked.includes(object)
      ? checked.filter((item) => item !== object)
      : [...checked, object];
    setChecked(next);
    shapes.selectLayers(next);
  };

  const toggleAll = () => {
    const next =
      checked.length === layerObjects.length ? [] : [...layerObjects];
    setChecked(next);
    shapes.selectLayers(next);
  };

  const moveSelection = (direction: "forward" | "backward") => {
    if (!checked.length) return;
    shapes.moveLayers(checked, direction);
  };

  const removeLayer = (object: FabricObject) => {
    shapes.deleteLayers([object]);
    setChecked((current) => current.filter((item) => item !== object));
  };

  const deleteChecked = () => {
    shapes.deleteLayers(checked);
    setChecked([]);
  };

  const duplicateChecked = async () => {
    const copies = await shapes.duplicateLayers(checked);
    setChecked(copies);
  };

  return (
    <div className="panel-content layers-content">
      <div className="layer-heading">
        <span>
          {checked.length
            ? `${checked.length} selected`
            : `${layerObjects.length} objects`}
        </span>
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
          disabled={!checked.length}
          onClick={() => void duplicateChecked()}
        >
          <CopyPlus size={15} />
        </button>
        <button
          type="button"
          className="mini-button"
          title="Move selected layers forward"
          aria-label="Move selected layers forward"
          disabled={!checked.length}
          onClick={() => moveSelection("forward")}
        >
          <ArrowUp size={15} />
        </button>
        <button
          type="button"
          className="mini-button"
          title="Move selected layers backward"
          aria-label="Move selected layers backward"
          disabled={!checked.length}
          onClick={() => moveSelection("backward")}
        >
          <ArrowDown size={15} />
        </button>
        <button
          type="button"
          className="mini-button danger-action"
          title="Delete selected layers"
          aria-label="Delete selected layers"
          disabled={!checked.length}
          onClick={deleteChecked}
        >
          <Trash2 size={15} />
        </button>
      </div>
      {[...layerObjects]
        .reverse()
        .map((object: FabricObject, reversedIndex) => {
          const index = layerObjects.length - reversedIndex - 1;
          const Icon =
            object instanceof FabricImage
              ? FileImage
              : object instanceof IText
                ? Type
                : Shapes;
          return (
            <div
              key={`${index}-${objectName(object, index)}`}
              className={`layer-row ${checked.includes(object) || canvas.selected === object ? "selected" : ""}`}
            >
              <button
                type="button"
                className="layer-check"
                aria-label={`${checked.includes(object) ? "Deselect" : "Select"} ${objectName(object, index)}`}
                aria-pressed={checked.includes(object)}
                onClick={() => toggleLayer(object)}
              >
                {checked.includes(object) ? (
                  <SquareCheck className="w-5 h-5" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <button
                type="button"
                className="layer-label"
                onClick={() => {
                  setChecked([object]);
                  shapes.selectLayer(object);
                }}
              >
                <span className="layer-thumb">
                  <Icon size={16} />
                </span>
                <span>{objectName(object, index)}</span>
              </button>
              <button
                type="button"
                className="layer-mini"
                title="Move forward"
                aria-label={`Move ${objectName(object, index)} forward`}
                onClick={() =>
                  shapes.moveLayers(
                    checked.includes(object) ? checked : [object],
                    "forward",
                  )
                }
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                className="layer-mini"
                title="Move backward"
                aria-label={`Move ${objectName(object, index)} backward`}
                onClick={() =>
                  shapes.moveLayers(
                    checked.includes(object) ? checked : [object],
                    "backward",
                  )
                }
              >
                <ArrowDown size={14} />
              </button>
              <button
                type="button"
                className="layer-mini delete-mini"
                title="Delete layer"
                aria-label={`Delete ${objectName(object, index)}`}
                onClick={() => removeLayer(object)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      {!layerObjects.length && (
        <p className="panel-note">
          Add text or shapes to start building your layers.
        </p>
      )}
    </div>
  );
}
