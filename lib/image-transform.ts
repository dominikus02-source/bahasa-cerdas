const SUPABASE_PROJECT = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const TRANSFORM_ENABLED = !!SUPABASE_PROJECT;

export function transformImageUrl(
  url: string | null | undefined,
  opts: { width?: number; height?: number; quality?: number; format?: "origin" | "webp" | "avif" } = {}
): string {
  if (!url) return "";
  if (!TRANSFORM_ENABLED) return url;

  const { width, height, quality = 80, format = "webp" } = opts;

  // Only transform Supabase Storage URLs
  if (!url.includes(`${SUPABASE_PROJECT}/storage/v1/object/public/`)) return url;

  // Replace /object/public/ with /render/image/public/ for transformation
  let transformed = url.replace(
    `/storage/v1/object/public/`,
    `/storage/v1/render/image/public/`
  );

  const params = new URLSearchParams();
  if (width) params.set("width", String(width));
  if (height) params.set("height", String(height));
  if (quality) params.set("quality", String(quality));
  if (format && format !== "origin") params.set("format", format);

  const qs = params.toString();
  if (qs) transformed += (transformed.includes("?") ? "&" : "?") + qs;

  return transformed;
}
