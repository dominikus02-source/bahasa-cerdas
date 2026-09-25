export interface TeacherQuote {
  text: string;
  source: string;
}

export interface TeacherTip {
  title: string;
  body: string;
}

const WEEKLY_QUOTES: TeacherQuote[] = [
  {
    text: "Pertanyaan yang baik membuka ruang berpikir lebih luas daripada jawaban yang terburu-buru.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Kelas yang hidup bukan kelas yang selalu ramai, tetapi kelas tempat setiap siswa berani berpikir.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Satu kegiatan belajar yang bermakna dapat tinggal lebih lama daripada banyak halaman yang dihafal.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Guru memberi arah; rasa ingin tahu siswa yang membuat perjalanan belajar terus bergerak.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Literasi tumbuh ketika siswa diberi alasan untuk membaca, ruang untuk berbicara, dan kesempatan untuk berkarya.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Pembelajaran yang baik membuat siswa merasa aman untuk mencoba, salah, memperbaiki, lalu mencoba lagi.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Teknologi paling berguna ketika membuat guru punya lebih banyak waktu untuk hadir bagi siswanya.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Kemajuan kecil yang konsisten lebih kuat daripada perubahan besar yang hanya bertahan sehari.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Karya siswa menjadi bermakna ketika mereka tahu ada seseorang yang sungguh membaca dan menghargainya.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Mengajar adalah merancang kesempatan agar setiap siswa menemukan cara terbaiknya untuk memahami.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Kelas yang kuat memberi tempat bagi rasa ingin tahu, kerja sama, dan keberanian untuk bertanya.",
    source: "Catatan BahasaCerdas",
  },
  {
    text: "Hal sederhana yang dilakukan dengan konsisten sering menjadi kebiasaan belajar yang paling berharga.",
    source: "Catatan BahasaCerdas",
  },
];

const DAILY_TIPS: TeacherTip[] = [
  {
    title: "Mulai dengan satu pertanyaan",
    body: "Buka pelajaran dengan pertanyaan yang dekat dengan pengalaman siswa sebelum masuk ke konsep.",
  },
  {
    title: "Tutup dengan satu refleksi",
    body: "Sisakan dua menit agar siswa menulis satu hal yang dipahami dan satu hal yang masih ingin ditanyakan.",
  },
  {
    title: "Beri pilihan cara menjawab",
    body: "Sesekali izinkan siswa merespons lewat tulisan singkat, diskusi, atau karya visual.",
  },
  {
    title: "Gunakan jeda berpikir",
    body: "Setelah bertanya, beri beberapa detik sebelum menunjuk siswa agar lebih banyak anak sempat memproses.",
  },
  {
    title: "Apresiasi prosesnya",
    body: "Sorot strategi, keberanian mencoba, atau perbaikan siswa—bukan hanya jawaban akhirnya.",
  },
  {
    title: "Buat tujuan terlihat",
    body: "Tulis satu tujuan belajar yang sederhana agar siswa tahu apa yang perlu mereka capai hari ini.",
  },
  {
    title: "Akhiri dengan karya kecil",
    body: "Minta siswa menghasilkan satu kalimat, pertanyaan, atau contoh sebagai bukti pemahaman.",
  },
];

function jakartaDayNumber(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return Math.floor(Date.UTC(value("year"), value("month") - 1, value("day")) / 86_400_000);
}

export function getWeeklyTeacherQuote(date = new Date()): TeacherQuote {
  const weekNumber = Math.floor((jakartaDayNumber(date) + 3) / 7);
  return WEEKLY_QUOTES[((weekNumber % WEEKLY_QUOTES.length) + WEEKLY_QUOTES.length) % WEEKLY_QUOTES.length];
}

export function getDailyTeacherTip(date = new Date()): TeacherTip {
  const day = jakartaDayNumber(date);
  return DAILY_TIPS[((day % DAILY_TIPS.length) + DAILY_TIPS.length) % DAILY_TIPS.length];
}
