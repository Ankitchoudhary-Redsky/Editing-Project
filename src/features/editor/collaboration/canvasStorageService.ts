import { getSupabaseClient } from "./supabaseClient";

export const CANVAS_STORAGE_BUCKET = "canvas-originals";

function safeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "image";
}

export async function uploadOriginalImage(documentId: string, file: File) {
  const storagePath = `${documentId}/original/${safeFileName(file.name)}`;
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from(CANVAS_STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: "3600",
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;
  return { storagePath: data.path, storageBucket: CANVAS_STORAGE_BUCKET };
}

export function getCanvasAssetUrl(
  storagePath: string,
  storageBucket = CANVAS_STORAGE_BUCKET,
) {
  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from(storageBucket)
    .getPublicUrl(storagePath);
  return data.publicUrl;
}

export async function uploadCanvasAsset(
  documentId: string,
  blob: Blob,
  assetRevision: string,
) {
  const extension = blob.type.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  const storagePath = `${documentId}/assets/${assetRevision}.${extension}`;
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(CANVAS_STORAGE_BUCKET)
    .upload(storagePath, blob, {
      cacheControl: "3600",
      contentType: blob.type || "application/octet-stream",
      upsert: false,
    });

  if (error) {
    const alreadyExists =
      ("statusCode" in error && String(error.statusCode) === "409") ||
      /already exists|duplicate/i.test(error.message);
    if (!alreadyExists) throw error;
    return getCanvasAssetUrl(storagePath);
  }
  return getCanvasAssetUrl(data.path);
}
