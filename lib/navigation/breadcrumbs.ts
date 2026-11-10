import routes from "./breadcrumb-routes.json";
export type BreadcrumbItem={label:string;href?:string};
const labels:Record<string,string>={
 guru:"Dasbor guru",murid:"Dasbor murid",admin:"Administrasi",arena:"Arena",umum:"Dasbor umum",beranda:"Beranda",
 login:"Masuk",register:"Daftar",onboarding:"Lengkapi profil",confirm:"Konfirmasi",auth:"Akun","reset-password":"Atur ulang kata sandi","verify-email":"Verifikasi email","akses-ditolak":"Akses ditolak","pilih-peran":"Pilih peran",
 game:"Permainan",new:"Buat baru",edit:"Ubah",results:"Hasil",result:"Hasil",take:"Kerjakan",assign:"Bagikan","device-check":"Periksa perangkat",
 profile:"Profil",player:"Pemain",feed:"Karya",chat:"Obrolan",league:"Liga",history:"Riwayat",achievements:"Pencapaian",achievement:"Pencapaian",badges:"Lencana",skills:"Keterampilan",notifications:"Notifikasi",
 "adaptive-practice":"Latihan adaptif",diagnostic:"Diagnostik",preview:"Pratinjau",lesson:"Belajar",lobby:"Lobi",play:"Bermain",agent:"Pusat agen",approvals:"Persetujuan",tasks:"Tugas",telegram:"Telegram",analytics:"Analitik",
 "ai-analytics":"Analitik AI","ai-quota":"Kuota AI","feature-usage":"Penggunaan fitur","data-center":"Pusat data",executive:"Ringkasan eksekutif",founder:"Pendiri",keuangan:"Keuangan",payments:"Pembayaran",withdrawals:"Penarikan","teacher-payouts":"Pencairan guru","teacher-risk":"Risiko guru","buku-kas":"Buku kas",users:"Pengguna","generate-ppt":"Buat presentasi",
 "ai-tools":"Alat AI",eyd:"Perbaikan ejaan",feedback:"Umpan balik",grading:"Penilaian","text-analysis":"Analisis teks",competency:"Kompetensi",gradebook:"Buku nilai",cart:"Keranjang",checkout:"Pembayaran",orders:"Pesanan",payment:"Pembayaran",finish:"Selesai",
 marketplace:"Toko karya",jumpa:"Jumpa",junior:"Arena Junior",t:"Undangan",ruang:"Ruang",kelas:"Kelas",novel:"Novel","ai-bc":"AI Bahasa Cerdas","bank-soal":"Bank soal","bank-soal-tka":"Bank soal TKA","bank-soal-ukbi":"Bank soal UKBI","rpp-modul":"Rencana pembelajaran","tka-guru":"Diagnostik TKA guru","tka-utbk":"TKA dan UTBK",bigt:"BIGT",ukbi:"UKBI",tka:"TKA",
 kelasku:"Kelas saya",tugasku:"Tugas saya",progresku:"Progres saya","panduan-guru":"Buku panduan","aku-sastrawan":"Aku Sastrawan","jalur-cerdas":"Jalur Cerdas","main-bersama":"Main Bersama","video-belajar":"Video belajar",faq:"Pertanyaan umum"
};
const homes:Record<string,string>={guru:"/guru/beranda",murid:"/murid/beranda",admin:"/admin",arena:"/arena",umum:"/umum"};
function title(segment:string){return labels[segment]||segment.split("-").map(word=>["ai","ukbi","tka","utbk","rpp","mgmp"].includes(word)?word.toUpperCase():word.charAt(0).toUpperCase()+word.slice(1)).join(" ");}
export function matchesBreadcrumbRoute(pattern:string,parts:string[]){
 const tokens=pattern.split("/").filter(Boolean);
 return tokens.length===parts.length&&tokens.every((token,index)=>token.startsWith("[")||token===parts[index]);
}
export function pageBreadcrumbs(pathname:string,heading=""):BreadcrumbItem[]{
 const parts=pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
 if(!parts.length)return [{label:"Beranda"}];
 const pattern=routes.filter(route=>matchesBreadcrumbRoute(route,parts)).sort((a,b)=>a.split("[").length-b.split("[").length)[0];
 if(!pattern)return [{label:"Beranda",href:"/"},{label:"Halaman"}];
 const tokens=pattern.split("/").filter(Boolean),items:BreadcrumbItem[]=[{label:"Beranda",href:"/"}];
 for(let i=0;i<parts.length;i++){
  if(i===1&&parts[i]==="beranda"&&homes[parts[0]])continue;
  const current=i===parts.length-1,dynamic=tokens[i].startsWith("[");
  const base="/"+parts.slice(0,i+1).join("/");
  const isPage=routes.some(route=>matchesBreadcrumbRoute(route,parts.slice(0,i+1)));
  const href=homes[base.slice(1)]||(isPage?base:undefined);
  const parent=parts[i-1]||"halaman";
  let label=dynamic?(parent==="t"?"Undangan":"Detail "+title(parent).toLowerCase()):title(parts[i]);
  if(dynamic&&current&&heading&&!/^(memuat|loading)/i.test(heading))label=heading.slice(0,180);
  items.push({label,href:current?undefined:href});
 }
 delete items[items.length-1].href;
 return items;
}
