import type { UnitSoal } from "./types";

const BS: ["Benar", "Salah"] = ["Benar", "Salah"];

const level06: UnitSoal[] = [
  { level: 6, title: "Subjek dan Predikat", soal: [
    { id: "u31f", tipe: "pilihan_ganda", soal: "Subjek kalimat 'Burung berkicau di pohon' adalah ...", opsi: ["Burung", "berkicau", "di pohon", "pohon"], jawaban: 0, penjelasan: "Yang dibicarakan atau melakukan tindakan adalah 'Burung'." },
    { id: "u31g", tipe: "pilihan_ganda", soal: "Predikat kalimat 'Mereka bermain di lapangan' adalah ...", opsi: ["Mereka", "bermain", "di lapangan", "lapangan"], jawaban: 1, penjelasan: "Predikat adalah tindakan yang dilakukan subjek, yaitu 'bermain'." },
    { id: "u31h", tipe: "pilihan_ganda", soal: "Kalimat yang subjeknya 'Kami' adalah ...", opsi: ["Kami belajar di kelas.", "Belajar di kelas.", "Di kelas belajar.", "Mereka belajar di kelas."], jawaban: 0, penjelasan: "Hanya 'Kami belajar di kelas' yang subjeknya 'Kami'." },
    { id: "u31i", tipe: "benar_salah", soal: "Dalam kalimat 'Siti menulis puisi', kata 'menulis' adalah predikat.", opsi: BS, jawaban: "Benar", penjelasan: "'Menulis' adalah tindakan yang dilakukan subjek Siti, jadi itulah predikatnya." },
    { id: "u31j", tipe: "isi_blank", soal: "Kata yang menjadi pokok pembicaraan dalam kalimat disebut ...", jawaban: "Subjek", penjelasan: "Subjek adalah pelaku atau pokok yang dibicarakan dalam kalimat." },
  ]},
  { level: 6, title: "Objek dan Keterangan", soal: [
    { id: "u32f", tipe: "pilihan_ganda", soal: "Objek kalimat 'Kakak mengecat pagar' adalah ...", opsi: ["Kakak", "mengecat", "pagar", "dengan pagar"], jawaban: 2, penjelasan: "Yang dikenai tindakan mengecat adalah 'pagar'." },
    { id: "u32g", tipe: "pilihan_ganda", soal: "Keterangan CARA terdapat pada kalimat ...", opsi: ["Ia menulis dengan rapi.", "Mereka pergi ke pasar.", "Dia bangun pukul lima.", "Buku itu di atas meja."], jawaban: 0, penjelasan: "'Dengan rapi' menerangkan cara menulis, jadi itulah keterangan cara." },
    { id: "u32h", tipe: "pilihan_ganda", soal: "Kalimat yang memiliki objek adalah ...", opsi: ["Rina menendang batu.", "Rina tertidur.", "Kami berlari.", "Bunga itu indah."], jawaban: 0, penjelasan: "Hanya 'Rina menendang batu' yang punya objek, yaitu 'batu'." },
    { id: "u32i", tipe: "benar_salah", soal: "Dalam kalimat 'Ayah membaca koran di beranda', objeknya adalah 'koran'.", opsi: BS, jawaban: "Benar", penjelasan: "Yang dibaca atau dikenai tindakan adalah 'koran'." },
    { id: "u32j", tipe: "isi_blank", soal: "Kalimat 'Mereka bermain di taman' memiliki keterangan ...", jawaban: "tempat", penjelasan: "'Di taman' menunjukkan keterangan tempat." },
  ]},
  { level: 6, title: "Kalimat Efektif", soal: [
    { id: "u33f", tipe: "pilihan_ganda", soal: "Kalimat yang paling efektif adalah ...", opsi: ["Para tamu duduk.", "Para tamu-tamu duduk.", "Banyak para tamu datang.", "Tamu-tamu para duduk."], jawaban: 0, penjelasan: "'Para' sudah menyatakan banyak, jadi tidak perlu bentuk ganda atau kata 'banyak'." },
    { id: "u33g", tipe: "pilihan_ganda", soal: "Perbaikan kalimat 'Doni sangat pandai sekali' adalah ...", opsi: ["Doni pandai sekali.", "Doni sangat pandai sekali.", "Doni sangat sangat pandai.", "Doni pandai sekali sekali."], jawaban: 0, penjelasan: "'Sangat' dan 'sekali' searti, cukup memakai salah satu saja." },
    { id: "u33h", tipe: "pilihan_ganda", soal: "Kalimat yang paling efektif adalah ...", opsi: ["Ani menulis surat.", "Ani adalah menulis surat.", "Menulis surat Ani.", "Ani menulis menulis surat."], jawaban: 0, penjelasan: "'Ani menulis surat' ringkas, logis, dan berpola S-P-O yang benar." },
    { id: "u33i", tipe: "benar_salah", soal: "Kalimat 'Mereka saling tolong-menolong' boros kata.", opsi: BS, jawaban: "Benar", penjelasan: "'Tolong-menolong' sudah berarti saling, cukup ditulis 'mereka tolong-menolong'." },
    { id: "u33j", tipe: "isi_blank", soal: "Hematkan: 'turun ke bawah' cukup ditulis ...", jawaban: "turun", penjelasan: "'Turun' sudah berarti bergerak ke bawah, jadi 'ke bawah' tidak perlu ditambah." },
  ]},
  { level: 6, title: "Kalimat Tidak Efektif", soal: [
    { id: "u34f", tipe: "pilihan_ganda", soal: "Kalimat yang TIDAK efektif adalah ...", opsi: ["Semua anak-anak semua bermain.", "Mereka bermain di taman.", "Buku itu dibaca Andi.", "Ibu memasak nasi."], jawaban: 0, penjelasan: "'Semua' diulang dua kali dan 'anak-anak' dengan 'semua' tumpang tindih maknanya." },
    { id: "u34g", tipe: "pilihan_ganda", soal: "Kesalahan kalimat 'Pukul 07.00 pagi' adalah ...", opsi: ["memakai dua keterangan waktu yang searti", "subjeknya ganda", "tidak memiliki predikat", "terlalu banyak kata benda"], jawaban: 0, penjelasan: "'Pukul 07.00' sudah menyatakan waktu, jadi kata 'pagi' tidak perlu ditambahkan." },
    { id: "u34h", tipe: "pilihan_ganda", soal: "Ungkapan 'sangat amat besar' termasuk ...", opsi: ["pemborosan kata", "kalimat efektif", "kalimat lengkap", "kalimat berobjek"], jawaban: 0, penjelasan: "'Sangat' dan 'amat' searti, cukup memakai salah satu saja." },
    { id: "u34i", tipe: "benar_salah", soal: "Kalimat 'Para murid-murid masuk kelas' boros kata.", opsi: BS, jawaban: "Benar", penjelasan: "'Para' dan bentuk ganda 'murid-murid' tidak perlu dipakai bersamaan." },
    { id: "u34j", tipe: "isi_blank", soal: "Hematkan: 'sangat panas sekali' cukup ditulis 'sangat ...' atau 'panas sekali'.", jawaban: "panas", penjelasan: "Pilih salah satu antara 'sangat panas' atau 'panas sekali', tidak keduanya." },
  ]},
  { level: 6, title: "Memperbaiki Kalimat", soal: [
    { id: "u35f", tipe: "pilihan_ganda", soal: "Susunan kata yang paling baik dari 'duduk – kakek – kursi – di – sedang' adalah ...", opsi: ["Kakek sedang duduk di kursi.", "Kakek duduk sedang di kursi.", "Di kursi kakek sedang duduk.", "Duduk kakek sedang di kursi."], jawaban: 0, penjelasan: "Urutan baku S-P-Ket yang benar adalah 'Kakek sedang duduk di kursi'." },
    { id: "u35g", tipe: "pilihan_ganda", soal: "Kalimat yang sudah baku adalah ...", opsi: ["Adik pergi ke sekolah.", "Adik pergi sekolah.", "Sekolah adik pergi.", "Pergi adik ke sekolah."], jawaban: 0, penjelasan: "Tujuan arah memakai kata depan 'ke' sehingga 'Adik pergi ke sekolah' sudah baku." },
    { id: "u35h", tipe: "pilihan_ganda", soal: "Perbaikan terbaik untuk 'Banyak siswa-siswa di kelas itu' adalah ...", opsi: ["Banyak siswa di kelas itu.", "Banyak siswa-siswa di kelas itu.", "Siswa banyak di kelas itu.", "Di kelas itu banyak banyak siswa."], jawaban: 0, penjelasan: "Bentuk ganda 'siswa-siswa' dihilangkan karena kata 'banyak' sudah cukup." },
    { id: "u35i", tipe: "benar_salah", soal: "Kalimat 'Kami pulang ke rumah' sudah baku.", opsi: BS, jawaban: "Benar", penjelasan: "Kata depan 'ke' dipakai dengan benar untuk menyatakan arah tujuan." },
    { id: "u35j", tipe: "isi_blank", soal: "Lengkapi agar baku: 'Ayah pergi ... kantor.'", jawaban: "ke", penjelasan: "Tujuan arah memakai kata depan 'ke', jadi ditulis 'Ayah pergi ke kantor'." },
  ]},
  { level: 6, title: "Latihan Cepat Level 6", soal: [
    { id: "u36f", tipe: "pilihan_ganda", soal: "Subjek kalimat 'Di kelas, murid-murid membaca buku' adalah ...", opsi: ["Di kelas", "murid-murid", "membaca", "buku"], jawaban: 1, penjelasan: "Yang melakukan tindakan membaca adalah 'murid-murid'." },
    { id: "u36g", tipe: "pilihan_ganda", soal: "Kalimat yang paling efektif adalah ...", opsi: ["Kami bermain di halaman.", "Kami saling bermain bersama di halaman.", "Kami bermain bermain di halaman.", "Di halaman kami saling bermain bersama-sama."], jawaban: 0, penjelasan: "'Kami bermain di halaman' hemat dan jelas; kata 'saling' tidak tepat untuk 'bermain'." },
    { id: "u36h", tipe: "pilihan_ganda", soal: "Objek kalimat 'Kakek minum teh di teras' adalah ...", opsi: ["Kakek", "minum", "teh", "di teras"], jawaban: 2, penjelasan: "Yang dikenai tindakan minum adalah 'teh'." },
    { id: "u36i", tipe: "benar_salah", soal: "Dalam kalimat 'Dia pergi ke pasar', 'ke pasar' adalah keterangan tempat.", opsi: BS, jawaban: "Benar", penjelasan: "'Ke pasar' menunjukkan tempat tujuan, jadi itulah keterangan tempat." },
    { id: "u36j", tipe: "isi_blank", soal: "Kalimat 'Guru menjelaskan materi' berpola S-P-...", jawaban: "O", penjelasan: "'Materi' adalah objek yang dijelaskan, jadi polanya S-P-O." },
  ]},
];

export default level06;
