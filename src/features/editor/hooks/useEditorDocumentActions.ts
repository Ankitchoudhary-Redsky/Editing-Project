import { useCallback, useRef } from "react";
import type { UseEditorDocumentActionsOptions } from "../model/types";
import { useImageUpload } from "./useImageUpload";
import { deleteProjectDraft } from "../operations/projectStorage";
import { loadLocalImage } from "../operations/loadLocalImage";

export function useEditorDocumentActions({
  uploadOptions,
  resetTables,
  resetDrawing,
  canvasRef,
  imageObjectRef,
  cropObjectRef,
  cropOriginalSnapshotRef,
  suppressHistoryRef,
  setHasImage,
  setHasDocument,
  setImageThumbnail,
  setCropActive,
  setDimensions,
  restoreResize,
  restoreBackground,
  setIsRemovingBackground,
  setBackgroundProgress,
  recordHistory,
  syncObjects,
  resizeDisplay,
  setNotice,
  setDraggingFile,
}: UseEditorDocumentActionsOptions) {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const setUploadInputElement = useCallback(
    (element: HTMLInputElement | null) => {
      uploadInputRef.current = element;
    },
    [],
  );

  const uploadFile = useImageUpload({
    ...uploadOptions,
    resetTables,
    resetDrawing,
  });

  const addSignatureImage = async (file: File) => {
    const canvas = canvasRef.current;
    if (!canvas || !file.type.startsWith("image/")) return;
    try {
      const { image } = await loadLocalImage(file);
      const maxWidth = Math.min(canvas.getWidth() * 0.48, 320);
      const maxHeight = Math.min(canvas.getHeight() * 0.24, 120);
      const scale = Math.min(
        maxWidth / (image.width ?? 1),
        maxHeight / (image.height ?? 1),
      );
      image.set({
        left: canvas.getWidth() * 0.18,
        top: canvas.getHeight() * 0.4,
        scaleX: scale,
        scaleY: scale,
        selectable: true,
        evented: true,
      });
      image.set("name", "Signature");
      canvas.add(image);
      canvas.setActiveObject(image);
      canvas.requestRenderAll();
      recordHistory(true);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "This signature image could not be opened.",
      );
    }
  };

  const deleteImage = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageObjectRef.current) return;

    suppressHistoryRef.current = true;
    canvas.clear();
    canvas.setDimensions({ width: 1200, height: 800 });
    canvas.backgroundColor = "rgba(0,0,0,0)";
    canvas.requestRenderAll();

    cropObjectRef.current = null;
    cropOriginalSnapshotRef.current = null;
    imageObjectRef.current = null;
    setHasImage(false);
    setHasDocument(false);
    setImageThumbnail("");
    setCropActive(false);
    setDimensions({ width: 1200, height: 800 });
    restoreResize({
      width: 1200,
      height: 800,
      keepRatio: true,
      scaleArtwork: true,
    });
    restoreBackground(false, "#ffffff");
    setIsRemovingBackground(false);
    setBackgroundProgress("");
    resetDrawing();
    resetTables();

    suppressHistoryRef.current = false;
    syncObjects();
    recordHistory(true);
    resizeDisplay();
    void deleteProjectDraft().catch(() => {
      setNotice(
        "Deleted project data could not be cleared from browser storage.",
      );
    });
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDraggingFile(false);
    void uploadFile(event.dataTransfer.files[0]);
  };

  const openFilePicker = () => {
    uploadInputRef.current?.click();
  };

  return {
    uploadFile,
    addSignatureImage,
    deleteImage,
    handleDrop,
    openFilePicker,
    setUploadInputElement,
  };
}
