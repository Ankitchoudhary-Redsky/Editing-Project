import { useRef, useState } from "react";
import { FabricImage, Rect, Shadow, type Canvas } from "fabric";
import type { MutableRefObject } from "react";
import type { GridCellBounds, GridLayoutId } from "../operations/gridLayout";
import {
  cropImageToCell,
  getGridCells,
  loadImageElement,
} from "../operations/gridLayout";

type FrameStyle = "none" | "clean" | "matte" | "soft-shadow" | "bold";
type LayoutCell = {
  id: string;
  index: number;
  hasImage: boolean;
  thumbnail: string;
};

export function useFramesLayout({
  canvasRef,
  dimensions,
  setDimensions,
  recordHistory,
  syncObjects,
  setNotice,
}: {
  canvasRef: MutableRefObject<Canvas | null>;
  dimensions: { width: number; height: number };
  setDimensions: (dimensions: { width: number; height: number }) => void;
  recordHistory: (immediate?: boolean) => void;
  syncObjects: () => void;
  setNotice: (notice: string) => void;
}) {
  const [cells, setCells] = useState<LayoutCell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const cellBoundsRef = useRef<GridCellBounds[]>([]);

  const applyFrame = (style: FrameStyle, color: string) => {
    const canvas = canvasRef.current;
    const image = canvas
      ?.getObjects()
      .find((object) => object instanceof FabricImage);
    if (!canvas || !(image instanceof FabricImage)) return;

    canvas
      .getObjects()
      .filter((object) => object.get("name") === "editor-frame-overlay")
      .forEach((object) => canvas.remove(object));
    if (style === "none") {
      canvas.requestRenderAll();
      recordHistory(true);
      return;
    }
    const width = Math.max(
      4,
      Math.min(image.getScaledWidth(), image.getScaledHeight()) *
        (style === "bold" ? 0.045 : style === "matte" ? 0.075 : 0.018),
    );
    const border = new Rect({
      left: image.left,
      top: image.top,
      width: image.width,
      height: image.height,
      scaleX: image.scaleX,
      scaleY: image.scaleY,
      originX: image.originX,
      originY: image.originY,
      fill: "transparent",
      stroke: color,
      strokeWidth: width,
      shadow:
        style === "soft-shadow"
          ? new Shadow({
              color: "rgba(0,0,0,0.28)",
              blur: 18,
              offsetX: 0,
              offsetY: 7,
            })
          : undefined,
      selectable: false,
      evented: false,
    });
    border.set("name", "editor-frame-overlay");
    canvas.add(border);
    canvas.requestRenderAll();
    recordHistory(true);
  };

  const applyLayout = (
    layout: GridLayoutId,
    gap: number,
    background: string,
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = dimensions.width || 1200;
    const height = dimensions.height || 900;
    const bounds = getGridCells(layout, width, height, gap);
    const nextCells = bounds.map(({ id, index }) => ({
      id,
      index,
      hasImage: false,
      thumbnail: "",
    }));

    canvas.clear();
    canvas.setDimensions({ width, height });
    canvas.backgroundColor = background;
    bounds.forEach((cell) => {
      const placeholder = new Rect({
        left: cell.left,
        top: cell.top,
        width: cell.width,
        height: cell.height,
        fill: "#ffffff",
        stroke: "rgba(25, 38, 31, 0.16)",
        strokeWidth: 1,
        selectable: false,
        evented: false,
      });
      placeholder.set("name", `layout-${cell.id}`);
      canvas.add(placeholder);
    });
    cellBoundsRef.current = bounds;
    setDimensions({ width, height });
    setCells(nextCells);
    setSelectedCellId(nextCells[0]?.id ?? null);
    canvas.requestRenderAll();
    syncObjects();
    recordHistory(true);
  };

  const createCanvasFrame = (style: FrameStyle, color: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const width = dimensions.width || 1200;
    const height = dimensions.height || 900;
    const bounds = [{ id: "cell-1", index: 1, left: 0, top: 0, width, height }];
    const styleOptions: Record<
      FrameStyle,
      { stroke: string; strokeWidth: number; shadow?: Shadow }
    > = {
      none: { stroke: "transparent", strokeWidth: 0 },
      clean: { stroke: color, strokeWidth: 4 },
      matte: { stroke: color, strokeWidth: 24 },
      "soft-shadow": {
        stroke: color,
        strokeWidth: 4,
        shadow: new Shadow({
          color: "rgba(0,0,0,0.28)",
          blur: 18,
          offsetX: 0,
          offsetY: 7,
        }),
      },
      bold: { stroke: color, strokeWidth: 30 },
    };
    const placeholder = new Rect({
      left: 0,
      top: 0,
      width,
      height,
      fill: "#ffffff",
      ...styleOptions[style],
      selectable: false,
      evented: false,
    });
    placeholder.set("name", "layout-cell-1");
    canvas.clear();
    canvas.setDimensions({ width, height });
    canvas.backgroundColor = color;
    canvas.add(placeholder);
    cellBoundsRef.current = bounds;
    setDimensions({ width, height });
    setCells([{ id: "cell-1", index: 1, hasImage: false, thumbnail: "" }]);
    setSelectedCellId("cell-1");
    canvas.requestRenderAll();
    syncObjects();
    recordHistory(true);
  };

  const addCellImage = async (
    cellId: string,
    file?: File,
    imageUrl?: string,
  ) => {
    const canvas = canvasRef.current;
    const cell = cellBoundsRef.current.find((item) => item.id === cellId);
    if (!canvas || !cell) return;

    try {
      let source = imageUrl ?? "";
      if (file) {
        source = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            typeof reader.result === "string"
              ? resolve(reader.result)
              : reject(new Error("Image data is invalid."));
          reader.onerror = () => reject(new Error("Image could not be read."));
          reader.readAsDataURL(file);
        });
      }
      if (!source) return;
      const remote = !source.startsWith("data:") && !source.startsWith("blob:");
      const element = await loadImageElement(source, remote);
      const cropped = cropImageToCell(
        element,
        element.naturalWidth,
        element.naturalHeight,
        cell.width,
        cell.height,
      );
      const image = await FabricImage.fromURL(cropped);
      image.set({
        left: cell.left,
        top: cell.top,
        originX: "left",
        originY: "top",
        selectable: false,
        evented: false,
      });
      image.set("name", `layout-image-${cellId}`);
      const previous = canvas
        .getObjects()
        .find((object) => object.get("name") === `layout-image-${cellId}`);
      if (previous) canvas.remove(previous);
      const placeholder = canvas
        .getObjects()
        .find((object) => object.get("name") === `layout-${cellId}`);
      if (placeholder) canvas.remove(placeholder);
      canvas.add(image);
      canvas.requestRenderAll();
      setCells((current) =>
        current.map((item) =>
          item.id === cellId
            ? { ...item, hasImage: true, thumbnail: cropped }
            : item,
        ),
      );
      setSelectedCellId(cellId);
      syncObjects();
      recordHistory(true);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "This image could not be added to the cell.",
      );
    }
  };

  const removeCellImage = (cellId: string) => {
    const canvas = canvasRef.current;
    const cell = cellBoundsRef.current.find((item) => item.id === cellId);
    if (!canvas || !cell) return;
    const image = canvas
      .getObjects()
      .find((object) => object.get("name") === `layout-image-${cellId}`);
    if (image) canvas.remove(image);
    const placeholder = new Rect({
      left: cell.left,
      top: cell.top,
      width: cell.width,
      height: cell.height,
      fill: "#ffffff",
      stroke: "rgba(25, 38, 31, 0.16)",
      strokeWidth: 1,
      selectable: false,
      evented: false,
    });
    placeholder.set("name", `layout-${cellId}`);
    canvas.add(placeholder);
    canvas.requestRenderAll();
    setCells((current) =>
      current.map((item) =>
        item.id === cellId ? { ...item, hasImage: false, thumbnail: "" } : item,
      ),
    );
    syncObjects();
    recordHistory(true);
  };

  return {
    applyFrame,
    createCanvasFrame,
    applyLayout,
    addCellImage,
    removeCellImage,
    selectCell: setSelectedCellId,
    cells,
    selectedCellId,
  };
}
