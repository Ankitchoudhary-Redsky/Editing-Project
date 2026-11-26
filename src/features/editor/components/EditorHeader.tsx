import {
  ArrowRight, BookmarkPlus,
  ChevronDown,
  Download,
  Eye,
  FolderOpen,
  Redo2,
  Share2,
  Undo2,
  Users,
  Search,
  X,
} from "lucide-react";
import { useEditor } from "../EditorContext";
import { useTemplateFeature } from '../../templates/components/TemplateFeatureContext'
import img1 from "../../../assets/logo.png";
import { Image as ImageIcon, Video } from "lucide-react";
import { editorToolCategories, shapeNames, videoTools } from "../model/constants";
import { threeDShapeChoices, threeDEmojiChoices } from "../operations/threeDShapes";
import "../../../styles/editor/collaboration.css";

type EditorHeaderProps = {
  featureSearch: string;
  setFeatureSearch: (value: string) => void;
};

export function EditorHeader({ featureSearch, setFeatureSearch }: EditorHeaderProps) {
  const {
    canvas,
    history,
    project,
    preview,
    editorMode,
    collaboration,
    tools,
    shapes,
    drawing,
    fabricCanvas,
    export: exportState,
  } = useEditor();
  const copyShareLink = async () => {
    const link = new URL(window.location.href);
    link.searchParams.set("document", collaboration.documentId);
    try {
      await navigator.clipboard.writeText(link.toString());
      tools.setNotice("Shared document link copied.");
    } catch {
      tools.setNotice("The share link could not be copied by this browser.");
    }
  };
  const saveLabel = collaboration.loading
    ? "Loading document"
    : collaboration.saveStatus === "saving"
      ? "Saving"
      : collaboration.saveStatus === "unsaved"
        ? "Unsaved changes"
        : collaboration.saveStatus === "error"
          ? "Save pending"
          : collaboration.documentId
            ? "Saved to cloud"
            : "Local only";
  const { setSaveDialogOpen } = useTemplateFeature()
    const normalizedSearch = featureSearch.trim().toLowerCase()
  const baseFeatureMatches = editorMode.active === "image"
    ? editorToolCategories.flatMap((category) =>
        category.tools.map((tool) => ({
          label: tool.label,
          mode: "image" as const,
          tool: tool.id,
          categoryLabel: category.label,
          shapeMode: undefined as "2d" | "3d" | undefined,
          drawingMode: undefined,
        })),
      )
    : videoTools.map((tool) => ({
        label: tool.label,
        mode: "video" as const,
        tool: tool.id,
        categoryLabel: "Video",
        shapeMode: undefined as "2d" | "3d" | undefined,
        drawingMode: undefined,
      }))

  const featureMatches = normalizedSearch
    ? (
        editorMode.active === "image"
          ? [
              ...baseFeatureMatches,
              { label: "2D shapes", mode: "image" as const, tool: "shapes" as const, categoryLabel: "Shapes", shapeMode: "2d" as const, drawingMode: undefined },
              { label: "3D shapes", mode: "image" as const, tool: "shapes" as const, categoryLabel: "Shapes", shapeMode: "3d" as const, drawingMode: undefined },
              ...Object.values(shapeNames).map((label) => ({ label: `${label} shape`, mode: "image" as const, tool: "shapes" as const, categoryLabel: "2D shapes", shapeMode: "2d" as const, drawingMode: undefined })),
              ...threeDShapeChoices.map((shape) => ({ label: `${shape.label} 3D shape`, mode: "image" as const, tool: "shapes" as const, categoryLabel: "3D shapes", shapeMode: "3d" as const, drawingMode: undefined })),
              ...threeDEmojiChoices.map((emoji) => ({ label: `${emoji.label} 3D emoji`, mode: "image" as const, tool: "shapes" as const, categoryLabel: "3D emoji", shapeMode: "3d" as const, drawingMode: undefined })),
              { label: "Pencil", mode: "image" as const, tool: "draw-remove" as const, categoryLabel: "Retouch", shapeMode: undefined, drawingMode: "pencil" as const },
              { label: "Sketch", mode: "image" as const, tool: "draw-remove" as const, categoryLabel: "Retouch", shapeMode: undefined, drawingMode: "sketch" as const },
              { label: "Marker", mode: "image" as const, tool: "draw-remove" as const, categoryLabel: "Retouch", shapeMode: undefined, drawingMode: "marker" as const },
              { label: "Highlighter", mode: "image" as const, tool: "draw-remove" as const, categoryLabel: "Retouch", shapeMode: undefined, drawingMode: "highlighter" as const },
              { label: "Eraser", mode: "image" as const, tool: "draw-remove" as const, categoryLabel: "Retouch", shapeMode: undefined, drawingMode: "eraser" as const },
              { label: "Object removal", mode: "image" as const, tool: "draw-remove" as const, categoryLabel: "Retouch", shapeMode: undefined, drawingMode: "magic-remover" as const },
              { label: "Freehand select", mode: "image" as const, tool: "draw-remove" as const, categoryLabel: "Retouch", shapeMode: undefined, drawingMode: "lasso" as const },
              { label: "Table", mode: "image" as const, tool: "draw-remove" as const, categoryLabel: "Project", shapeMode: undefined, drawingMode: undefined },
              { label: "Select objects", mode: "image" as const, tool: "layers" as const, categoryLabel: "Project", shapeMode: undefined, drawingMode: undefined },
              { label: "Rename project", mode: "image" as const, tool: "upload" as const, categoryLabel: "Project", shapeMode: undefined, drawingMode: undefined },
            ]
          : baseFeatureMatches
      ).filter((feature) =>
        `${feature.label} ${feature.categoryLabel}`.toLowerCase().includes(normalizedSearch),
      ).slice(0, 12)
    : []

  const activateFeature = (feature: (typeof featureMatches)[number]) => {
    editorMode.setActive(feature.mode)
    tools.setActive(feature.tool)
    if (feature.shapeMode) {
      shapes.setMode(feature.shapeMode)
      if (feature.shapeMode === "3d") fabricCanvas?.discardActiveObject()
      fabricCanvas?.requestRenderAll()
    }
    if (feature.drawingMode) {
      drawing.setActiveMode(feature.drawingMode)
    }
    if (feature.label === "Rename project") {
      project.setIsRenaming(true)
    }
    setFeatureSearch("")
    if (feature.tool === "crop") tools.beginCrop()
  }
  const finishRenaming = () => {
    if (!project.name.trim()) project.setName("Untitled");
    project.setIsRenaming(false);
  };

  return (
    <header className="topbar">
      <div className="brand-lockup">
        <div className="brand-mark">
          <img src={img1} alt="Logo" width="35" height="35" />
        </div>
        <span className="brand-name">
          e<span>studio</span>
        </span>
      </div>
      <div className="project-title">
        <div>
          {project.isRenaming ? (
            <input
              className="project-title-input"
              autoFocus
              value={project.name}
              title={project.name}
              onChange={(event) => project.setName(event.target.value)}
              onBlur={finishRenaming}
              onKeyDown={(event) => {
                if (event.key === "Enter") finishRenaming();
              }}
              aria-label="Project name"
            />
          ) : (
            <button
              className="project-name"
              onClick={() => project.setIsRenaming(true)}
              title={project.name || "Rename project"}
            >
              <span className="project-name-text" title={project.name}>{project.name}</span>
              <ChevronDown size={14} />
            </button>
          )}
          <span
            className={`save-status collaboration-save-status ${collaboration.saveStatus}`}
            aria-live="polite"
          >
            <span /> {saveLabel}
          </span>
          {(collaboration.documentId || collaboration.storageOnlyActive) && (
            <span
              className={`collaboration-connection ${collaboration.connectionStatus}${collaboration.storageOnlyActive ? " storage-only" : ""}`}
            >
              <span />
              {collaboration.storageOnlyActive
                ? collaboration.connectionStatus === "connected"
                  ? "Live only · not saved"
                  : "Local only · not saved"
                : collaboration.connectionStatus === "connected"
                  ? "Live"
                  : collaboration.connectionStatus === "connecting"
                    ? "Connecting"
                    : "Offline"}
            </span>
          )}
        </div>
        </div>
      <div className="feature-search">
        <Search size={15} aria-hidden="true" />
        <input
          value={featureSearch}
          onChange={(event) => setFeatureSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || !featureMatches.length) return
            event.preventDefault()
            activateFeature(featureMatches[0])
          }}
          placeholder="Search features"
          aria-label="Search features"
        />
        {featureSearch && (
          <button
            type="button"
            className="feature-search-clear"
            onClick={() => setFeatureSearch("")}
            aria-label="Clear feature search"
            title="Clear"
          >
            <X size={13} />
          </button>
        )}
        {normalizedSearch && (
          <div className="feature-search-results" role="listbox" aria-label="Feature search results">
            {featureMatches.length ? featureMatches.map((feature) => (
              <button
                type="button"
                role="option"
                key={`${feature.mode}-${feature.tool}-${feature.label}`}
                onClick={() => activateFeature(feature)}
              >
                <span>{feature.label}</span>
                <small>{feature.categoryLabel}</small>
              </button>
            )) : (
              <div className="feature-search-empty">No matching features</div>
            )}
          </div>
        )}
      </div>
      <div className="mode-switch" role="group" aria-label="Editor mode">
        <button
          type="button"
          className={editorMode.active === "image" ? "active" : ""}
          aria-pressed={editorMode.active === "image"}
          aria-label="Image mode"
          title="Image mode"
          onClick={() => editorMode.setActive("image")}
        >
          <ImageIcon size={14} />
          <span>Image</span>
        </button>
        <button
          type="button"
          className={editorMode.active === "video" ? "active" : ""}
          aria-pressed={editorMode.active === "video"}
          aria-label="Video mode"
          title="Video mode"
          onClick={() => editorMode.setActive("video")}
        >
          <Video size={14} />
          <span>Video</span>
        </button>
      </div>
      <div className="top-actions">
        {collaboration.enabled && (
          <button
            className="icon-button"
            type="button"
            title="Browse saved images"
            aria-label="Browse saved images"
            onClick={collaboration.openWorkspace}
            disabled={collaboration.loading}
          >
            <FolderOpen size={17} />
          </button>
        )}
        {collaboration.documentId ? (
          <button
            className="icon-button"
            type="button"
            title="Copy shared document link"
            aria-label="Copy shared document link"
            onClick={() => void copyShareLink()}
          >
            <Share2 size={17} />
          </button>
        ) : null}
        {/* Temporarily disabled: create shared document / CloudUpload button.
        {canvas.hasImage && collaboration.enabled ? (
          <button
            className="icon-button"
            type="button"
            title="Create shared document"
            aria-label="Create shared document"
            onClick={() => void collaboration.createSharedCopy()}
          >
            <CloudUpload size={17} />
          </button>
        ) : null}
        */}
        {(collaboration.documentId || collaboration.storageOnlyActive) && (
          <span
            className="collaboration-presence"
            title={`${collaboration.activeUsers} guest clients connected`}
          >
            <Users size={15} /> {collaboration.activeUsers}
          </span>
        )}
        <button className="save-templatebtn" onClick={() => setSaveDialogOpen(true)} disabled={!canvas.hasDocument} title="Save template" aria-label="Save template"><BookmarkPlus size={16} /> Save template</button>
        <button
          className="icon-button"
          title="Undo"
          aria-label="Undo"
          disabled={!history.canUndo}
          onClick={history.undo}
        >
          <Undo2 size={18} />
        </button>
        <button
          className="icon-button"
          title="Redo"
          aria-label="Redo"
          disabled={!history.canRedo}
          onClick={history.redo}
        >
          <Redo2 size={18} />
        </button>
        <span className="action-divider" />
        <button className="preview-button" onClick={preview.show} disabled={!canvas.hasDocument} title="Preview" aria-label="Preview"><Eye size={16} /> Preview</button>
        <button className="preview-button" onClick={() => void exportState.share()} disabled={!canvas.hasDocument || exportState.shareBusy} title="Share edited image"><Share2 size={16} /> {exportState.shareBusy ? 'Preparing…' : 'Share'}</button>
        <button className="download-button" onClick={() => exportState.setOpen(true)} disabled={!canvas.hasDocument}><Download size={16} /> Export</button>
      </div>
    </header>
  );
}

export function DocumentBreadcrumb() {
  const { project } = useEditor();
  return (
    <div className="document-breadcrumb">
      <span>Design</span>
      <ArrowRight size={13} />
      <strong>{project.name}</strong>
    </div>
  );
}
