import { createClient } from "@/lib/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";

const ALLOWED_FILE_TYPES = {
  PDF: ["application/pdf"],
  EPUB: ["application/epub+zip"],
  DOCX: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ],
  PPTX: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
  ],
  XLSX: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
  ],
  MP4: ["video/mp4"],
  ZIP: ["application/zip", "application/x-zip-compressed"],
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
};

const MAX_FILE_SIZES = {
  PDF: 20 * 1024 * 1024,
  EPUB: 20 * 1024 * 1024,
  DOCX: 15 * 1024 * 1024,
  PPTX: 50 * 1024 * 1024,
  XLSX: 10 * 1024 * 1024,
  MP4: 500 * 1024 * 1024,
  ZIP: 100 * 1024 * 1024,
  IMAGE: 5 * 1024 * 1024,
};

const BUCKET_MAP = {
  PDF: "documents",
  EPUB: "documents",
  DOCX: "documents",
  PPTX: "documents",
  XLSX: "documents",
  MP4: "videos",
  ZIP: "documents",
  IMAGE: "documents",
};

function getFileTypeFromMime(mimeType: string): string | null {
  for (const [type, mimes] of Object.entries(ALLOWED_FILE_TYPES)) {
    if (mimes.includes(mimeType)) return type;
  }
  return null;
}

export async function uploadFile(
  file: File,
  folder: "materi" | "rpp" | "banksoal" | "karya" | "video-thumbnails",
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<{ url: string; key: string } | { error: string }> {
  const supabase = supabaseClient || createClient();

  const detectedType = getFileTypeFromMime(file.type);
  if (!detectedType) {
    return { error: "Tipe file tidak diizinkan. Gunakan PDF, DOCX, PPTX, XLSX, atau MP4." };
  }

  if (file.size > MAX_FILE_SIZES[detectedType as keyof typeof MAX_FILE_SIZES]) {
    const maxMB = MAX_FILE_SIZES[detectedType as keyof typeof MAX_FILE_SIZES] / (1024 * 1024);
    return { error: `Ukuran file maksimal ${maxMB}MB` };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() || detectedType.toLowerCase();
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  const fileName = `${userId}/${folder}/${timestamp}-${randomStr}.${ext}`;

  const bucket = BUCKET_MAP[detectedType as keyof typeof BUCKET_MAP] || "documents";

  // Configure bucket for large files (server-side only)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    await configureBucket(supabaseUrl, serviceKey, bucket).catch(() => {});
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(fileName, file, {
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    return { error: `Upload gagal: ${error.message}` };
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return { url: urlData.publicUrl, key: data.path };
}

// Update bucket configuration to allow large files
export async function configureBucket(
  supabaseUrl: string,
  serviceKey: string,
  bucketName: string,
  maxSizeBytes: number = 50 * 1024 * 1024
) {
  try {
    const bucketCheckRes = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketName}`, {
      headers: { Authorization: `Bearer ${serviceKey}` },
    });

    if (bucketCheckRes.ok) {
      const existingBucket = await bucketCheckRes.json();
      const currentLimit = existingBucket.file_size_limit;
      // Only update if limit is unset or smaller than what we need
      if (!currentLimit || currentLimit < maxSizeBytes) {
        await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketName}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            public: true,
            file_size_limit: maxSizeBytes,
          }),
        }).catch(() => {});
      }
    } else {
      // Bucket doesn't exist, create it with file_size_limit
      await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: bucketName,
          name: bucketName,
          public: true,
          file_size_limit: maxSizeBytes,
        }),
      }).catch(() => {});
    }
  } catch (e) {
    console.log("Bucket configure skipped:", e);
  }
}

// Server-side upload function for API routes
export async function uploadFileServer(
  file: File | Buffer,
  fileName: string,
  bucket: string = "documents",
  contentType?: string
): Promise<{ url: string; key: string } | { error: string }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { error: "Server configuration error: Missing Supabase credentials" };
  }

  // Auto-create/configure bucket
  await configureBucket(supabaseUrl, serviceKey, bucket);

  // Upload file
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${fileName}`;
  const fileBuffer = file instanceof File ? Buffer.from(await file.arrayBuffer()) : Buffer.from(file);
  
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": contentType || "application/octet-stream",
    },
    body: fileBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    return { error: `Upload failed: ${uploadRes.status} ${errText}` };
  }

  const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${fileName}`;
  return { url: publicUrl, key: fileName };
}

export async function deleteFile(fileKey: string, supabaseClient?: SupabaseClient): Promise<boolean> {
  const supabase = supabaseClient || createClient();

  const bucket = fileKey.includes("/videos/") || fileKey.includes("/video-thumbnails/") ? "videos" : "documents";

  const { error } = await supabase.storage.from(bucket).remove([fileKey]);
  return !error;
}

export function getPublicUrl(fileKey: string, bucket: "documents" | "videos" | "images" = "documents"): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(fileKey);
  return data.publicUrl;
}

export function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

export function getEmbedUrl(videoUrl: string, source: "YOUTUBE" | "VIMEO"): string {
  if (source === "YOUTUBE") {
    const id = extractYoutubeId(videoUrl);
    return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : videoUrl;
  }
  const id = extractVimeoId(videoUrl);
  return id ? `https://player.vimeo.com/video/${id}` : videoUrl;
}

export const FILE_TYPE_LABELS: Record<string, string> = {
  PDF: "PDF",
  EPUB: "EPUB",
  DOCX: "Word Document",
  PPTX: "PowerPoint",
  XLSX: "Excel",
  MP4: "Video MP4",
  ZIP: "ZIP Archive",
};

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}