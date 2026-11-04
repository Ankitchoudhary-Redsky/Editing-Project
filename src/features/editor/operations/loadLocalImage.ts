import { FabricImage } from "fabric";
import type { Dimensions } from "../model/types";

export type LoadedLocalImage = {
  image: FabricImage;
  source: string;
  dimensions: Dimensions;
  thumbnail: string;
};

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
