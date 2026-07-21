import { GRADE_OPTIONS, gradesForPhase, phaseForGrade } from "../lib/kurikulum/jenjang";
import { tokenizeMarkdown } from "../src/ai/export/shared/markdown";

let fail = 0;
const ok = (l: string, c: boolean) => { if (!c) fail++; console.log(`${c ? "PASS" : "FAIL"}  ${l}`); };

// Grades: SD must exist now
ok("kelas SD I-VI tersedia", ["I","II","III","IV","V","VI"].every(g => GRADE_OPTIONS.some(o => o.value === g)));
ok("total 12 kelas (I-XII)", GRADE_OPTIONS.length === 12);
ok("Fase B -> kelas III & IV", gradesForPhase("B").map(g=>g.value).join(",") === "III,IV");
ok("Fase A -> kelas I & II", gradesForPhase("A").map(g=>g.value).join(",") === "I,II");
ok("kelas IV -> fase B", phaseForGrade("IV") === "B");
ok("kelas X -> fase E", phaseForGrade("X") === "E");
ok("setiap fase punya minimal 1 kelas", ["A","B","C","D","E","F"].every(p => gradesForPhase(p).length > 0));

// Illustration marker must not leak raw into exports
const blocks = tokenizeMarkdown("### G. Media\n[Ilustrasi: pasar tradisional Indonesia]\nteks lain");
const flat = JSON.stringify(blocks);
ok("marker mentah tidak bocor ke ekspor", !flat.includes("[Ilustrasi:"));
ok("keterangan ilustrasi dipertahankan", flat.includes("pasar tradisional Indonesia"));
ok("dirender sebagai catatan miring", flat.includes("Saran ilustrasi"));

// Preview regex (same shape used by the panel)
const re = /^\[Ilustrasi:\s*(.+?)\]$/i;
ok("regex preview cocok", re.test("[Ilustrasi: anak membaca buku]"));
ok("regex abaikan baris biasa", !re.test("Media: buku paket"));

console.log(fail === 0 ? "\nSEMUA LULUS" : `\n${fail} GAGAL`);
process.exit(fail === 0 ? 0 : 1);
