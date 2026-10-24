import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
export function renderPreview(source) {
  const values = { Email: "contoh@sekolah.sch.id", SiteURL: "https://bahasacerdas.com", ConfirmationURL: "https://bahasacerdas.com/reset-password#contoh-pratinjau" };
  const rendered = source.replace(/{{\s*\.(\w+)\s*}}/g, (_, name) => {
    if (!(name in values)) throw new Error(`Variabel tidak dikenal: ${name}`);
    return values[name];
  });
  if (rendered.includes("{{")) throw new Error("Variabel belum dirender");
  return rendered;
}
const dir = mkdtempSync(join(tmpdir(), "bc-email-"));
for (const ext of ["html", "txt"]) {
  const target = join(dir, `recovery.${ext}`);
  writeFileSync(target, renderPreview(readFileSync(`supabase/templates/recovery.${ext}`, "utf8")));
  console.log(target);
}
