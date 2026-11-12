import { useEffect, useRef, useState } from "react";
import {
  FabricImage,
  Rect,
  Shadow,
  type Canvas,
  type FabricObject,
} from "fabric";
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
  canvas,
  canvasRef,
  imageObjectRef,
  dimensions,
  setDimensions,
  recordHistory,
  syncObjects,
  setNotice,
}: {
  canvas: Canvas | null;
  canvasRef: MutableRefObject<Canvas | null>;
  imageObjectRef: MutableRefObject<FabricImage | null>;
  dimensions: { width: number; height: number };
  setDimensions: (dimensions: { width: number; height: number }) => void;
  recordHistory: (immediate?: boolean) => void;
  syncObjects: () => void;
  setNotice: (notice: string) => void;
}) {
  const [cells, setCells] = useState<LayoutCell[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const cellBoundsRef = useRef<GridCellBounds[]>([]);

  useEffect(() => {
    if (!canvas) return;
    const syncLayoutCells = (event?: { target?: FabricObject }) => {
      const changedName = String(event?.target?.get("name") ?? "");
      if (changedName && !changedName.startsWith("layout-")) return;

      const layoutCells = new Map<
        string,
        { bounds: GridCellBounds; image?: FabricImage }
      >();
      canvas.getObjects().forEach((object) => {
        const name = String(object.get("name") ?? "");
        const id = name.startsWith("layout-image-")
          ? name.slice("layout-image-".length)
          : name.startsWith("layout-")
            ? name.slice("layout-".length)
            : "";
        if (!id) return;
        const previous = layoutCells.get(id);
        layoutCells.set(id, {
          bounds: {
            id,
            index: Number(id.match(/\d+$/)?.[0] ?? 0),
            left: object.left ?? 0,
            top: object.top ?? 0,
            width: (object.width ?? 0) * (object.scaleX ?? 1),
            height: (object.height ?? 0) * (object.scaleY ?? 1),
          },
          image:
            object instanceof FabricImage ? object : previous?.image,
        });
      });

      const next = [...layoutCells.values()].sort(
        (first, second) => first.bounds.index - second.bounds.index,
      );
      cellBoundsRef.current = next.map(({ bounds }) => bounds);
      setCells(
        next.map(({ bounds, image }) => ({
          id: bounds.id,
          index: bounds.index,
          hasImage: Boolean(image),
          thumbnail: image?.getSrc() ?? "",
        })),
      );
      setSelectedCellId((current) =>
        current && layoutCells.has(current)
          ? current
          : next[0]?.bounds.id ?? null,
      );
    };

    syncLayoutCells();
    canvas.on("object:added", syncLayoutCells);
    canvas.on("object:removed", syncLayoutCells);
    return () => {
      canvas.off("object:added", syncLayoutCells);
      canvas.off("object:removed", syncLayoutCells);
    };
  }, [canvas]);

  useEffect(() => {
    if (!canvas) return;
    const syncFrame = (event: { target?: FabricObject }) => {
      const image = imageObjectRef.current;
      const frame = canvas
        .getObjects()
        .find((object) => object.get("name") === "editor-frame-overlay");
      if (!image || !frame) return;
      const source = event.target === frame ? frame : event.target === image ? image : null;
      const destination = source === frame ? image : source === image ? frame : null;
      if (!source || !destination) return;
      const center = source.getCenterPoint();
      destination.set({
        width: source.width,
        height: source.height,
        scaleX: source.scaleX,
        scaleY: source.scaleY,
        angle: source.angle,
        flipX: source.flipX,
        flipY: source.flipY,
        originX: "center",
        originY: "center",
      });
      destination.setPositionByOrigin(center, "center", "center");
      destination.setCoords();
    };
    canvas.on("object:moving", syncFrame);
    canvas.on("object:scaling", syncFrame);
    canvas.on("object:rotating", syncFrame);
    canvas.on("object:modified", syncFrame);
    return () => {
      canvas.off("object:moving", syncFrame);
      canvas.off("object:scaling", syncFrame);
      canvas.off("object:rotating", syncFrame);
      canvas.off("object:modified", syncFrame);
    };
  }, [canvas, imageObjectRef]);

  const applyFrame = (style: FrameStyle, color: string) => {
    const canvas = canvasRef.current;
    const image = imageObjectRef.current;
    if (!canvas || !image) return;

    canvas
      .getObjects()
      .filter((object) => object.get("name") === "editor-frame-overlay")
      .forEach((object) => canvas.remove(object));
    image.set("padding", 0);
    if (style === "none") {
      image.setCoords();
      canvas.requestRenderAll();
      recordHistory(true);
      return;
    }
    const width = Math.max(
      4,
      Math.min(image.getScaledWidth(), image.getScaledHeight()) *
        (style === "bold" ? 0.045 : style === "matte" ? 0.075 : 0.018),
    );
    const center = image.getCenterPoint();
    const border = new Rect({
      left: center.x,
      top: center.y,
      width: image.width,
      height: image.height,
      scaleX: image.scaleX,
      scaleY: image.scaleY,
      angle: image.angle,
      flipX: image.flipX,
      flipY: image.flipY,
      originX: "center",
      originY: "center",
      fill: "transparent",
      stroke: color,
      strokeWidth: width,
      strokeUniform: true,
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
    image.set("padding", width / 2);
    image.setCoords();
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

    canvas
      .getObjects()
      .filter((object) => {
        const name = String(object.get("name") ?? "");
        return name.startsWith("layout-") && !name.startsWith("layout-image-");
      })
      .forEach((object) => canvas.remove(object));
    canvas.setDimensions({ width, height });
    canvas.backgroundColor = background;
    bounds.forEach((cell) => {
      const placeholder = new Rect({
        left: cell.left,
        top: cell.top,
        width: cell.width,
        height: cell.height,
        fill: "transparent",
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
        selectable: true,
        evented: true,
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
      canvas.setActiveObject(image);
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
      fill: "transparent",
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
