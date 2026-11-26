import { useState, type DragEvent } from "react";
import { useEditor } from "../EditorContext";
import { EditorNotice, ExportDialog, PreviewDialog } from "./EditorDialogs";
import { EditorHeader } from "./EditorHeader";
import { EditorWorkspace } from "./EditorWorkspace";
import { ToolPanel } from "./ToolPanel";
import { ToolRail } from "./ToolRail";
import type { EditorShellProps } from "../model/types";

export function EditorShell({
  historyVersion,
  setUploadInputElement,
  setCanvasElement,
  setStageElement,
}: EditorShellProps) {
  const { tools, canvas, pages, handleDrop } = useEditor();
  const [featureSearch, setFeatureSearch] = useState("");
  const showEditorTools = canvas.hasDocument || pages.activeId !== null;

  const handleDragOver = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    tools.setDraggingFile(event.dataTransfer?.types.includes("Files"));
  };

  const handleDragLeave = (event: DragEvent<HTMLElement>) => {
    if (event.currentTarget === event.target) tools.setDraggingFile(false);
  };
  

  return (
    <main
      className="editor-app"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
       {canvas.hasDocument && (
        <EditorHeader
          featureSearch={featureSearch}
          setFeatureSearch={setFeatureSearch}
        />
      )}
      <input
        ref={setUploadInputElement}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => {
          void tools.uploadFile(event.target.files?.[0]);
          event.currentTarget.value = "";
        }}
      />
      <section className="editor-body">
        {showEditorTools && <ToolRail />}
        {showEditorTools && <ToolPanel />}
        <EditorWorkspace
          historyVersion={historyVersion}
          setCanvasElement={setCanvasElement}
          setStageElement={setStageElement}
        />
      </section>
      <EditorNotice />
      <ExportDialog />
      <PreviewDialog />
      <span className="visually-hidden" aria-live="polite">
        {historyVersion > 0 ? "Document updated" : ""}
      </span>
    </main>
  );
}
