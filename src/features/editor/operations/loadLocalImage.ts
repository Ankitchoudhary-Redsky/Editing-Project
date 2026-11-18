import { Canvas, FabricImage } from "fabric";
import { BASE_IMAGE_PROPERTY } from "../model/constants";
import type { LoadedLocalImage } from "../model/types";

function readFileAsDataUrl(
  file: File,
  onProgress?: (progress: number) => void,
) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress?.(Math.round((event.loaded / event.total) * 72));
    };
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Image data is invalid"));
    reader.onerror = () => reject(new Error("Image could not be read"));
    reader.readAsDataURL(file);
  });
}

export async function loadLocalImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<LoadedLocalImage> {
  onProgress?.(0);
  const source = await readFileAsDataUrl(file, onProgress);
  onProgress?.(76);
  const image = await FabricImage.fromURL(source);
  onProgress?.(92);
  const width = image.width ?? 0;
  const height = image.height ?? 0;
  if (!width || !height || width > 12000 || height > 12000) {
    throw new Error("This image has invalid or unsupported dimensions.");
  }

  const thumbnailCanvas = document.createElement("canvas");
  thumbnailCanvas.width = 96;
  thumbnailCanvas.height = 96;
  const context = thumbnailCanvas.getContext("2d");
  const scale = Math.min(96 / width, 96 / height);
  if (context)
    context.drawImage(
      image.getElement(),
      (96 - width * scale) / 2,
      (96 - height * scale) / 2,
      width * scale,
      height * scale,
    );
  onProgress?.(100);

  return {
    image,
    source,
    dimensions: { width, height },
    thumbnail: thumbnailCanvas.toDataURL("image/jpeg", 0.8),
  };
}

export function fitImageInsideCanvas(
  image: FabricImage,
  canvasWidth: number,
  canvasHeight: number,
) {
  const imageWidth = image.width ?? 0;
  const imageHeight = image.height ?? 0;
  if (!imageWidth || !imageHeight) return;

  const scale = Math.min(canvasWidth / imageWidth, canvasHeight / imageHeight);
  image.set({
    left: (canvasWidth - imageWidth * scale) / 2,
    top: (canvasHeight - imageHeight * scale) / 2,
    scaleX: scale,
    scaleY: scale,
    originX: 'left',
    originY: 'top',
  });
  image.setCoords();
}

export function fitBaseImageInsideCanvas(
  canvas: Canvas,
  canvasWidth: number,
  canvasHeight: number,
) {
  const images = canvas.getObjects().filter(
    (object): object is FabricImage => object instanceof FabricImage,
  );
  const image = images.find(
    (object): object is FabricImage =>
      object instanceof FabricImage && object.get(BASE_IMAGE_PROPERTY) === true,
  ) ?? (images.length === 1 ? images[0] : undefined);
  if (image) fitImageInsideCanvas(image, canvasWidth, canvasHeight);
}
