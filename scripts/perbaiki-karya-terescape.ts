/**
 * Pulihkan karya yang telanjur menyimpan entitas HTML (sekali jalan).
 *
 * Penyebabnya: rute simpan karya dulu memakai `sanitize()` yang meng-escape
 * HTML, padahal kontennya ditampilkan sebagai teks React biasa. Akibatnya murid
 * membaca `&quot;Sayapmu Nak!&quot;` alih-alih tanda kutip. Penyebabnya sudah
 * diperbaiki (`sanitizeTeks`); skrip ini membersihkan baris yang sudah rusak.
 *
 *   npm run perbaiki:karya            # dry-run
 *   npm run perbaiki:karya -- --execute
 */
import { PrismaClient } from "@prisma/client";
import { decodeEntitasHtml } from "../lib/validations";
import { loadScriptEnv, requireDatabaseUrl } from "./_env";

loadScriptEnv();
const db = new PrismaClient({ datasources: { db: { url: requireDatabaseUrl() } } });

const EXECUTE = process.argv.includes("--execute");
const POLA = ["&#x27;", "&quot;", "&#x2F;", "&amp;", "&lt;", "&gt;"];

async function main() {
  console.log(EXECUTE ? "MODE: TULIS\n" : "MODE: DRY-RUN (pakai --execute untuk menulis)\n");

  const kandidat = await db.studentKarya.findMany({
    where: { OR: POLA.map((p) => ({ content: { contains: p } })) },
    select: { id: true, title: true, content: true, excerpt: true },
  });

  console.log(`Karya terdampak: ${kandidat.length}\n`);

  let diperbaiki = 0;
  for (const k of kandidat) {
    const bersih = decodeEntitasHtml(k.content);
    if (bersih === k.content) continue;
    diperbaiki++;

    if (diperbaiki <= 5) {
      const sebelum = k.content.slice(0, 70).replace(/\n/g, " ");
      const sesudah = bersih.slice(0, 70).replace(/\n/g, " ");
      console.log(`  [${k.title.slice(0, 26)}]`);
      console.log(`    sebelum: ${sebelum}`);
      console.log(`    sesudah: ${sesudah}`);
    }

    if (!EXECUTE) continue;

    await db.studentKarya.update({
      where: { id: k.id },
      data: {
        content: bersih,
        // Excerpt diturunkan ulang supaya kartu di feed ikut bersih.
        excerpt: bersih.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200),
      },
    });
  }

  console.log(`\nDiperbaiki: ${diperbaiki}`);
  if (!EXECUTE) console.log("(dry-run — tidak ada yang ditulis)");
}

main()
  .catch((e) => {
    console.error("GAGAL:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
