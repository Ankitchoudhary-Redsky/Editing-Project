import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import type { MutableRefObject } from "react";
import { FabricObject, Shadow, StaticCanvas } from "fabric";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  ChevronRight,
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  Layers3,
  Link2,
  Lock,
  MessageSquareText,
  MoreHorizontal,
  MoveDown,
  MoveUp,
  Pencil,
  Trash2,
  Unlock,
  X,
} from "lucide-react";

import { useEditor } from "../EditorContext";

FabricObject.customProperties = Array.from(
  new Set([
    ...FabricObject.customProperties,
    "comment",
    "comments",
    "link",
    "objectLocked",
    "startTime",
    "duration",
  ]),
);

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

type ObjectComment = {
  id: string;
  author: string;
  text: string;
  createdAt: number;
  updatedAt?: number;
};

function readObjectComments(target: FabricObject): ObjectComment[] {
  const stored = target.get("comments");
  if (Array.isArray(stored)) {
    return stored.filter(
      (comment): comment is ObjectComment =>
        Boolean(comment) &&
        typeof comment.id === "string" &&
        typeof comment.text === "string" &&
        typeof comment.createdAt === "number",
    );
  }

  const legacyComment = target.get("comment");
  return typeof legacyComment === "string" && legacyComment.trim()
    ? [{ id: "legacy-comment", author: "You", text: legacyComment, createdAt: 0 }]
    : [];
}

function formatCommentDate(timestamp: number) {
  return timestamp > 0 ? new Date(timestamp).toLocaleString() : "Previously added";
}

function normalizeExternalUrl(value: string) {
  const rawUrl = value.trim();
  if (!rawUrl) return null;
  const normalizedUrl = /^[a-z][a-z\d+.-]*:/i.test(rawUrl)
    ? rawUrl
    : `https://${rawUrl}`;

  try {
    const parsedUrl = new URL(normalizedUrl);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? parsedUrl.href
      : null;
  } catch {
    return null;
  }
}

function hasObjectStyle(object: FabricObject, key: string) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function getStyleSnapshot(object: FabricObject) {
  const snapshot: Record<string, unknown> = {};

  const styleKeys = [
    "fill",
    "stroke",
    "strokeWidth",
    "opacity",
    "fontFamily",
    "fontSize",
    "fontWeight",
    "fontStyle",
    "backgroundColor",
    "textBackgroundColor",
  ] as const;

  for (const key of styleKeys) {
    if (hasObjectStyle(object, key)) {
      const value = object.get(key as never);
      if (value !== undefined && value !== null) snapshot[key] = value;
    }
  }

  if (object.shadow) {
    snapshot.shadow = object.shadow.toObject();
  }

  return snapshot;
}

function applyStyleSnapshot(
  target: FabricObject,
  snapshot: Record<string, unknown>,
  fabricCanvas: ReturnType<typeof useEditor>["fabricCanvas"],
) {
  if (!fabricCanvas) return;

  if ("fill" in snapshot && snapshot.fill !== undefined)
    target.set("fill", snapshot.fill as string);
  if ("stroke" in snapshot && snapshot.stroke !== undefined)
    target.set("stroke", snapshot.stroke as string);
  if (
    "strokeWidth" in snapshot &&
    snapshot.strokeWidth !== undefined &&
    typeof snapshot.strokeWidth === "number"
  )
    target.set("strokeWidth", snapshot.strokeWidth);
  if ("opacity" in snapshot && snapshot.opacity !== undefined)
    target.set("opacity", Number(snapshot.opacity));
  if (
    "fontFamily" in snapshot &&
    snapshot.fontFamily !== undefined &&
    typeof snapshot.fontFamily === "string"
  )
    target.set("fontFamily", snapshot.fontFamily);
  if (
    "fontSize" in snapshot &&
    snapshot.fontSize !== undefined &&
    typeof snapshot.fontSize === "number"
  )
    target.set("fontSize", snapshot.fontSize);
  if (
    "fontWeight" in snapshot &&
    snapshot.fontWeight !== undefined &&
    typeof snapshot.fontWeight === "string"
  )
    target.set("fontWeight", snapshot.fontWeight);
  if (
    "fontStyle" in snapshot &&
    snapshot.fontStyle !== undefined &&
    typeof snapshot.fontStyle === "string"
  )
    target.set("fontStyle", snapshot.fontStyle);
  if (
    "backgroundColor" in snapshot &&
    snapshot.backgroundColor !== undefined
  )
    target.set("backgroundColor", snapshot.backgroundColor as string);
  if (
    "textBackgroundColor" in snapshot &&
    snapshot.textBackgroundColor !== undefined
  )
    target.set(
      "textBackgroundColor",
      snapshot.textBackgroundColor as string,
    );
  if (snapshot.shadow && typeof snapshot.shadow === "object") {
    target.set("shadow", new Shadow(snapshot.shadow as never));
  }

  target.setCoords();
  fabricCanvas.requestRenderAll();
}

export function CanvasContextMenu({
  holderRef,
}: {
  holderRef: MutableRefObject<HTMLDivElement | null>;
}) {
  const { fabricCanvas, canvas, shapes } = useEditor();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const sidePanelRef = useRef<HTMLElement | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [triggerPosition, setTriggerPosition] = useState<{ left: number; top: number } | null>(null);
  const [submenu, setSubmenu] = useState<"layer" | "align" | null>(null);
  const [submenuPlacement, setSubmenuPlacement] = useState<"left" | "right">("right");
  const [copiedElement, setCopiedElement] = useState<FabricObject | null>(null);
  const [copiedStyle, setCopiedStyle] = useState<Record<string, unknown> | null>(null);
  const [commentOpen, setCommentOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [comments, setComments] = useState<ObjectComment[]>([]);
  const [commentTarget, setCommentTarget] = useState<FabricObject | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkDraft, setLinkDraft] = useState("");
  const [linkTarget, setLinkTarget] = useState<FabricObject | null>(null);
  const [pasteCount, setPasteCount] = useState(0);

  const activeObject = fabricCanvas?.getActiveObject() ?? canvas.selected;

  useEffect(() => {
    if (!activeObject || !fabricCanvas || !holderRef.current) {
      setTriggerPosition(null);
      return;
    }

    const updateTriggerPosition = () => {
      const canvasElement = fabricCanvas.getElement();
      const canvasRect = canvasElement.getBoundingClientRect();
      const holderRect = holderRef.current?.getBoundingClientRect();
      if (!holderRect) return;

      const anchor = activeObject.aCoords?.tr ?? {
        x: activeObject.getBoundingRect().left + activeObject.getBoundingRect().width,
        y: activeObject.getBoundingRect().top,
      };
      const visualScale = (fabricCanvas.getZoom() ?? 1) * (canvas.fitScale ?? 1);
      const buttonSize = 28;
      const left = clamp(
        (anchor.x ?? 0) * visualScale + (canvasRect.left - holderRect.left) + 10,
        8,
        Math.max(8, holderRect.width - buttonSize - 8),
      );
      const top = clamp(
        (anchor.y ?? 0) * visualScale + (canvasRect.top - holderRect.top) + 10,
        8,
        Math.max(8, holderRect.height - buttonSize - 8),
      );

      setTriggerPosition({ left, top });
    };

    updateTriggerPosition();

    fabricCanvas.on("object:moving", updateTriggerPosition);
    fabricCanvas.on("object:scaling", updateTriggerPosition);
    fabricCanvas.on("object:modified", updateTriggerPosition);
    fabricCanvas.on("selection:updated", updateTriggerPosition);

    return () => {
      fabricCanvas.off("object:moving", updateTriggerPosition);
      fabricCanvas.off("object:scaling", updateTriggerPosition);
      fabricCanvas.off("object:modified", updateTriggerPosition);
      fabricCanvas.off("selection:updated", updateTriggerPosition);
    };
  }, [activeObject, fabricCanvas, holderRef]);

  const closeMenu = useCallback(() => {
    setMenuPosition(null);
    setSubmenu(null);
    setCommentOpen(false);
    setLinkOpen(false);
    setCommentTarget(null);
    setLinkTarget(null);
    setEditingCommentId(null);
  }, []);

  const commitObjectChange = (target: FabricObject) => {
    target.setCoords();
    fabricCanvas?.requestRenderAll();
    fabricCanvas?.fire("object:modified", { target });
  };

  useEffect(() => {
    if (!fabricCanvas || !activeObject) return;

    const syncSelection = () => {
      if (menuPosition) setMenuPosition((current) => current && { ...current });
    };

    fabricCanvas.on("object:moving", syncSelection);
    fabricCanvas.on("object:scaling", syncSelection);
    fabricCanvas.on("object:modified", syncSelection);
    fabricCanvas.on("selection:updated", syncSelection);

    return () => {
      fabricCanvas.off("object:moving", syncSelection);
      fabricCanvas.off("object:scaling", syncSelection);
      fabricCanvas.off("object:modified", syncSelection);
      fabricCanvas.off("selection:updated", syncSelection);
    };
  }, [fabricCanvas, activeObject, menuPosition]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!menuPosition && !commentOpen && !linkOpen) return;
      if (menuRef.current && target && menuRef.current.contains(target)) return;
      if (sidePanelRef.current && target && sidePanelRef.current.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest('[data-menu-trigger="object-menu"], [data-comment-trigger="object-comments"]')
      )
        return;
      closeMenu();
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && (menuPosition || commentOpen || linkOpen)) {
        closeMenu();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [closeMenu, commentOpen, linkOpen, menuPosition]);

  useEffect(() => {
    const handleToggleComment = () => {
      const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
      if (!target) return;
      if (commentOpen && commentTarget === target) {
        closeMenu();
        return;
      }
      setCommentTarget(target);
      setComments(readObjectComments(target));
      setCommentDraft("");
      setEditingCommentId(null);
      setMenuPosition(null);
      setSubmenu(null);
      setLinkOpen(false);
      setCommentOpen(true);
    };

    window.addEventListener("editor:toggle-object-comment", handleToggleComment);
    return () => window.removeEventListener("editor:toggle-object-comment", handleToggleComment);
  }, [canvas.selected, closeMenu, commentOpen, commentTarget, fabricCanvas]);

  const openMenuAt = (x: number, y: number) => {
    const holder = holderRef.current;
    if (!holder) return;

    const width = 220;
    const height = 420;
    const left = clamp(x, 12, Math.max(12, holder.clientWidth - width - 12));
    const top = clamp(y, 12, Math.max(12, holder.clientHeight - height - 12));
    setMenuPosition({
      x: left,
      y: top,
    });
    setSubmenuPlacement(left + width + 208 > holder.clientWidth - 8 ? "left" : "right");
  };

  const handleContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const target =
      fabricCanvas?.findTarget(event.nativeEvent) ??
      fabricCanvas?.getActiveObject() ??
      canvas.selected;

    if (!target || !fabricCanvas) return;

    fabricCanvas.setActiveObject(target);
    fabricCanvas.requestRenderAll();

    const holderRect = holderRef.current?.getBoundingClientRect();
    if (!holderRect) return;

    const x = clamp(event.clientX - holderRect.left, 12, Math.max(12, holderRect.width - 220));
    const y = clamp(event.clientY - holderRect.top, 12, Math.max(12, holderRect.height - 420));
    openMenuAt(x, y);
  };

  const handleCopy = useCallback(async () => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
    if (!target || !fabricCanvas) return;
    const clone = await target.clone();
    setCopiedElement(clone);
    setCopiedStyle(null);
    setPasteCount(0);
    closeMenu();
  }, [canvas.selected, closeMenu, fabricCanvas]);

  const handleCopyStyle = () => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
    if (!target) return;
    setCopiedStyle(getStyleSnapshot(target));
    setCopiedElement(null);
    setPasteCount(0);
    closeMenu();
  };

  const handlePaste = useCallback(async () => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
    if (!fabricCanvas) return;

    if (copiedElement) {
      const clone = await copiedElement.clone();
      const offset = 24 * (pasteCount + 1);
      clone.set({
        left: (copiedElement.left ?? target?.left ?? 0) + offset,
        top: (copiedElement.top ?? target?.top ?? 0) + offset,
      });
      fabricCanvas.add(clone);
      fabricCanvas.setActiveObject(clone);
      fabricCanvas.requestRenderAll();
      setPasteCount((current) => current + 1);
      closeMenu();
      return;
    }

    if (copiedStyle && target) {
      applyStyleSnapshot(target, copiedStyle, fabricCanvas);
      closeMenu();
    }
  }, [canvas.selected, closeMenu, copiedElement, copiedStyle, fabricCanvas, pasteCount]);

  useEffect(() => {
    const handleClipboardShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key !== "c" && key !== "v") return;

      const eventTarget = event.target;
      if (
        eventTarget instanceof HTMLElement &&
        eventTarget.closest("input, textarea, select, [contenteditable='true']")
      ) return;
      if (activeObject && "isEditing" in activeObject && activeObject.isEditing) return;

      if (key === "c") {
        if (!activeObject) return;
        event.preventDefault();
        void handleCopy();
      } else if (copiedElement || copiedStyle) {
        event.preventDefault();
        void handlePaste();
      }
    };

    window.addEventListener("keydown", handleClipboardShortcut);
    return () => window.removeEventListener("keydown", handleClipboardShortcut);
  }, [activeObject, copiedElement, copiedStyle, handleCopy, handlePaste]);

  const triggerAction = (action: () => void | Promise<void>) => {
    action();
    closeMenu();
  };

  const handleDuplicate = async () => {
    await shapes.duplicate();
    closeMenu();
  };

  const handleDelete = () => {
    shapes.delete();
    closeMenu();
  };

  const handleLayerAction = (direction: "forward" | "backward" | "front" | "back") => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
    if (!fabricCanvas || !target) return;

    if (direction === "forward") fabricCanvas.bringObjectForward(target);
    if (direction === "backward") fabricCanvas.sendObjectBackwards(target);
    if (direction === "front") fabricCanvas.bringObjectToFront(target);
    if (direction === "back") fabricCanvas.sendObjectToBack(target);

    commitObjectChange(target);
    closeMenu();
  };

  const handleAlign = (mode: "left" | "center" | "right" | "top" | "middle" | "bottom") => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
    if (!fabricCanvas || !target) return;

    const width = fabricCanvas.getWidth();
    const height = fabricCanvas.getHeight();
    const bounds = target.getBoundingRect();

    const desiredLeft =
      mode === "left" ? 0
        : mode === "center" ? (width - bounds.width) / 2
          : mode === "right" ? width - bounds.width
            : bounds.left;
    const desiredTop =
      mode === "top" ? 0
        : mode === "middle" ? (height - bounds.height) / 2
          : mode === "bottom" ? height - bounds.height
            : bounds.top;
    target.set({
      left: (target.left ?? 0) + desiredLeft - bounds.left,
      top: (target.top ?? 0) + desiredTop - bounds.top,
    });
    commitObjectChange(target);
    closeMenu();
  };

  const handleLockToggle = () => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
    if (!fabricCanvas || !target) return;

    const lockState = target.get("objectLocked");
    const locked = lockState === undefined
      ? Boolean(target.lockMovementX && target.lockMovementY && target.lockScalingX && target.lockScalingY)
      : Boolean(lockState);

    target.set({
      objectLocked: !locked,
      lockMovementX: !locked,
      lockMovementY: !locked,
      lockScalingX: !locked,
      lockScalingY: !locked,
      lockRotation: !locked,
      evented: true,
      selectable: true,
    });

    commitObjectChange(target);
    closeMenu();
  };

  const handleLink = () => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
    if (!target) return;

    setLinkTarget(target);
    setLinkDraft((target.get("link") as string | undefined) ?? "");
    setCommentOpen(false);
    setMenuPosition(null);
    setSubmenu(null);
    setLinkOpen(true);
  };

  const openComment = () => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
    if (!target) return;

    setCommentTarget(target);
    setComments(readObjectComments(target));
    setCommentDraft("");
    setEditingCommentId(null);
    setLinkOpen(false);
    setMenuPosition(null);
    setSubmenu(null);
    setCommentOpen(true);
  };

  const saveComment = () => {
    const target = commentTarget;
    const text = commentDraft.trim();
    if (!target || !text) return;

    const now = Date.now();
    const nextComments = editingCommentId
      ? comments.map((comment) =>
          comment.id === editingCommentId
            ? { ...comment, text, updatedAt: now }
            : comment,
        )
      : [
          ...comments,
          {
            id: globalThis.crypto?.randomUUID?.() ?? `comment-${now}`,
            author: "You",
            text,
            createdAt: now,
          },
        ];

    target.set({ comments: nextComments, comment: "" });
    commitObjectChange(target);
    setComments(nextComments);
    setCommentDraft("");
    setEditingCommentId(null);
  };

  const deleteComment = (commentId: string) => {
    const target = commentTarget;
    if (!target) return;

    const nextComments = comments.filter((comment) => comment.id !== commentId);
    target.set({ comments: nextComments, comment: "" });
    commitObjectChange(target);
    setComments(nextComments);
    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setCommentDraft("");
    }
  };

  const saveLink = () => {
    const target = linkTarget;
    const normalizedUrl = normalizeExternalUrl(linkDraft);
    if (!target || !normalizedUrl) return;

    target.set("link", normalizedUrl);
    commitObjectChange(target);
    setLinkDraft(normalizedUrl);
  };

  const removeLink = () => {
    if (!linkTarget) return;
    linkTarget.set("link", "");
    commitObjectChange(linkTarget);
    setLinkDraft("");
  };

  const openLink = () => {
    const url = normalizeExternalUrl(linkDraft);
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadSelection = async () => {
    const target = fabricCanvas?.getActiveObject() ?? canvas.selected;
    if (!target || !fabricCanvas) return;

    try {
      const clone = await target.clone();
      clone.set({
        left: 0,
        top: 0,
        shadow: null,
      });
      clone.setCoords();

      const exportCanvas = document.createElement("canvas");
      const bounds = clone.getBoundingRect();
      exportCanvas.width = Math.max(1, Math.ceil(bounds.width + 20));
      exportCanvas.height = Math.max(1, Math.ceil(bounds.height + 20));
      const context = exportCanvas.getContext("2d");
      if (!context) return;

      context.clearRect(0, 0, exportCanvas.width, exportCanvas.height);
      const temp = new StaticCanvas(exportCanvas, {
        width: exportCanvas.width,
        height: exportCanvas.height,
      });
      clone.set({
        left: 10,
        top: 10,
        originX: "left",
        originY: "top",
      });
      temp.add(clone);
      temp.renderAll();

      const link = document.createElement("a");
      link.href = exportCanvas.toDataURL("image/png");
      link.download = "selection.png";
      link.click();
      temp.dispose();
      closeMenu();
    } catch {
      closeMenu();
    }
  };

  const layerMenu = [
    { label: "Bring to Front", shortcut: "", icon: ArrowUpToLine, onClick: () => handleLayerAction("front") },
    { label: "Bring Forward", shortcut: "", icon: MoveUp, onClick: () => handleLayerAction("forward") },
    { label: "Send Backward", shortcut: "", icon: MoveDown, onClick: () => handleLayerAction("backward") },
    { label: "Send to Back", shortcut: "", icon: ArrowDownToLine, onClick: () => handleLayerAction("back") },
  ];

  const alignMenu = [
    { label: "Align Left", shortcut: "", icon: AlignLeft, onClick: () => handleAlign("left") },
    { label: "Align Center", shortcut: "", icon: AlignCenter, onClick: () => handleAlign("center") },
    { label: "Align Right", shortcut: "", icon: AlignRight, onClick: () => handleAlign("right") },
    { label: "Align Top", shortcut: "", icon: ArrowUpToLine, onClick: () => handleAlign("top") },
    { label: "Align Middle", shortcut: "", icon: AlignCenter, onClick: () => handleAlign("middle") },
    { label: "Align Bottom", shortcut: "", icon: ArrowDownToLine, onClick: () => handleAlign("bottom") },
  ];

  const menuItems = [
    { label: "Copy", shortcut: "⌘C", icon: Copy, onClick: () => triggerAction(handleCopy) },
    { label: "Copy style", shortcut: "", icon: Copy, onClick: () => triggerAction(handleCopyStyle) },
    { label: "Paste", shortcut: "⌘V", icon: ClipboardPaste, onClick: () => triggerAction(handlePaste) },
    { label: "Duplicate", shortcut: "⌘D", icon: Layers3, onClick: () => triggerAction(handleDuplicate) },
    { label: "Delete", shortcut: "Del", icon: Trash2, onClick: () => triggerAction(handleDelete) },
    {
      label: "Layer",
      shortcut: "",
      icon: Layers3,
      onClick: () => setSubmenu((current) => (current === "layer" ? null : "layer")),
      submenu: layerMenu,
    },
    {
      label: "Align to page",
      shortcut: "",
      icon: AlignCenter,
      onClick: () => setSubmenu((current) => (current === "align" ? null : "align")),
      submenu: alignMenu,
    },
    { label: "Comment", shortcut: "", icon: MessageSquareText, onClick: openComment },
    {
      label: activeObject && (
        activeObject.get("objectLocked") === true ||
        (activeObject.get("objectLocked") === undefined && Boolean(activeObject.lockMovementX))
      ) ? "Unlock" : "Lock",
      shortcut: "",
      icon: activeObject && (
        activeObject.get("objectLocked") === true ||
        (activeObject.get("objectLocked") === undefined && Boolean(activeObject.lockMovementX))
      ) ? Unlock : Lock,
      onClick: () => triggerAction(handleLockToggle),
    },
    { label: "Link", shortcut: "", icon: Link2, onClick: handleLink },
    { label: "Download selection", shortcut: "", icon: Download, onClick: () => triggerAction(handleDownloadSelection) },
  ];

  if (!activeObject) return null;

  return (
    <div className="canvas-context-layer" onContextMenu={handleContextMenu}>
      {triggerPosition && (
        <button
          type="button"
          data-menu-trigger="object-menu"
          className="canvas-context-trigger"
          style={{ left: `${triggerPosition.left}px`, top: `${triggerPosition.top}px` }}
          aria-label="Open element actions"
          title="Open element actions"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            if (menuPosition) {
              closeMenu();
              return;
            }
            openMenuAt(triggerPosition.left + 6, triggerPosition.top - 14);
          }}
        >
          <MoreHorizontal size={15} />
        </button>
      )}

      {menuPosition && (
        <div
          ref={menuRef}
          className="canvas-context-menu"
          style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          {menuItems.map((item) => {
            const Icon = item.icon;
            const hasSubmenu = Boolean(item.submenu);
            const isOpen =
              (submenu === "layer" && item.label === "Layer") ||
              (submenu === "align" && item.label === "Align to page");

            return (
              <div key={item.label} className="canvas-menu-item-wrap">
                <button
                  type="button"
                  className="canvas-menu-item"
                  onClick={item.onClick}
                  onMouseEnter={() => {
                    if (hasSubmenu) {
                      setSubmenu(
                        item.label === "Layer"
                          ? "layer"
                          : item.label === "Align to page"
                            ? "align"
                            : null,
                      );
                    }
                  }}
                >
                  <span className="canvas-menu-item-main">
                    <span className="canvas-menu-item-icon">
                      <Icon size={15} />
                    </span>
                    <span>{item.label}</span>
                  </span>
                  <span className="canvas-menu-item-side">
                    {item.shortcut ? <small>{item.shortcut}</small> : null}
                    {hasSubmenu ? <ChevronRight size={13} /> : null}
                  </span>
                </button>

                {hasSubmenu && isOpen && (
                  <div className={`canvas-context-submenu ${submenuPlacement === "left" ? "opens-left" : ""}`}>
                    {item.submenu?.map((subItem) => {
                      const SubIcon = subItem.icon;
                      return (
                        <button
                          key={subItem.label}
                          type="button"
                          className="canvas-menu-item"
                          onClick={() => {
                            subItem.onClick();
                            closeMenu();
                          }}
                        >
                          <span className="canvas-menu-item-main">
                            <span className="canvas-menu-item-icon">
                              <SubIcon size={15} />
                            </span>
                            <span>{subItem.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {commentOpen && (
        <section
          ref={sidePanelRef}
          className="canvas-side-panel canvas-comment-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Comments for selected element"
        >
          <header className="canvas-side-panel-header">
            <div className="canvas-comment-heading">
              <MessageSquareText size={17} />
              <strong>Comments</strong>
              <span>{comments.length}</span>
            </div>
            <button type="button" className="canvas-panel-close" onClick={closeMenu} aria-label="Close comments">
              <X size={17} />
            </button>
          </header>
          <div className="canvas-comment-list" aria-live="polite">
            {comments.length === 0 ? (
              <p className="canvas-panel-empty">No comments yet.</p>
            ) : comments.map((comment) => (
              <article className="canvas-comment-entry" key={comment.id}>
                <div className="canvas-comment-meta">
                  <strong>{comment.author || "You"}</strong>
                  <time>{formatCommentDate(comment.updatedAt ?? comment.createdAt)}</time>
                </div>
                <p>{comment.text}</p>
                <div className="canvas-comment-entry-actions">
                  <button
                    type="button"
                    aria-label="Edit comment"
                    title="Edit comment"
                    onClick={() => {
                      setEditingCommentId(comment.id);
                      setCommentDraft(comment.text);
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete comment"
                    title="Delete comment"
                    onClick={() => deleteComment(comment.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </article>
            ))}
          </div>
          <form
            className="canvas-comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveComment();
            }}
          >
            <label htmlFor="canvas-comment-draft">
              {editingCommentId ? "Edit comment" : "Add a comment"}
            </label>
            <textarea
              id="canvas-comment-draft"
              autoFocus
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              placeholder="Write a comment..."
              aria-label="Comment text"
            />
            <div className="canvas-comment-actions">
              {editingCommentId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingCommentId(null);
                    setCommentDraft("");
                  }}
                >
                  Cancel edit
                </button>
              )}
              <button type="submit" disabled={!commentDraft.trim()}>
                {editingCommentId ? "Save changes" : "Save comment"}
              </button>
            </div>
          </form>
        </section>
      )}

      {linkOpen && (
        <section
          ref={sidePanelRef}
          className="canvas-side-panel canvas-link-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Link selected element"
        >
          <header className="canvas-side-panel-header">
            <div className="canvas-comment-heading">
              <Link2 size={17} />
              <strong>Link</strong>
            </div>
            <button type="button" className="canvas-panel-close" onClick={closeMenu} aria-label="Close link editor">
              <X size={17} />
            </button>
          </header>
          <form
            className="canvas-link-form"
            onSubmit={(event) => {
              event.preventDefault();
              saveLink();
            }}
          >
            <label htmlFor="canvas-link-url">Website URL</label>
            <input
              id="canvas-link-url"
              type="text"
              inputMode="url"
              value={linkDraft}
              onChange={(event) => setLinkDraft(event.target.value)}
              placeholder="https://example.com"
              autoFocus
            />
            <p>Enter a web address to link this element.</p>
            <div className="canvas-comment-actions">
              {Boolean(linkTarget?.get("link")) && (
                <button type="button" onClick={removeLink}>Remove link</button>
              )}
              {linkDraft.trim() && (
                <button type="button" onClick={openLink}>
                  <ExternalLink size={14} /> Open
                </button>
              )}
              <button type="submit" disabled={!normalizeExternalUrl(linkDraft)}>
                Save link
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
