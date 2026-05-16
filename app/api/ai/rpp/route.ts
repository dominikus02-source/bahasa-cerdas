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

    let curriculumSpecific = "";
    if (curriculum === "K13") {
      curriculumSpecific = `STRUKTUR K13:
- Identitas (Sekolah, Guru, NIP, Tahun Pelajaran)
- KI (Kompetensi Inti): KI-1 (Sikap Spiritual), KI-2 (Sikap Sosial), KI-3 (Pengetahuan), KI-4 (Keterampilan)
- KD (Kompetensi Dasar) sesuai input
- Indikator Pencapaian Kompetensi (IPK)
- Tujuan Pembelajaran
- Materi Pokok
- Kegiatan Pembelajaran: Pendahuluan (10-15 menit), Inti (mengamati, menanya, mengumpulkan informasi, mengasosiasi, mengkomunikasikan), Penutup (10-15 menit)
- Penilaian: Sikap (observasi), Pengetahuan (tes tertulis), Keterampilan (praktik/proyek)
- Media/Alat/Sumber Belajar`;
    } else if (curriculum === "MERDEKA") {
      curriculumSpecific = `STRUKTUR KURIKULUM MERDEKA:
- Informasi Umum: Nama Penyusun, Instansi, Tahun, Jenjang, Kelas, Alokasi Waktu
- Profil Pelajar Pancasila yang relevan
- Capaian Pembelajaran (CP)
- Tujuan Pembelajaran
- Pertanyaan Pemantik
- Kegiatan Pembelajaran: Pendahuluan, Inti, Penutup
- Asesmen: Diagnostik, Formatif, Sumatif
- Diferensiasi (konten, proses, produk)
- Media/Alat/Sumber Belajar
- Refleksi Guru & Siswa`;
    } else {
      curriculumSpecific = `STRUKTUR KURIKULUM MERDEKA DEEP LEARNING:
- Informasi Umum: Nama Penyusun, Instansi, Tahun, Jenjang, Kelas, Alokasi Waktu
- Profil Pelajar Pancasila yang relevan
- Capaian Pembelajaran (CP)
- Tujuan Pembelajaran Bermakna
- Pertanyaan Pemantik (open-ended,高阶思维)
- Kegiatan Pembelajaran Deep Learning:
  * Aktivasi pengetahuan awal & koneksi bermakna
  * Eksplorasi mendalam (inkuiri, investigasi)
  * Elaborasi & diferensiasi (konten, proses, produk sesuai kebutuhan siswa)
  * Kreasi & kolaborasi (proyek bermakna, pemecahan masalah nyata)
  * Refleksi metakognitif
- Asesmen Autentik: Diagnostik, Formatif, Sumatif, Portofolio
- Diferensiasi Komprehensif: Kesiapan, Minat, Profil Belajar
- Media/Alat/Sumber Belajar
- Refleksi Guru & Siswa`;
    }

    const prompt = `Buatkan ${curriculum === "K13" ? "RPP" : "Modul Ajar"} lengkap untuk mata pelajaran Bahasa Indonesia dengan detail berikut:

Kurikulum: ${currLabel}
Kelas: ${kelas || "X"}
Semester: ${semester || "1 (Ganjil)"}
KD/Kompetensi Dasar: ${kd || "3.1 Menganalisis struktur dan kebahasaan teks negosiasi"}
Topik/Materi: ${topik || "Teks Negosiasi"}
Alokasi Waktu: ${alokasi || "3 x 40 menit"}
Metode: ${metode || "Diskusi, ceramah, penugasan"}
${schoolName ? `Nama Sekolah: ${schoolName}` : ""}
${teacherName ? `Nama Guru: ${teacherName}` : ""}

PENTING — WAJIB MENGGUNAKAN DATA INPUT USER:
1. JUDUL harus mengandung topik "${topik || "Teks Negosiasi"}" dan kelas "${kelas || "X"}"
2. KOMPETENSI/CAPAIAN PEMBELAJARAN harus merujuk ke KD yang diberikan: "${kd || "3.1 Menganalisis struktur dan kebahasaan teks negosiasi"}"
3. LANGKAH PEMBELAJARAN harus spesifik untuk topik "${topik || "Teks Negosiasi"}" — sebutkan contoh teks, aktivitas, dan materi yang relevan dengan topik ini
4. PENILAIAN harus mengukur kompetensi dari KD yang diberikan
5. MATERI harus tentang "${topik || "Teks Negosiasi"}" — jangan gunakan topik lain
6. Semua konten harus sesuai untuk siswa kelas ${kelas || "X"} — gunakan bahasa dan contoh yang sesuai tingkat kelas ini
7. Jika semester "${semester || "1 (Ganjil)"}", sesuaikan materi dengan semester tersebut

${curriculumSpecific}

Format output JSON dengan struktur sesuai kurikulum di atas. Gunakan kunci:
{
  "title": "RPP/Modul Ajar Bahasa Indonesia Kelas ${kelas || "X"} - ${topik || "Teks Negosiasi"}",
  "description": "Deskripsi singkat yang menyebutkan topik dan kelas",
  "competency": "KI/KD/Capaian Pembelajaran yang MERUJUK LANGSUNG ke KD input user: ${kd || "3.1 Menganalisis struktur dan kebahasaan teks negosiasi"}",
  "indicators": ["Indikator 1 yang spesifik untuk topik ${topik || "Teks Negosiasi"}", "Indikator 2", ...],
  "learningSteps": [
    "Kegiatan Pendahuluan: ... (spesifik untuk topik ${topik || "Teks Negosiasi"}, kelas ${kelas || "X"})",
    "Kegiatan Inti: ... (spesifik untuk topik ${topik || "Teks Negosiasi"}, kelas ${kelas || "X"})",
    "Kegiatan Penutup: ... (spesifik untuk topik ${topik || "Teks Negosiasi"}, kelas ${kelas || "X"})"
  ],
  "assessment": "Teknik dan instrumen penilaian yang mengukur KD ${kd || "3.1"} tentang ${topik || "Teks Negosiasi"}",
  "differentiation": "Diferensiasi pembelajaran",
  "materials": "Materi dan sumber belajar tentang ${topik || "Teks Negosiasi"}",
  "references": "Referensi"
}

Buatkan dalam Bahasa Indonesia yang baik dan benar. PASTIKAN SEMUA KONTEN SPESIFIK UNTUK TOPIK DAN KELAS YANG DIMINTA. Hanya output JSON, tanpa markdown.`;

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

    let content = "";
    let tokens = 0;

    if (GEMINI_API_KEY) {
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
        content = json?.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (content) tokens = content.length;
      } catch (e) { console.error("Gemini error:", e); }
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
        content = json.choices?.[0]?.message?.content || "";
        if (content) tokens = json.usage?.total_tokens || 0;
      } catch (e) { console.error("OpenAI error:", e); }
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
        content = json.choices?.[0]?.message?.content || "";
        if (content) tokens = json.usage?.total_tokens || 0;
      } catch (e) { console.error("DeepSeek error:", e); }
    }

    if (!content) {
      return NextResponse.json({ error: "All AI providers failed" }, { status: 500 });
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
