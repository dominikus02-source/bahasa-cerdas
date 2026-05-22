import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { checkAIQuota, recordAIUsage } from "@/lib/premium";

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const quota = await checkAIQuota(user, "rpp");
    if (!quota.allowed) {
      return NextResponse.json({ error: "QUOTA_EXCEEDED", used: quota.used, limit: quota.limit }, { status: 429 });
    }

    const body = await req.json();
    const { kd, kelas, topik, alokasi, metode, curriculum, schoolName, teacherName, semester } = body;

    const curriculumLabels: Record<string, string> = { K13: "Kurikulum 2013", MERDEKA: "Kurikulum Merdeka", MERDEKA_DL: "Kurikulum Merdeka Deep Learning" };
    const currLabel = curriculumLabels[curriculum] || "Kurikulum Merdeka";

    const fase = parseInt(kelas || "10") <= 6 ? (parseInt(kelas || "10") <= 2 ? "A" : parseInt(kelas || "10") <= 4 ? "B" : "C") : (parseInt(kelas || "10") <= 9 ? "D" : (parseInt(kelas || "10") === 10 ? "E" : "F"));

    const curriculumSpecific = curriculum === "K13" ? `
RPP K13 — komponen: KI-1/2/3/4, KD, IPK (min 3 per KD), tujuan (format ABCD), materi pokok + uraian, kegiatan: pendahuluan (10-15'), inti (5M saintifik: mengamati, menanya, mengumpulkan, mengasosiasi, mengomunikasikan), penutup (10-15'), penilaian (sikap/pengetahuan/keterampilan), media/alat/sumber` : curriculum === "MERDEKA" ? `
Modul Ajar Merdeka — komponen: informasi umum (identitas, kompetensi awal, profil pelajar Pancasila min 2 dimensi, sarana, target, model), komponen inti (CP, tujuan min 3, pemahaman bermakna, pertanyaan pemantik, kegiatan: pendahuluan-inti-penutup, asesmen: diagnostik-formatif-sumatif), lampiran (LKPD, pengayaan, bahan bacaan, glosarium, daftar pustaka)` : `
Modul Ajar Deep Learning — komponen: informasi umum (identitas, kompetensi awal, profil pelajar Pancasila min 3 dimensi, sarana, target, model), komponen inti (CP, tujuan bermakna, pemahaman bermakna, pertanyaan pemantik HOTS, kegiatan: aktivasi-eksplorasi-elaborasi&diferensiasi-kreasi&kolaborasi-refleksi metakognitif, asesmen autentik), lampiran (LKPD, pengayaan, bahan bacaan, glosarium, daftar pustaka)`;

    const k = kelas || "X", t = topik || "Teks Negosiasi", m = metode || "Diskusi, ceramah, penugasan";

    const prompt = `Buat ${curriculum === "K13" ? "RPP" : "Modul Ajar"} Bhs Indonesia:
Kurikulum: ${currLabel}
Kelas: ${k}
Semester: ${semester || "1 (Ganjil)"}
KD: ${kd || "3.1 Menganalisis struktur dan kebahasaan teks negosiasi"}
Topik: ${t}
Alokasi: ${alokasi || "2x40 menit"}
Metode: ${m}
${schoolName ? `Sekolah: ${schoolName}` : ""}${teacherName ? `\nGuru: ${teacherName}` : ""}

${curriculumSpecific}

Output JSON SAJA tanpa markdown:
${curriculum === "K13" ? JSON.stringify({
  title: `RPP Bhs Indo Kelas ${k} - ${t}`,
  ki1: "KI-1", ki2: "KI-2", ki3: "KI-3", ki4: "KI-4",
  kdPengetahuan: `KD 3.x ${t}`, kdKeterampilan: `KD 4.x ${t}`,
  ipkPengetahuan: [], ipkKeterampilan: [],
  tujuanPembelajaran: [], materiPokok: t, uraianMateri: "",
  kegiatanPendahuluan: [], kegiatanIntiMengamati: "", kegiatanIntiMenanya: "", kegiatanIntiMengumpulkan: "", kegiatanIntiMengasosiasi: "", kegiatanIntiMengomunikasikan: "",
  kegiatanPenutup: [], penilaianSikap: "", penilaianPengetahuan: "", penilaianKeterampilan: "",
  media: "", alat: "", sumberBelajar: ""
}) : curriculum === "MERDEKA" ? JSON.stringify({
  title: `Modul Ajar Bhs Indo Kelas ${k} - ${t}`,
  fase: `Fase ${fase}`, kompetensiAwal: "", profilPelajarPancasila: [],
  saranaPrasarana: "", targetPesertaDidik: "", modelPembelajaran: m,
  capaianPembelajaran: "", tujuanPembelajaran: [], pemahamanBermakna: "",
  pertanyaanPemantik: [], kegiatanPendahuluan: [], kegiatanInti: [], kegiatanPenutup: [],
  asesmenDiagnostik: "", asesmenFormatif: "", asesmenSumatif: "",
  lkpd: "", pengayaanRemedial: "", bahanBacaan: "",
  glosarium: {}, daftarPustaka: ""
}) : JSON.stringify({
  title: `Modul Ajar Deep Learning Bhs Indo Kelas ${k} - ${t}`,
  fase: `Fase ${fase}`, kompetensiAwal: "", profilPelajarPancasila: [],
  saranaPrasarana: "", targetPesertaDidik: "", modelPembelajaran: "Deep Learning",
  capaianPembelajaran: "", tujuanPembelajaranBermakna: [], pemahamanBermakna: "",
  pertanyaanPemantik: [], aktivasiPengetahuan: [], eksplorasiMendalam: [],
  elaborasiDiferensiasi: {}, kreasiKolaborasi: [], refleksiMetakognitif: [],
  asesmenDiagnostik: "", asesmenFormatif: "", asesmenSumatif: "", rubrikPenilaian: "",
  lkpd: "", pengayaanRemedial: "", bahanBacaan: "",
  glosarium: {}, daftarPustaka: ""
})}

Isi semua field untuk topik "${t}" dan kelas ${k}. Gunakan Bahasa Indonesia.`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const GROQ_API_KEY = process.env.GROQ_API_KEY;

    let content = "";
    let tokens = 0;
    const errors: string[] = [];

    if (GROQ_API_KEY) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${GROQ_API_KEY}` },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 4000,
            temperature: 0.7,
          }),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`Groq: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) tokens = content.length;
        }
      } catch (e: any) { errors.push(`Groq: ${e.message}`); }
    } else {
      errors.push("Groq: No API key");
    }

    if (!content && GEMINI_API_KEY) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": GEMINI_API_KEY },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 8000 },
          }),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`Gemini: ${json.error.message || json.error}`);
        } else {
          content = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (content) tokens = content.length;
        }
      } catch (e: any) { errors.push(`Gemini: ${e.message}`); }
    } else if (!content) {
      errors.push("Gemini: No API key");
    }

    if (!content && OPENAI_API_KEY) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 8000,
            temperature: 0.7,
          }),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`OpenAI: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) tokens = json.usage?.total_tokens || 0;
        }
      } catch (e: any) { errors.push(`OpenAI: ${e.message}`); }
    } else if (!content) {
      errors.push("OpenAI: No API key");
    }

    if (!content && DEEPSEEK_API_KEY) {
      try {
        const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [{ role: "user", content: prompt }],
            max_tokens: 8000,
            temperature: 0.7,
          }),
        });
        const json = await res.json();
        if (json.error) {
          errors.push(`DeepSeek: ${json.error.message || json.error}`);
        } else {
          content = json.choices?.[0]?.message?.content || "";
          if (content) tokens = json.usage?.total_tokens || 0;
        }
      } catch (e: any) { errors.push(`DeepSeek: ${e.message}`); }
    } else if (!content) {
      errors.push("DeepSeek: No API key");
    }

    if (!content) {
      console.error("All AI providers failed:", errors);
      return NextResponse.json({ error: `Semua AI provider gagal: ${errors.join("; ")}. Tambahkan GROQ_API_KEY (gratis di console.groq.com).` }, { status: 500 });
    }

    let rpp = content;
    if (rpp.includes("```json")) {
      rpp = rpp.replace(/```json\n?/g, "").replace(/\n?```/g, "");
    }

    const costUSD = (tokens / 1_000_000) * 0.5;
    await recordAIUsage(user.id, "rpp_generator", tokens, costUSD);

    try {
      return NextResponse.json({ rpp: JSON.parse(rpp) });
    } catch {
      return NextResponse.json({ rpp: { title: topik || "RPP Bahasa Indonesia", description: rpp } });
    }
  } catch (error) {
    console.error("AI RPP error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
