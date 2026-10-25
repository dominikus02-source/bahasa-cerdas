/**
 * Aset efek latar (MediaPipe) di-host sendiri di public/jumpa/mediapipe/<versi>/.
 * wasm/ disalin saat build (scripts/copy-mediapipe-wasm.mjs); model tflite di-commit.
 * Default @livekit/track-processors memuat dari cdn.jsdelivr.net + storage.googleapis.com
 * yang diblok CSP.
 */
export const MEDIAPIPE_VERSION = "0.10.14";
const base = `/jumpa/mediapipe/${MEDIAPIPE_VERSION}`;
export const BACKGROUND_ASSET_PATHS = {
  tasksVisionFileSet: `${base}/wasm`,
  modelAssetPath: `${base}/selfie_segmenter.tflite`,
};
