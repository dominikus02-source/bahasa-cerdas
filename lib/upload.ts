import { createStorageClient } from "@/lib/supabase/storage";
import { getStorageAdminConfig } from "@/lib/supabase/storage-config";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_FILE_TYPES = {
  PDF: ["application/pdf"],
  EPUB: ["application/epub+zip"],
  DOCX: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"],
  PPTX: ["application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-powerpoint"],
  XLSX: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"],
  MP4: ["video/mp4"],
  ZIP: ["application/zip", "application/x-zip-compressed"],
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
};
const MAX_FILE_SIZES = {
  PDF: 20 * 1024 * 1024, EPUB: 20 * 1024 * 1024, DOCX: 20 * 1024 * 1024,
  PPTX: 50 * 1024 * 1024, XLSX: 10 * 1024 * 1024, MP4: 500 * 1024 * 1024,
  ZIP: 100 * 1024 * 1024, IMAGE: 5 * 1024 * 1024,
};
const BUCKET_MAP = {
  PDF: "documents", EPUB: "documents", DOCX: "documents", PPTX: "documents",
  XLSX: "documents", MP4: "videos", ZIP: "documents", IMAGE: "documents",
};
function getFileTypeFromMime(mimeType: string): string | null {
  for (const [type, mimes] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (mimes.includes(mimeType)) return type;
  }
  return null;
}
export async function uploadFile(
  file: File, folder: "materi" | "rpp" | "banksoal" | "karya" | "video-thumbnails",
  userId: string, supabaseClient?: SupabaseClient
): Promise<{ url: string; key: string } | { error: string }> {
  const supabase = supabaseClient || createStorageClient();
  const detectedType = getFileTypeFromMime(file.type);
  if (!detectedType) return { error: "Tipe file tidak diizinkan. Gunakan PDF, DOCX, PPTX, XLSX, atau MP4." };
  if (file.size > MAX_FILE_SIZES[detectedType as keyof typeof MAX_FILE_SIZES]) {
    const maxMB = MAX_FILE_SIZES[detectedType as keyof typeof MAX_FILE_SIZES] / (1024 * 1024);
    return { error: `Ukuran file maksimal ${maxMB}MB` };
  }
  const ext = file.name.split(".").pop()?.toLowerCase() || detectedType.toLowerCase();
  const fileName = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const bucket = BUCKET_MAP[detectedType as keyof typeof BUCKET_MAP] || "documents";
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, file, {
    cacheControl: "31536000", upsert: false,
  });
  if (error) return { error: `Upload gagal: ${error.message}` };
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return { url: urlData.publicUrl, key: data.path };
}

export async function configureBucket(
  supabaseUrl: string, serviceKey: string, bucketName: string,
  maxSizeBytes: number = 50 * 1024 * 1024
) {
  try {
    const bucketUrl = `${supabaseUrl}/storage/v1/bucket/${bucketName}`;
    const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
    const current = await fetch(bucketUrl, { headers });
    if (current.ok) {
      const existing = await current.json();
      if (!existing.file_size_limit || existing.file_size_limit < maxSizeBytes) {
        const updated = await fetch(bucketUrl, {
          method: "PUT", headers,
          body: JSON.stringify({ public: true, file_size_limit: maxSizeBytes }),
        });
        if (!updated.ok) throw new Error(`Bucket update failed: ${updated.status}`);
      }
    } else if (current.status === 404) {
      const created = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: "POST", headers,
        body: JSON.stringify({ id: bucketName, name: bucketName, public: true, file_size_limit: maxSizeBytes }),
      });
      if (!created.ok && created.status !== 409) throw new Error(`Bucket create failed: ${created.status}`);
    } else {
      throw new Error(`Bucket lookup failed: ${current.status}`);
    }
  } catch (error) {
    console.error("Bucket configuration failed:", error);
    throw error;
  }
}

export async function uploadFileServer(
  file: File | Buffer, fileName: string, bucket: string = "documents", contentType?: string
): Promise<{ url: string; key: string } | { error: string }> {
  const storageAdmin = getStorageAdminConfig();
  if (!storageAdmin) return { error: "Server configuration error: Missing isolated Storage credentials" };
  const { url, serviceKey } = storageAdmin;
  try { await configureBucket(url, serviceKey, bucket); }
  catch (error) { return { error: error instanceof Error ? error.message : "Storage bucket configuration failed" }; }
  const uploadUrl = `${url}/storage/v1/object/${bucket}/${fileName.split("/").map(encodeURIComponent).join("/")}`;
  const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : Buffer.from(file);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": contentType || "application/octet-stream" },
    body: fileBuffer,
  });
  if (!response.ok) return { error: `Upload failed: ${response.status} ${(await response.text()).slice(0, 300)}` };
  return { url: `${url}/storage/v1/object/public/${bucket}/${fileName.split("/").map(encodeURIComponent).join("/")}`, key: fileName };
}

export async function deleteFile(fileKey: string, supabaseClient?: SupabaseClient): Promise<boolean> {
  const supabase = supabaseClient || createStorageClient();
  const bucket = fileKey.includes("/videos/") || fileKey.includes("/video-thumbnails/") ? "videos" : "documents";
  const { error } = await supabase.storage.from(bucket).remove([fileKey]);
  return !error;
}
export function getPublicUrl(fileKey: string, bucket: "documents" | "videos" | "images" = "documents"): string {
  const supabase = createStorageClient();
  return supabase.storage.from(bucket).getPublicUrl(fileKey).data.publicUrl;
}
export function extractYoutubeId(url: string): string | null {
  const patterns = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/, /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/];
  for (const pattern of patterns) { const match = url.match(pattern); if (match) return match[1]; }
  return null;
}
export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}
export function getEmbedUrl(videoUrl: string, source: "YOUTUBE" | "VIMEO"): string {
  if (source === "YOUTUBE") { const id = extractYoutubeId(videoUrl); return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : videoUrl; }
  const id = extractVimeoId(videoUrl);
  return id ? `https://player.vimeo.com/video/${id}` : videoUrl;
}
export const FILE_TYPE_LABELS: Record<string, string> = {
  PDF: "PDF", EPUB: "EPUB", DOCX: "Word Document", DOC: "Word Document (lama)",
  PPTX: "PowerPoint", PPT: "PowerPoint (lama)", XLSX: "Excel", MP4: "Video MP4", ZIP: "ZIP Archive",
};
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
