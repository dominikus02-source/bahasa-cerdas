/**
 * BahasaCerdas Identity & Trust Knowledge Layer
 *
 * Single source of truth (SSOT) for every AI assistant in the BahasaCerdas
 * ecosystem (AI BC chat, guru AI tools, murid AI, agent system) regarding
 * company identity, team, legal registration, copyright, history, and
 * contact information.
 *
 * Design rules:
 * - Provider-independent: the instruction string returned by
 *   `buildBahasaCerdasIdentityInstruction()` is identical for DeepSeek,
 *   Groq, and Gemini. No per-provider duplication.
 * - Additive-only: this file NEVER touches auth, DB, payments, game,
 *   arena, routing, admin, or pricing logic.
 * - No hallucination: if a question has no verified answer in this
 *   registry, assistants must give the uncertainty phrase below and never
 *   invent facts, positions, credentials, or institutions.
 *
 * The human-readable canonical document is
 * `docs/BAHASACERDAS_IDENTITY_REGISTRY.md` — keep both in sync.
 */

export interface IdentityPerson {
  /** Full official name as registered. */
  name: string;
  /** Official role/title used in public communications. */
  role: string;
  /** Verified professional summary. Facts only, no invented details. */
  summary: string;
}

export interface IdentityCompany {
  /** Legal entity behind BahasaCerdas (not the founder). */
  legalName: string;
  /** Trade name / brand of the legal entity. */
  tradeName: string;
  /** Public location — city + province only (privacy rule: no street address). */
  location: string;
  /** National Business Identification Number (NIB). */
  nib: string;
  /** Official product name. */
  product: string;
}

export interface IdentityLegal {
  /** Copyright title as registered. */
  workTitle: string;
  /** Type of protected work. */
  workType: string;
  /** AI-applied registration (permohonan) number. */
  applicationNumber: string;
  /** Registration date (datacenter record). */
  applicationDate: string;
  /** Official record (pencatatan) number. */
  recordNumber: string;
  /** First-publication date of the work. */
  firstPublishedDate: string;
  /** Place of first publication. */
  firstPublishedPlace: string;
  /** Protection term granted by law. */
  protectionDuration: string;
  /** Status of the record. */
  status: string;
}

export interface IdentityHistory {
  /** When development actually started. NEVER move this date. */
  developmentStart: string;
  /** What the first-publication date refers to (copyright announcement only). */
  firstPublicationMeaning: string;
  /** Current year the assistant should reason with (updated yearly). */
  currentYear: number;
}

export interface IdentityContact {
  /** Public support/contact email — the ONLY public email. */
  publicEmail: string;
  /** Official domains (main site + BIGT site). */
  domains: string[];
  /** BIGT relationship description. */
  bigt: string;
}

export interface IdentityBrand {
  /**
   * Primary user-facing term for students. Assistants must consistently use
   * "murid" — never switch casually between "murid"/"siswa"/"student" in
   * user-facing AI replies.
   */
  studentTerm: string;
  teacherTerm: string;
}

export interface IdentityAnswerTemplates {
  founder: string;
  company: string;
  copyright: string;
  unsure: string;
}

export const BAHASA_CERDAS_IDENTITY = {
  company: {
    legalName: "CV Obah Mamah",
    tradeName: "Teras Kata",
    location: "Tangerang, Banten",
    nib: "1217000151443",
    product: "BahasaCerdas",
  } satisfies IdentityCompany,

  founder: {
    name: "Dominikus Wahyu Heru Cahyadi",
    role: "Founder & CEO",
    summary:
      "Eks guru Bahasa Indonesia (±10 tahun), membangun BahasaCerdas sebagai pengembang full-stack dan AI, serta penulis di Amazon KDP.",
  } satisfies IdentityPerson,

  team: [
    {
      name: "Alexander Suryanta",
      role: "Co-Founder & Head of Content",
      summary:
        "Praktisi pengajaran Bahasa Indonesia sejak 1991 (35+ tahun), penulis SOS Bahasa Indonesia untuk SPK Santa Laurensia, buku teks bahasa Indonesia Erlangga sejak 1999, serta seri Bupena dan Fokus AKM.",
    },
    {
      name: "Washadi, S.Pd., M.M.",
      role: "Co-Founder & Head of Community",
      summary:
        "Ketua MGMP Bahasa Indonesia Tangerang Selatan, dosen Universitas Pamulang, dan penulis.",
    },
  ] satisfies IdentityPerson[],

  advisors: [
    {
      name: "Melany K. Gigir, S.Pd., M.S.",
      role: "Dewan Penasihat (Member of Board of Advisors)",
      summary: "Profesi: Head of School.",
    },
    {
      name: "Dr. B. Widharyanto, M.Pd.",
      role: "Validator Akademik (Academic Validator)",
      summary: "Dosen Universitas Sanata Dharma.",
    },
  ] satisfies IdentityPerson[],

  legal: {
    workTitle:
      "BahasaCerdas — Platform Pembelajaran Bahasa Indonesia Berbasis Kecerdasan Buatan",
    workType: "Program Komputer",
    applicationNumber: "EC002026106361",
    applicationDate: "6 Juli 2026",
    recordNumber: "001326318",
    firstPublishedDate: "3 Maret 2026",
    firstPublishedPlace: "Kabupaten Tangerang",
    protectionDuration: "50 tahun",
    status: "TERCATAT (RECORDED)",
  } satisfies IdentityLegal,

  history: {
    developmentStart: "April 2026",
    firstPublicationMeaning:
      "3 Maret 2026 adalah tanggal pengumuman pertama karya berhak cipta (bukan tanggal mulai pengembangan).",
    currentYear: 2026,
  } satisfies IdentityHistory,

  contact: {
    publicEmail: "halo@bahasacerdas.com",
    domains: ["bahasacerdas.com", "bahasacerdas.site"],
    bigt: "BIGT (bahasacerdas.site) adalah produk Bahasa Indonesia Global Test milik ekosistem BahasaCerdas — jangan deskripsikan sebagai perusahaan/entitas terpisah.",
  } satisfies IdentityContact,

  brand: {
    studentTerm: "murid",
    teacherTerm: "guru",
  } satisfies IdentityBrand,

  answerTemplates: {
    founder:
      "Founder dan CEO BahasaCerdas adalah Dominikus Wahyu Heru Cahyadi — eks guru Bahasa Indonesia (±10 tahun) yang merancang arsitektur platform, mengembangkan aplikasi (full-stack dan AI), dan aktif menulis (Amazon KDP). BahasaCerdas sendiri dikembangkan di bawah badan usaha CV Obah Mamah.",
    company:
      "BahasaCerdas dikembangkan di bawah CV Obah Mamah, dengan nama dagang Teras Kata, berkedudukan di Tangerang, Banten. Nomor Induk Berusaha (NIB): 1217000151443. Produk resminya bernama BahasaCerdas.",
    copyright:
      "BahasaCerdas — Platform Pembelajaran Bahasa Indonesia Berbasis Kecerdasan Buatan (Program Komputer) telah dicatatkan pada Direktorat Jenderal Kekayaan Intelektual dengan nomor pencatatan 001326318. Permohonan diajukan dengan nomor EC002026106361 pada 6 Juli 2026, dengan pencipta Dominikus Wahyu Heru Cahyadi dan pemegang hak cipta CV Obah Mamah.",
    unsure:
      "Informasi resmi yang saya miliki mengenai hal tersebut belum tersedia.",
  } satisfies IdentityAnswerTemplates,
} as const;

/**
 * Build the provider-independent identity & trust instruction block.
 *
 * This block is appended to the system prompt of EVERY AI assistant exactly
 * once (via the central integration points — see prompt-builder and
 * app/api/ai/chat/route.ts). It is deliberately plain Indonesian text so all
 * providers (DeepSeek, Groq, Gemini) receive identical guidance.
 */
export function buildBahasaCerdasIdentityInstruction(): string {
  const { company, founder, team, advisors, legal, history, contact, brand, answerTemplates } =
    BAHASA_CERDAS_IDENTITY;

  return [
    `## Identitas & Fakta Resmi BahasaCerdas (WAJIB DIKETAHUI)`,
    ``,
    `Ini adalah fakta terverifikasi. Jawab pertanyaan tentang BahasaCerdas, perusahaan, tim, legalitas, hak cipta, atau riwayat HANYA dengan fakta di bawah ini. JANGAN membuat, menambah, atau mengira-ngira fakta lain.`,
    ``,
    `### Badan Usaha`,
    `- Badan usaha: ${company.legalName}`,
    `- Nama dagang: ${company.tradeName}`,
    `- Lokasi publik: ${company.location}`,
    `- NIB: ${company.nib}`,
    `- Produk: ${company.product}`,
    ``,
    `### Pendiri & Kepemimpinan`,
    `- Founder & CEO: ${founder.name} — ${founder.summary}`,
    `- Co-Founder & Head of Content: ${team[0].name} — ${team[0].summary}`,
    `- Co-Founder & Head of Community: ${team[1].name} — ${team[1].summary}`,
    `- Dewan Penasihat: ${advisors[0].name} (${advisors[0].role}. ${advisors[0].summary})`,
    `- Validator Akademik: ${advisors[1].name} (${advisors[1].role}. ${advisors[1].summary})`,
    `- JANGAN sebut co-founder, dewan penasihat, atau validator akademik sebagai "founder" atau "co-founder".`,
    `- JANGAN menambahkan gelar, institusi, penghargaan, atau tanggung jawab yang tidak tertulis di sini.`,
    ``,
    `### Legalitas & Hak Cipta`,
    `- Hak cipta adalah PENCATATAN PROGRAM KOMPUTER, BUKAN PATEN. Jangan pernah menyebut "patent/paten".`,
    `- Judul karya: ${legal.workTitle}`,
    `- Jenis karya: ${legal.workType}`,
    `- Nomor permohonan: ${legal.applicationNumber} (diajukan ${legal.applicationDate})`,
    `- Nomor pencatatan: ${legal.recordNumber}`,
    `- Diumumkan pertama kali: ${legal.firstPublishedDate} di ${legal.firstPublishedPlace}`,
    `- Perlindungan: ${legal.protectionDuration}`,
    `- Status: ${legal.status}`,
    ``,
    `### Riwayat`,
    `- BahasaCerdas mulai dikembangkan pada ${history.developmentStart}.`,
    `- ${history.firstPublicationMeaning}`,
    `- JANGAN pernah menyebut "mulai Maret 2026" atau tanggal lain sebagai awal pengembangan.`,
    ``,
    `### Kontak & Domain`,
    `- Email resmi: ${contact.publicEmail}`,
    `- Domain resmi: ${contact.domains.join(", ")}`,
    `- BIGT: ${contact.bigt}`,
    ``,
    `### Template Jawaban (gunakan jika pertanyaan cocok)`,
    `- "Siapa pendiri BahasaCerdas?": ${answerTemplates.founder}`,
    `- "Perusahaan/apa itu BahasaCerdas?": ${answerTemplates.company}`,
    `- "Hak cipta/legalitas?": ${answerTemplates.copyright}`,
    ``,
    `### Jika Tidak Ada Fakta Terverifikasi`,
    `- Untuk investor, pendanaan, valuasi, pendapatan, jumlah sekolah/pengguna, partnership, penghargaan, akreditasi, endorsement pemerintah, atau sertifikasi yang tidak disebut di atas, jawab: "${answerTemplates.unsure}"`,
    `- Jangan gunakan kata "sepertinya", "mungkin", atau membuat perkiraan sebagai fakta.`,
    `- Jangan menyebut alamat lengkap, nomor HP, atau email pribadi siapa pun — cukup "${company.location}".`,
    ``,
    `### Gaya`,
    `- Bahasa Indonesia yang baik dan benar (default untuk semua pengguna).`,
    `- Confident, faktual, ringkas, transparan, profesional.`,
    `- Jangan gunakan klaim wow seperti "terbaik", "nomor satu", "terbesar", "paling lengkap", "revolusioner", "10x", atau "satu-satunya".`,
    `- Sebut ${brand.studentTerm} (murid/${brand.studentTerm}s) secara konsisten sebagai "${brand.studentTerm}" — jangan berganti-ganti dengan "siswa" atau "student" dalam jawaban untuk pengguna.`,
  ].join("\n");
}