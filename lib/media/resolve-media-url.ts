import { getStorageUrl } from "@/lib/supabase/storage-config";
const supabaseUrl = getStorageUrl() || "";

export function resolveMediaUrl(src: string | null | undefined): string | null {
  if (!src) return null;

  const trimmed = src.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return trimmed;
  }

  if (supabaseUrl && trimmed.includes("/storage/v1/")) {
    return `${supabaseUrl}${trimmed.startsWith("/") ? "" : "/"}${trimmed}`;
  }

  return trimmed;
}
