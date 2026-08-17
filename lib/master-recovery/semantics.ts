import { MasterQuestion } from "./types";
import { normText, keyIndex, normOption } from "./normalize";

export interface SemanticVerdict {
  valid: boolean;
  reason?: string;
  multiCorrect?: boolean;
  ambiguous?: boolean;
}

const SYNONYM_SETS: Record<string, string[]> = {
  bahagia: ["senang", "gembira", "suka cita", "riang", "sukacita"],
  cerdas: ["pintar", "pandai", "tajam", "genius", "berakal"],
  berani: ["gagah", "perkasa", "gagah berani", "nekat"],
  abadi: ["kekal", "langgeng", "selamanya", "eternal"],
  maju: ["melaju", "mendepan", "berkembang", "progresif"],
  malas: ["pemalas", "ogah-ogahan", "segan"],
};

const ANTONYM_SETS: Record<string, string[]> = {
  panas: ["dingin"],
  tinggi: ["rendah"],
  maju: ["mundur"],
};

const MAJAS_VERIFIED: Array<{
  text: string;
  key: number;
  expected: string;
}> = [
  {
    text: "'Angin berbisik di malam hari' mengandung majas...",
    key: 1,
    expected: "personifikasi",
  },
  {
    text: "'Keringatnya mengalir seperti air sungai' mengandung majas...",
    key: 3,
    expected: "simile",
  },
  {
    text: "'Dia adalah bintang kelas' mengandung majas...",
    key: 1,
    expected: "metafora",
  },
];

const KALIMAT_VERIFIED: Array<{
  text: string;
  key: number;
  expected: string;
}> = [
  {
    text: "Kalimat yang menyatakan ajakan disebut kalimat...",
    key: 2,
    expected: "imperatif",
  },
  {
    text: "Kalimat 'Siapa namamu?' termasuk jenis kalimat...",
    key: 1,
    expected: "interogatif",
  },
  {
    text: "Kalimat 'Alangkah indahnya pemandangan ini!' termasuk...",
    key: 3,
    expected: "eksklamatif",
  },
];

const SPOK_VERIFIED: Array<{
  kodeSoal: string;
  key: number;
  expected: string;
}> = [
  { kodeSoal: "BC-SPOK-0001", key: 0, expected: "subjek" },
  { kodeSoal: "BC-SPOK-0002", key: 1, expected: "predikat" },
  { kodeSoal: "BC-SPOK-0003", key: 2, expected: "objek" },
  { kodeSoal: "BC-SPOK-0004", key: 2, expected: "keterangan" },
  { kodeSoal: "BC-SPOK-0005", key: 0, expected: "subjek" },
  { kodeSoal: "BC-SPOK-0006", key: 2, expected: "pola s p o" },
  { kodeSoal: "BC-SPOK-0007", key: 0, expected: "unsur inti" },
  { kodeSoal: "BC-SPOK-0008", key: 2, expected: "objek" },
];

const VERB_LIST = [
  "membaca", "mencuci", "membeli", "belajar", "mengajar",
  "tidur", "menangis", "berlari", "membawa", "makan", "minum",
];

function checkSynonym(q: MasterQuestion): SemanticVerdict {
  const m = (q.text || "").match(/dari kata '([^']+)'/i);
  const target = m ? m[1].toLowerCase() : null;
  if (!target) return { valid: false, reason: "target kata tidak ditemukan di stem" };
  const set = SYNONYM_SETS[target];
  if (!set) return { valid: false, reason: `tidak ada tabel sinonim untuk '${target}'` };
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return { valid: false, reason: "kunci tidak valid" };
  const keyOpt = normOption(q.options[idx] || "");
  const ok = set.some((s) => keyOpt === s);
  if (!ok) {
    const closer = q.options
      .map((o, i) => ({ o: normOption(o), i }))
      .filter((x) => x.i !== idx && x.o && set.includes(x.o));
    if (closer.length === 1)
      return {
        valid: false,
        reason: `kunci index ${idx} bukan sinonim; opsi index ${closer[0].i} yang benar`,
      };
    return { valid: false, reason: "kunci bukan sinonim yang dapat dipertanggungjawabkan" };
  }
  const alsoCorrect = q.options
    .map((o, i) => ({ o: normOption(o), i }))
    .filter((x) => x.i !== idx && x.o && set.includes(x.o));
  if (alsoCorrect.length > 0)
    return {
      valid: false,
      multiCorrect: true,
      reason: `opsi ${alsoCorrect.map((x) => x.i).join(", ")} juga sinonim`,
    };
  return { valid: true };
}

function checkAntonym(q: MasterQuestion): SemanticVerdict {
  const m = (q.text || "").match(/dari (?:kata )?'([^']+)'/i);
  const target = m ? m[1].toLowerCase() : null;
  if (!target) return { valid: false, reason: "target kata tidak ditemukan di stem" };
  const set = ANTONYM_SETS[target];
  if (!set) return { valid: false, reason: `tidak ada tabel antonim untuk '${target}'` };
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return { valid: false, reason: "kunci tidak valid" };
  const keyOpt = normOption(q.options[idx] || "");
  const ok = set.some((s) => keyOpt === s);
  if (!ok)
    return { valid: false, reason: "kunci bukan antonim yang dapat dipertanggungjawabkan" };
  const alsoCorrect = q.options
    .map((o, i) => ({ o: normOption(o), i }))
    .filter((x) => x.i !== idx && x.o && set.includes(x.o));
  if (alsoCorrect.length > 0)
    return {
      valid: false,
      multiCorrect: true,
      reason: `opsi ${alsoCorrect.map((x) => x.i).join(", ")} juga antonim`,
    };
  return { valid: true };
}

function checkMajas(q: MasterQuestion): SemanticVerdict {
  const hit = MAJAS_VERIFIED.find((v) => normText(v.text) === normText(q.text));
  if (!hit) return { valid: false, reason: "soal majas tidak dalam tabel terverifikasi" };
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return { valid: false, reason: "kunci tidak valid" };
  const keyOpt = normOption(q.options[idx] || "");
  const expected = normText(hit.expected);
  const ok = keyOpt.includes(expected) || expected.includes(keyOpt);
  if (!ok) return { valid: false, reason: `kunci ≠ ${hit.expected}` };
  const others = q.options
    .map((o, i) => ({ o: normOption(o), i }))
    .filter((x) => x.i !== idx && x.o && (x.o.includes(expected) || expected.includes(x.o)));
  if (others.length > 0)
    return {
      valid: false,
      multiCorrect: true,
      reason: `opsi ${others.map((x) => x.i).join(", ")} juga ${hit.expected}`,
    };
  return { valid: true };
}

function checkKalimat(q: MasterQuestion): SemanticVerdict {
  const hit = KALIMAT_VERIFIED.find((v) => normText(v.text) === normText(q.text));
  if (!hit) return { valid: false, reason: "soal kalimat tidak dalam tabel terverifikasi" };
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return { valid: false, reason: "kunci tidak valid" };
  const keyOpt = normOption(q.options[idx] || "");
  const expected = normText(hit.expected);
  const ok = keyOpt.includes(expected) || expected.includes(keyOpt);
  if (!ok) return { valid: false, reason: `kunci ≠ ${hit.expected}` };
  return { valid: true };
}

function checkSpok(q: MasterQuestion): SemanticVerdict {
  const hit = SPOK_VERIFIED.find((v) => v.kodeSoal === q.kodeSoal);
  if (!hit) return { valid: false, reason: "soal SPOK tidak dalam tabel terverifikasi" };
  const idx = keyIndex(q.correctAnswer, q.type);
  if (idx === null) return { valid: false, reason: "kunci tidak valid" };
  if (idx !== hit.key)
    return { valid: false, reason: `kunci index ${idx} ≠ ${hit.key} (${hit.expected})` };
  const keyOpt = q.options[idx] || "";
  if (!keyOpt.trim()) return { valid: false, reason: "opsi kunci kosong" };
  return { valid: true };
}

export function semanticValidate(q: MasterQuestion): SemanticVerdict {
  const tema = (q.tema || "").toLowerCase();
  const prefix = (q.kodeSoal || "").split("-")[1] || "";
  if (prefix === "sinonim" || tema.includes("sinonim"))
    return checkSynonym(q);
  if (prefix === "antonim" || tema.includes("antonim"))
    return checkAntonym(q);
  if (prefix === "majas" || tema.includes("majas")) return checkMajas(q);
  if (prefix === "kalimat" || tema.includes("kalimat")) return checkKalimat(q);
  if (prefix === "spok" || tema.includes("spok")) return checkSpok(q);
  if (prefix === "kata-baku" || prefix === "kata-tidak-baku") {
    const idx = keyIndex(q.correctAnswer, q.type);
    if (idx === null) return { valid: false, reason: "kunci tidak valid" };
    return { valid: true };
  }
  if (prefix === "makna-kata") {
    const idx = keyIndex(q.correctAnswer, q.type);
    if (idx === null) return { valid: false, reason: "kunci tidak valid" };
    return { valid: true };
  }
  return { valid: true };
}
