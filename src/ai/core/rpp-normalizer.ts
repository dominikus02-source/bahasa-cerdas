/**
 * RPP Normalizer & Document Renderer
 *
 * Satu-satunya tempat mengubah output mentah AI (string/objek/nested apa pun)
 * menjadi dokumen RPP siap tampil-salin-cetak. Dipakai agent-runner dan
 * agent-stream-runner supaya UI TIDAK PERNAH menerima JSON mentah atau
 * [object Object].
 */

const TITIK = "........................................";

/** Ambil teks tampil dari bentuk respons apa pun (string, objek, nested). */
export function pickTextDeep(raw: unknown, depth = 0): string | null {
  if (raw == null || depth > 4) return null;

  if (typeof raw === "string") {
    const t = raw.trim();
    return t.length > 0 ? t : null;
  }

  if (Array.isArray(raw)) {
    for (const item of raw) {
      const found = pickTextDeep(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // Prioritas field teks langsung
    for (const key of ["displayText", "editableText", "content", "markdown", "text"]) {
      const v = obj[key];
      if (typeof v === "string" && v.trim().length > 0) return v.trim();
    }
    // Bentuk nested umum: { result: {...} } / { data: {...} } / { output: {...} }
    for (const key of ["result", "data", "output"]) {
      if (obj[key] != null) {
        const found = pickTextDeep(obj[key], depth + 1);
        if (found) return found;
      }
    }
  }

  return null;
}

/** Apakah objek terlihat seperti struktur RPP yang bisa dirender jadi dokumen? */
export function isRppShaped(raw: unknown): raw is Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return false;
  const obj = raw as Record<string, unknown>;
  const keys = [
    "identity", "identitas", "learningObjectives", "tujuanPembelajaran",
    "learningSteps", "kegiatanPembelajaran", "assessmentPlan", "asesmen",
    "capaianPembelajaran", "pemahamanBermakna", "pertanyaanPemantik",
    "materiPembelajaran", "learningMaterials", "title",
  ];
  let hits = 0;
  for (const k of keys) if (obj[k] != null) hits++;
  return hits >= 2;
}

// ── Helper konversi nilai bebas → teks ─────────────────────────

function asText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return "";
}

function asItems(v: unknown): string[] {
  if (v == null) return [];
  if (typeof v === "string") return v.trim() ? [v.trim()] : [];
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? x.trim() : asText(x)))
      .filter((x) => x.length > 0);
  }
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => {
        const t = typeof val === "string" ? val : asItems(val).join("; ");
        return t ? `${labelize(k)}: ${t}` : "";
      })
      .filter(Boolean);
  }
  return [];
}

function labelize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase());
}

function pick(obj: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (obj[k] != null) return obj[k];
  }
  return undefined;
}

function section(letter: string, title: string, body: string): string {
  if (!body.trim()) return "";
  return `### ${letter}. ${title}\n${body.trim()}\n`;
}

function bullets(v: unknown): string {
  return asItems(v).map((x) => `- ${x}`).join("\n");
}

function numbered(v: unknown): string {
  return asItems(v).map((x, i) => `${i + 1}. ${x}`).join("\n");
}

export interface RppRenderInput {
  schoolName?: string;
  teacherName?: string;
  principalName?: string;
  teacherNip?: string;
  principalNip?: string;
  academicYear?: string;
  cityDate?: string;
  subject?: string;
  grade?: string;
  phase?: string;
  semester?: string;
  curriculum?: string;
  topic?: string;
  duration?: string;
  [k: string]: unknown;
}

/**
 * Render objek RPP (struktur apa pun, Indonesia/Inggris) menjadi dokumen
 * markdown siap cetak dengan identitas, lembar pengesahan, dan footer.
 */
export function renderRppDocument(
  data: Record<string, unknown>,
  input: RppRenderInput = {}
): string {
  const identity = (pick(data, "identity", "identitas") ?? {}) as Record<string, unknown>;

  const val = (inputKey: keyof RppRenderInput, ...dataKeys: string[]): string =>
    asText(input[inputKey]) || asText(pick(identity, ...dataKeys)) || asText(pick(data, ...dataKeys));

  const schoolName = val("schoolName", "schoolName", "namaSekolah") || TITIK;
  const teacherName = val("teacherName", "teacherName", "namaGuru") || TITIK;
  const principalName = val("principalName", "principalName", "namaKepalaSekolah") || TITIK;
  const teacherNip = val("teacherNip", "teacherNip", "nipGuru") || TITIK;
  const principalNip = val("principalNip", "principalNip", "nipKepalaSekolah") || TITIK;
  const academicYear = val("academicYear", "academicYear", "tahunAjaran") || TITIK;
  const cityDate = val("cityDate", "cityDate", "kotaTanggal") || "...................., ....................";
  const subject = val("subject", "subject", "mataPelajaran") || "Bahasa Indonesia";
  const grade = val("grade", "grade", "kelas") || TITIK;
  const phase = val("phase", "phase", "fase");
  const semester = val("semester", "semester") || TITIK;
  const curriculum = val("curriculum", "curriculum", "kurikulum") || "Kurikulum Merdeka";
  const topic = val("topic", "topic", "topik", "materi") || TITIK;
  const duration = val("duration", "duration", "alokasiWaktu") || TITIK;

  const title =
    asText(pick(data, "title", "judul")) ||
    `Modul Ajar ${subject} — ${topic !== TITIK ? topic : "Materi Pembelajaran"}`;

  const steps = (pick(data, "learningSteps", "kegiatanPembelajaran", "langkahPembelajaran") ?? {}) as Record<string, unknown>;
  const assessment = (pick(data, "assessmentPlan", "asesmen", "penilaian") ?? {}) as Record<string, unknown>;
  const diff = (pick(data, "differentiationStrategy", "diferensiasi") ?? {}) as Record<string, unknown>;
  const reflection = (pick(data, "reflection", "refleksi") ?? {}) as Record<string, unknown>;
  const worksheet = pick(data, "worksheetSuggestion", "lkpd", "LKPD");
  const rubric = pick(data, "rubric", "rubrik", "rubrikPenilaian");
  const remedial = (pick(data, "remedialAndEnrichment", "remedialPengayaan") ?? {}) as Record<string, unknown>;

  const parts: string[] = [];

  parts.push(`# ${title}`);
  parts.push(`## MODUL AJAR / RENCANA PELAKSANAAN PEMBELAJARAN\n`);

  parts.push(`### Identitas Dokumen
| | |
|---|---|
| Nama Sekolah | ${schoolName} |
| Mata Pelajaran | ${subject} |
| Fase/Kelas | ${phase ? `${phase}/` : ""}${grade} |
| Semester | ${semester} |
| Tahun Ajaran | ${academicYear} |
| Kurikulum | ${curriculum} |
| Materi/Topik | ${topic} |
| Alokasi Waktu | ${duration} |
| Nama Guru | ${teacherName} |
| Nama Kepala Sekolah | ${principalName} |
`);

  parts.push(section("A", "Informasi Umum", [
    asText(pick(data, "studentProfile", "profilSiswa")) && `**Target Peserta Didik:** ${asText(pick(data, "studentProfile", "profilSiswa"))}`,
    asText(pick(data, "priorKnowledge", "kompetensiAwal")) && `**Kompetensi Awal:** ${asText(pick(data, "priorKnowledge", "kompetensiAwal"))}`,
    asText(pick(data, "learningModel", "modelPembelajaran")) && `**Model Pembelajaran:** ${asText(pick(data, "learningModel", "modelPembelajaran"))}`,
  ].filter(Boolean).join("\n\n")));

  parts.push(section("B", "Capaian Pembelajaran",
    asText(pick(data, "capaianPembelajaran", "cp")) || bullets(pick(data, "capaianPembelajaran"))));

  parts.push(section("C", "Tujuan Pembelajaran",
    numbered(pick(data, "learningObjectives", "tujuanPembelajaran"))));

  parts.push(section("D", "Profil Pelajar Pancasila",
    bullets(pick(data, "pancasilaProfile", "profilPelajarPancasila"))));

  parts.push(section("E", "Materi Pembelajaran",
    bullets(pick(data, "learningMaterials", "materiPembelajaran", "materiPokok"))));

  parts.push(section("F", "Pemahaman Bermakna",
    asText(pick(data, "meaningfulUnderstanding", "pemahamanBermakna"))));

  parts.push(section("G", "Pertanyaan Pemantik",
    numbered(pick(data, "promptingQuestions", "pertanyaanPemantik"))));

  parts.push(section("H", "Sarana dan Prasarana",
    bullets(pick(data, "learningResources", "saranaPrasarana", "sumberBelajar"))));

  parts.push(section("I", "Model/Metode Pembelajaran",
    asText(pick(data, "learningModel", "modelPembelajaran", "metodePembelajaran"))));

  const opening = numbered(pick(steps, "opening", "pendahuluan", "kegiatanPendahuluan"));
  const core = numbered(pick(steps, "core", "inti", "kegiatanInti"));
  const closing = numbered(pick(steps, "closing", "penutup", "kegiatanPenutup"));
  if (opening || core || closing) {
    parts.push(section("J", "Langkah Pembelajaran", [
      opening && `**1. Pendahuluan**\n${opening}`,
      core && `**2. Kegiatan Inti**\n${core}`,
      closing && `**3. Penutup**\n${closing}`,
    ].filter(Boolean).join("\n\n")));
  }

  const diffBody = [
    bullets(pick(diff, "content", "konten")) && `**Konten:**\n${bullets(pick(diff, "content", "konten"))}`,
    bullets(pick(diff, "process", "proses")) && `**Proses:**\n${bullets(pick(diff, "process", "proses"))}`,
    bullets(pick(diff, "product", "produk")) && `**Produk:**\n${bullets(pick(diff, "product", "produk"))}`,
  ].filter(Boolean).join("\n\n");
  parts.push(section("K", "Diferensiasi Pembelajaran", diffBody || bullets(diff)));

  const asmBody = [
    bullets(pick(assessment, "diagnostic", "diagnostik")) && `**1. Diagnostik**\n${bullets(pick(assessment, "diagnostic", "diagnostik"))}`,
    bullets(pick(assessment, "formative", "formatif")) && `**2. Formatif**\n${bullets(pick(assessment, "formative", "formatif"))}`,
    bullets(pick(assessment, "summative", "sumatif")) && `**3. Sumatif**\n${bullets(pick(assessment, "summative", "sumatif"))}`,
  ].filter(Boolean).join("\n\n");
  parts.push(section("L", "Asesmen", asmBody || bullets(assessment)));

  if (worksheet) {
    const w = (typeof worksheet === "object" ? worksheet : {}) as Record<string, unknown>;
    parts.push(section("M", "Lembar Kerja Peserta Didik (LKPD)", [
      asText(pick(w, "title", "judul")) && `**${asText(pick(w, "title", "judul"))}**`,
      numbered(pick(w, "instructions", "petunjuk")) && `**Petunjuk:**\n${numbered(pick(w, "instructions", "petunjuk"))}`,
      numbered(pick(w, "activities", "aktivitas")) && `**Aktivitas:**\n${numbered(pick(w, "activities", "aktivitas"))}`,
      typeof worksheet === "string" ? worksheet : "",
    ].filter(Boolean).join("\n\n")));
  }

  if (rubric) {
    const r = (typeof rubric === "object" ? rubric : {}) as Record<string, unknown>;
    const criteria = Array.isArray(r.criteria) ? (r.criteria as Record<string, unknown>[]) : [];
    const rows = criteria
      .map((c) => `| ${asText(c.name) || "-"} | ${asText(c.excellent) || "-"} | ${asText(c.good) || "-"} | ${asText(c.needsImprovement) || "-"} |`)
      .join("\n");
    parts.push(section("N", "Rubrik Penilaian",
      rows
        ? `| Kriteria | Sangat Baik | Baik | Perlu Bimbingan |\n|---|---|---|---|\n${rows}`
        : typeof rubric === "string" ? rubric : bullets(rubric)));
  }

  parts.push(section("O", "Remedial", bullets(pick(remedial, "remedial"))));
  parts.push(section("P", "Pengayaan", bullets(pick(remedial, "enrichment", "pengayaan"))));

  parts.push(section("Q", "Refleksi Guru",
    numbered(pick(reflection, "teacherReflection", "refleksiGuru"))));
  parts.push(section("R", "Refleksi Peserta Didik",
    numbered(pick(reflection, "studentReflection", "refleksiSiswa"))));
  parts.push(section("S", "Catatan Guru",
    bullets(pick(data, "teacherNotes", "catatanGuru"))));

  parts.push(`### Lembar Pengesahan

${cityDate}

| Mengetahui, | |
|---|---|
| Kepala Sekolah | Guru Mata Pelajaran |
| <br><br><br> | <br><br><br> |
| **${principalName}** | **${teacherName}** |
| NIP. ${principalNip} | NIP. ${teacherNip} |
`);

  parts.push(`---\n*Dibuat dengan BahasaCerdas.com*`);

  return parts.filter((p) => p && p.trim().length > 0).join("\n");
}

export interface NormalizedRpp {
  doc: string;
  usedFallbackRender: boolean;
  warnings: string[];
}

/**
 * Normalisasi hasil RPP dari bentuk apa pun menjadi dokumen final.
 * - objek dengan editableText/displayText memadai → pakai teksnya
 * - objek berstruktur RPP → render dokumen lengkap
 * - string panjang → pakai apa adanya
 * Return null hanya jika benar-benar tidak ada konten yang bisa dipakai.
 */
export function normalizeRppResult(
  raw: unknown,
  input: RppRenderInput
): NormalizedRpp | null {
  const warnings: string[] = [];

  // 1. Teks langsung yang layak (dokumen dari AI)
  const direct = pickTextDeep(raw);
  if (direct && direct.length >= 500) {
    return { doc: direct, usedFallbackRender: false, warnings };
  }

  // 2. Objek berstruktur RPP → render dokumen
  const candidates: unknown[] = [raw];
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    candidates.push(obj.result, obj.data, obj.output);
  }
  for (const cand of candidates) {
    if (isRppShaped(cand)) {
      warnings.push("Dokumen disusun dari data terstruktur AI");
      return { doc: renderRppDocument(cand, input), usedFallbackRender: true, warnings };
    }
  }

  // 3. Teks pendek pun masih lebih baik daripada gagal — tapi tandai
  if (direct) {
    warnings.push("Konten AI lebih pendek dari biasanya — periksa kelengkapan dokumen");
    return { doc: direct, usedFallbackRender: false, warnings };
  }

  return null;
}
