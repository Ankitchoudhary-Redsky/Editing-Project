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
      canvas.clear();
      imageObjectRef.current = image;
      resetTables();
      resetDrawing();
      canvas.setDimensions({ width, height });
      canvas.backgroundColor = "rgba(0,0,0,0)";
      image.set({
        left: 0,
        top: 0,
        originX: "left",
        originY: "top",
      });
      image.set(
        "name",
        file.name.replace(/\.[^.]+$/, "").slice(0, 24) || "Image",
      );
      canvas.add(image);
      canvas.sendObjectToBack(image);
      canvas.discardActiveObject();
      canvas.requestRenderAll();
      selectedFilterRef.current = "original";
      filterIntensityRef.current = 100;
      setSelectedFilter("original");
      setFilterIntensity(100);
      setDimensions({ width, height });
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
