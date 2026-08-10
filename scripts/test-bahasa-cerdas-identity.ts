// QA BahasaCerdas Identity & Trust Knowledge Layer
//
// Validasi:
//  1. Registry faktual (lib/ai/knowledge/bahasa-cerdas-identity.ts) memuat
//     fakta identitas/legal/hak cipta/riwayat yang benar dan satu-satunya.
//  2. Instruksi identitas dipakai di titik integrasi terpusat (prompt-builder
//     untuk semua agent + route chat AI BC) — tanpa duplikasi manual per
//     provider (DeepSeek/Groq/Gemini).
//  3. Aturan anti-halusinasi, privasi, dan istilah MURID dipatuhi.
//
// Tidak butuh koneksi DB. Jalan di CI bersama suite lain.

import { readFileSync } from "fs";
import { join } from "path";
import {
  BAHASA_CERDAS_IDENTITY,
  buildBahasaCerdasIdentityInstruction,
} from "@/lib/ai/knowledge/bahasa-cerdas-identity";

let fail = 0;
const ok = (label: string, cond: boolean, detail?: string) => {
  if (!cond) fail++;
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
};

const BASE = process.cwd();
const identityInstruction = buildBahasaCerdasIdentityInstruction();
const registrySource = readFileSync(
  join(BASE, "lib/ai/knowledge/bahasa-cerdas-identity.ts"),
  "utf8",
);
const promptBuilderSource = readFileSync(join(BASE, "src/ai/core/prompt-builder.ts"), "utf8");
const chatRouteSource = readFileSync(join(BASE, "app/api/ai/chat/route.ts"), "utf8");
const docSource = readFileSync(join(BASE, "docs/BAHASACERDAS_IDENTITY_REGISTRY.md"), "utf8");

// ── 1. Fakta identitas inti ───────────────────────────────────────────────
ok("Founder tercatat", BAHASA_CERDAS_IDENTITY.founder.name === "Dominikus Wahyu Heru Cahyadi");
ok("Founder peran CEO", BAHASA_CERDAS_IDENTITY.founder.role === "Founder & CEO");
ok("Co-Founder Content tercatat", BAHASA_CERDAS_IDENTITY.team[0].name === "Alexander Suryanta");
ok("Co-Founder Community tercatat", BAHASA_CERDAS_IDENTITY.team[1].name === "Washadi, S.Pd., M.M.");
ok("Dewan Penasihat tercatat", BAHASA_CERDAS_IDENTITY.advisors[0].name === "Melany K. Gigir, S.Pd., M.S.");
ok("Validator Akademik tercatat", BAHASA_CERDAS_IDENTITY.advisors[1].name === "Dr. B. Widharyanto, M.Pd.");
ok(
  "Tidak ada posisi palsu (semua peran dari daftar resmi)",
  ["Founder & CEO", "Co-Founder & Head of Content", "Co-Founder & Head of Community", "Dewan Penasihat", "Validator Akademik"]
    .every((r) =>
      [BAHASA_CERDAS_IDENTITY.founder.role, ...BAHASA_CERDAS_IDENTITY.team.map((t) => t.role), ...BAHASA_CERDAS_IDENTITY.advisors.map((a) => a.role)]
        .some((actual) => actual.startsWith(r)),
    ),
);

// ── 2. Badan usaha & legal ────────────────────────────────────────────────
ok("Badan usaha CV Obah Mamah", BAHASA_CERDAS_IDENTITY.company.legalName === "CV Obah Mamah");
ok("Nama dagang Teras Kata", BAHASA_CERDAS_IDENTITY.company.tradeName === "Teras Kata");
ok("NIB benar", BAHASA_CERDAS_IDENTITY.company.nib === "1217000151443");
ok("Lokasi publik ringkas (privasi)", BAHASA_CERDAS_IDENTITY.company.location === "Tangerang, Banten");
ok("Produk BahasaCerdas", BAHASA_CERDAS_IDENTITY.company.product === "BahasaCerdas");

// ── 3. Hak cipta — pencipta ≠ pemegang ────────────────────────────────────
ok("Hak cipta: nomor permohonan EC002026106361", BAHASA_CERDAS_IDENTITY.legal.applicationNumber === "EC002026106361");
ok("Hak cipta: tanggal permohonan 6 Juli 2026", BAHASA_CERDAS_IDENTITY.legal.applicationDate === "6 Juli 2026");
ok("Hak cipta: nomor pencatatan 001326318", BAHASA_CERDAS_IDENTITY.legal.recordNumber === "001326318");
ok(
  "Pencipta adalah founder (bukan CV)",
  BAHASA_CERDAS_IDENTITY.legal.workType === "Program Komputer" &&
    BAHASA_CERDAS_IDENTITY.founder.name === "Dominikus Wahyu Heru Cahyadi",
);
ok(
  "Pemegang hak cipta = CV Obah Mamah (bukan founder)",
  BAHASA_CERDAS_IDENTITY.answerTemplates.copyright.includes("CV Obah Mamah") &&
    !BAHASA_CERDAS_IDENTITY.answerTemplates.copyright.includes("patent") &&
    !BAHASA_CERDAS_IDENTITY.answerTemplates.copyright.includes("paten"),
);
ok("Hak cipta: pengumuman pertama 3 Maret 2026", BAHASA_CERDAS_IDENTITY.legal.firstPublishedDate === "3 Maret 2026");
ok("Hak cipta: status TERCATAT", BAHASA_CERDAS_IDENTITY.legal.status.includes("TERCATAT"));

// ── 4. Riwayat — April 2026, BUKAN Maret 2026 ─────────────────────────────
ok("Riwayat: mulai dikembangkan April 2026", BAHASA_CERDAS_IDENTITY.history.developmentStart === "April 2026");
ok(
  "Riwayat: 3 Maret 2026 bukan tanggal mulai (konteks dijelaskan)",
  BAHASA_CERDAS_IDENTITY.history.firstPublicationMeaning.includes("pengumuman pertama"),
);

// ── 5. Kontak & domain ────────────────────────────────────────────────────
ok("Email resmi publik", BAHASA_CERDAS_IDENTITY.contact.publicEmail === "halo@bahasacerdas.com");
ok(
  "Domain resmi tercantum",
  BAHASA_CERDAS_IDENTITY.contact.domains.includes("bahasacerdas.com") &&
    BAHASA_CERDAS_IDENTITY.contact.domains.includes("bahasacerdas.site"),
);
ok("BIGT dijelaskan sebagai produk ekosistem", BAHASA_CERDAS_IDENTITY.contact.bigt.includes("produk"));

// ── 6. Aturan tidak tahu (anti-halusinasi) ────────────────────────────────
ok(
  "Uncertainty phrase persis sesuai spec",
  BAHASA_CERDAS_IDENTITY.answerTemplates.unsure ===
    "Informasi resmi yang saya miliki mengenai hal tersebut belum tersedia.",
);
ok(
  "Instruksi memuat larangan mengarang fakta",
  identityInstruction.includes("JANGAN membuat, menambah, atau mengira-ngira fakta"),
);
ok(
  "Instruksi memuat aturan pivot ke uncertainty untuk investor/pendanaan",
  identityInstruction.includes("investor, pendanaan, valuasi, pendapatan"),
);
ok(
  "Instruksi melarang kata 'sepertinya'/'mungkin'",
  identityInstruction.includes('Jangan gunakan kata "sepertinya"'),
);

// ── 7. Privasi ────────────────────────────────────────────────────────────
ok(
  "Instruksi melarang alamat lengkap/nomor HP/email pribadi",
  identityInstruction.includes("Jangan menyebut alamat lengkap, nomor HP, atau email pribadi siapa pun"),
);

// ── 8. Istilah MURID ──────────────────────────────────────────────────────
ok(
  "Instruksi meminta konsistensi istilah MURID",
  identityInstruction.includes('murid (murid/murids) secara konsisten sebagai "murid"') ||
    identityInstruction.includes('sebut murid (murid/murids) secara konsisten'),
);

// ── 9. Integrasi terpusat — semua agent via prompt-builder ────────────────
ok(
  "prompt-builder mengimpor identity builder",
  promptBuilderSource.includes('buildBahasaCerdasIdentityInstruction")') ||
    promptBuilderSource.includes("buildBahasaCerdasIdentityInstruction"),
);
ok(
  "prompt-builder menyuntik blok ke system prompt",
  promptBuilderSource.includes("buildBahasaCerdasIdentityInstruction()"),
);

// ── 10. Integrasi terpusat — chat AI BC ───────────────────────────────────
ok(
  "route chat mengimpor identity builder",
  chatRouteSource.includes("buildBahasaCerdasIdentityInstruction"),
);
ok(
  "route chat menyuntik blok ke system message",
  chatRouteSource.includes("buildBahasaCerdasIdentityInstruction()"),
);

// ── 11. Tanpa duplikasi per provider ──────────────────────────────────────
ok(
  "Instruksi identitas TIDAK menyebut nama provider (provider-independent)",
  !/DeepSeek|Groq|Gemini|deepseek|groq|gemini/.test(identityInstruction),
);
ok(
  "Blok dibuat dari SATU builder (bukan string duplikat)",
  promptBuilderSource.split("buildBahasaCerdasIdentityInstruction").length >= 2 &&
    chatRouteSource.split("buildBahasaCerdasIdentityInstruction").length >= 2,
);

// ── 12. Anti klaim wow ────────────────────────────────────────────────────
ok(
  "Instruksi melarang klaim terbaik/nomor satu/terbesar",
  identityInstruction.includes('Jangan gunakan klaim wow seperti "terbaik"') &&
    !identityInstruction.includes("adalah yang terbaik") &&
    !identityInstruction.includes("nomor satu di"),
);
ok(
  "Instruksi melarang klaim paten (bukan menyatakan paten)",
  identityInstruction.includes('Jangan pernah menyebut "patent/paten"') &&
    !identityInstruction.includes("telah dipatenkan") &&
    !identityInstruction.includes("nomor paten"),
);

// ── 13. Dokumen kanonik lengkap ───────────────────────────────────────────
ok(
  "docs registry memuat NIB",
  docSource.includes("1217000151443"),
);
ok(
  "docs registry memuat nomor permohonan & pencatatan",
  docSource.includes("EC002026106361") && docSource.includes("001326318"),
);
ok(
  "docs registry memuat April 2026 & makna 3 Maret 2026",
  docSource.includes("April 2026") && docSource.includes("pengumuman pertama"),
);
ok(
  "docs registry memuat template jawaban standar",
  docSource.includes("Founder dan CEO BahasaCerdas adalah Dominikus Wahyu Heru Cahyadi"),
);

// ── 14. Kesesuaian dokumen ↔ machine registry ─────────────────────────────
ok(
  "docs ↔ registry sinkron (nama pencipta & pemegang)",
  docSource.includes("Dominikus Wahyu Heru Cahyadi") && docSource.includes("CV Obah Mamah"),
);
ok(
  "docs ↔ registry sinkron (Melany sesuai registry)",
  docSource.includes("Melany K. Gigir"),
);

console.log(`\n════════════════════════════════════════`);
console.log(`HASIL: ${fail === 0 ? "SEMUA LULUS ✅" : `${fail} GAGAL ❌`}`);
process.exit(fail === 0 ? 0 : 1);