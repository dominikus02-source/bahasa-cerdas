// Salin runtime WASM @mediapipe/tasks-vision ke public/ agar efek latar JUMPA
// dimuat dari origin sendiri (CSP script-src 'self'), bukan dari CDN pihak ketiga.
// Dipanggil oleh `npm run build`. Versi harus sama dengan MEDIAPIPE_VERSION di
// components/jumpa/media-assets.ts — build gagal bila berbeda.
import { copyFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const EXPECTED = "0.10.14";
const pkgDir = join(process.cwd(), "node_modules/@mediapipe/tasks-vision");
const { version } = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
if (version !== EXPECTED) {
  console.error(`@mediapipe/tasks-vision ${version} != ${EXPECTED}: perbarui components/jumpa/media-assets.ts, scripts/copy-mediapipe-wasm.mjs, dan public/jumpa/mediapipe/.`);
  process.exit(1);
}
const out = join(process.cwd(), "public/jumpa/mediapipe", version, "wasm");
mkdirSync(out, { recursive: true });
for (const f of readdirSync(join(pkgDir, "wasm"))) copyFileSync(join(pkgDir, "wasm", f), join(out, f));
console.log(`mediapipe wasm ${version} → public/jumpa/mediapipe/${version}/wasm`);
