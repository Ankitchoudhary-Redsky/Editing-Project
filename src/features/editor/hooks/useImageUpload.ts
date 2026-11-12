import { useRef } from "react";
import type { UseImageUploadOptions } from "../model/types";
import { hasTransparentPixels } from "../operations/removeImageBackground";
import { loadLocalImage } from "../operations/loadLocalImage";

export function useImageUpload({
  canvasRef,
  imageObjectRef,
  imageSourceRef,
  suppressHistoryRef,
  selectedFilterRef,
  filterIntensityRef,
  backgroundRemovedRef,
  backgroundColorRef,
  resetTables,
  resetDrawing,
  setBackgroundRemoved,
  setBackgroundColor,
  setIsRemovingBackground,
  setBackgroundProgress,
  setSelectedFilter,
  setFilterIntensity,
  setDimensions,
  setHasDocument,
  setImageThumbnail,
  setBrightness,
  setContrast,
  setSaturation,
  setZoom,
  resizeDisplay,
  initializeHistory,
  syncObjects,
  setNotice,
  setDraggingFile,
  markUserInteractionBeforeDraftLoad,
}: UseImageUploadOptions) {
  const uploadRequestRef = useRef(0);

  return async function uploadFile(
    file?: File,
    onProgress?: (progress: number) => void,
  ): Promise<string | null> {
    if (!file) return null;
    const requestId = ++uploadRequestRef.current;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      const message = "Choose a PNG, JPG, or WebP image.";
      setNotice(message);
      return message;
    }
    if (file.size > 30 * 1024 * 1024) {
      const message = "Images must be smaller than 30 MB.";
      setNotice(message);
      return message;
    }
    markUserInteractionBeforeDraftLoad();

    try {
      const { image, source, dimensions, thumbnail } = await loadLocalImage(
        file,
        (progress) => onProgress?.(Math.min(95, Math.round(progress * 0.95))),
      );
      if (requestId !== uploadRequestRef.current) return null;
      const alreadyTransparent = await hasTransparentPixels(source);
      if (requestId !== uploadRequestRef.current) return null;
      backgroundRemovedRef.current = alreadyTransparent;
      backgroundColorRef.current = "#ffffff";
      setBackgroundRemoved(alreadyTransparent);
      setBackgroundColor("#ffffff");
      setIsRemovingBackground(false);
      setBackgroundProgress("");
      const { width, height } = dimensions;
      const canvas = canvasRef.current;
      if (!canvas) return null;

      imageSourceRef.current = source;
      suppressHistoryRef.current = true;
      const hasLayout = canvas
        .getObjects()
        .some((object) => String(object.get("name") ?? "").startsWith("layout-"));
      if (hasLayout) {
        if (imageObjectRef.current) canvas.remove(imageObjectRef.current);
        canvas
          .getObjects()
          .filter((object) => object.get("name") === "editor-frame-overlay")
          .forEach((object) => canvas.remove(object));
      } else {
        canvas.clear();
        resetTables();
        resetDrawing();
      }
      imageObjectRef.current = image;
      if (!hasLayout) {
        canvas.setDimensions({ width, height });
        canvas.backgroundColor = "rgba(0,0,0,0)";
      }
      const scale = hasLayout
        ? Math.min(canvas.getWidth() / width, canvas.getHeight() / height, 1)
        : 1;
      image.set({
        left: hasLayout ? (canvas.getWidth() - width * scale) / 2 : 0,
        top: hasLayout ? (canvas.getHeight() - height * scale) / 2 : 0,
        scaleX: scale,
        scaleY: scale,
        originX: "left",
        originY: "top",
        selectable: true,
        evented: true,
        lockMovementX: false,
        lockMovementY: false,
        lockScalingX: false,
        lockScalingY: false,
        lockRotation: true,
      });
      image.set(
        "name",
        file.name.replace(/\.[^.]+$/, "").slice(0, 24) || "Image",
      );
      canvas.add(image);
      if (hasLayout) canvas.setActiveObject(image);
      else canvas.discardActiveObject();
      canvas.requestRenderAll();
      selectedFilterRef.current = "original";
      filterIntensityRef.current = 100;
      setSelectedFilter("original");
      setFilterIntensity(100);
      if (!hasLayout) setDimensions({ width, height });
      setHasDocument(true);
      setImageThumbnail(thumbnail);
      setBrightness(0);
      setContrast(0);
      setSaturation(0);
      setZoom(1);
      resizeDisplay();
      suppressHistoryRef.current = false;
      initializeHistory(canvas);
      syncObjects();
      onProgress?.(100);
    } catch (error) {
      if (requestId === uploadRequestRef.current) {
        const message =
          error instanceof Error
            ? error.message
            : "The image could not be opened. Try another file.";
        setNotice(message);
        return message;
      }
    } finally {
      if (requestId === uploadRequestRef.current) {
        suppressHistoryRef.current = false;
        setDraggingFile(false);
      }
    }
    return null;
  };
}
