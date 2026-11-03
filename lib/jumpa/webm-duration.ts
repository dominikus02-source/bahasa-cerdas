/** Repair duration only for streaming WebM emitted by MediaRecorder.
 * Uses the browser decoder's media timeline, never elapsed wall-clock time.
 * Unsupported containers remain intact and recoverable; callers surface errors.
 */
interface ElementHeader { id: number; size: number; sizeAt: number; sizeWidth: number; dataAt: number; end: number }
function header(bytes: Uint8Array, at: number): ElementHeader {
  const width = (byte: number, max: number) => {
    for (let n = 1; n <= max; n++) if (byte & (1 << (8 - n))) return n;
    throw new Error("RECORDING_WEBM_INVALID_VINT");
  };
  const idWidth = width(bytes[at], 4);
  let id = 0;
  for (let n = 0; n < idWidth; n++) id = id * 256 + bytes[at + n];
  const sizeAt = at + idWidth;
  const sizeWidth = width(bytes[sizeAt], 8);
  let size = bytes[sizeAt] & ((1 << (8 - sizeWidth)) - 1);
  let unknown = size === (1 << (8 - sizeWidth)) - 1;
  for (let n = 1; n < sizeWidth; n++) { size = size * 256 + bytes[sizeAt + n]; unknown &&= bytes[sizeAt + n] === 255; }
  const dataAt = sizeAt + sizeWidth;
  if (dataAt > bytes.length || (!unknown && !Number.isSafeInteger(size))) throw new Error("RECORDING_WEBM_HEADER_RANGE");
  return { id, size: unknown ? -1 : size, sizeAt, sizeWidth, dataAt, end: unknown ? bytes.length : dataAt + size };
}
function encodeSize(value: number, width: number): Uint8Array<ArrayBuffer> {
  if (value >= 2 ** (7 * width) - 1) throw new Error("RECORDING_WEBM_INFO_TOO_LARGE");
  const bytes = new Uint8Array(width);
  for (let n = width - 1; n >= 0; n--) { bytes[n] = value % 256; value = Math.floor(value / 256); }
  bytes[0] |= 1 << (8 - width);
  return bytes;
}
async function mediaDuration(blob: Blob): Promise<number> {
  const video = document.createElement("video");
  video.muted = true;
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise<number>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("RECORDING_DURATION_TIMEOUT")), 5000);
      const read = () => {
        if (Number.isFinite(video.duration) && video.duration > 0) { clearTimeout(timer); resolve(video.duration); }
      };
      video.ondurationchange = read;
      video.onloadedmetadata = () => { read(); if (!Number.isFinite(video.duration)) video.currentTime = 1e10; };
      video.ontimeupdate = read;
      video.onerror = () => { clearTimeout(timer); reject(new Error("RECORDING_MEDIA_DECODE_FAILED")); };
      video.preload = "auto";
      video.src = url;
    });
  } finally { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); }
}
export async function repairWebmDuration(blob: Blob): Promise<Blob> {
  if (!blob.type.includes("webm")) return blob;
  const bytes = new Uint8Array(await blob.slice(0, 1024 * 1024).arrayBuffer());
  const ebml = header(bytes, 0);
  if (ebml.id !== 0x1a45dfa3) throw new Error("RECORDING_WEBM_HEADER_MISSING");
  const segment = header(bytes, ebml.end);
  if (segment.id !== 0x18538067) throw new Error("RECORDING_WEBM_SEGMENT_MISSING");
  let info: ElementHeader | undefined;
  for (let at = segment.dataAt; at < bytes.length;) {
    const item = header(bytes, at);
    if (item.id === 0x1549a966) { info = item; break; }
    // Offset-bearing seek tables cannot safely survive an insertion.
    if (item.id === 0x114d9b74) throw new Error("RECORDING_WEBM_SEEK_TABLE_UNSUPPORTED");
    if (item.end <= at || item.size < 0) break;
    at = item.end;
  }
  if (!info || info.size < 0 || info.end > bytes.length) throw new Error("RECORDING_WEBM_INFO_MISSING");
  let scale = 1_000_000;
  for (let at = info.dataAt; at < info.end;) {
    const item = header(bytes, at);
    if (item.id === 0x4489) return blob;
    if (item.id === 0x2ad7b1) { scale = 0; for (let n = item.dataAt; n < item.end; n++) scale = scale * 256 + bytes[n]; }
    if (item.end <= at || item.size < 0) throw new Error("RECORDING_WEBM_INFO_INVALID");
    at = item.end;
  }
  if (segment.size !== -1) throw new Error("RECORDING_WEBM_FINITE_SEGMENT_UNSUPPORTED");
  const seconds = await mediaDuration(blob);
  const duration = new Uint8Array(11);
  duration.set([0x44, 0x89, 0x88]);
  new DataView(duration.buffer).setFloat64(3, seconds * 1e9 / scale, false);
  return new Blob([
    blob.slice(0, info.sizeAt), encodeSize(info.size + duration.length, info.sizeWidth),
    blob.slice(info.dataAt, info.end), duration, blob.slice(info.end),
  ], { type: blob.type });
}
