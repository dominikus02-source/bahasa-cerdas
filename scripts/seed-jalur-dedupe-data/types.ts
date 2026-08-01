export type Soal =
  | { id: string; tipe: "pilihan_ganda"; soal: string; opsi: string[]; jawaban: number; penjelasan: string }
  | { id: string; tipe: "benar_salah"; soal: string; opsi: ["Benar", "Salah"]; jawaban: "Benar" | "Salah"; penjelasan: string }
  | { id: string; tipe: "isi_blank"; soal: string; jawaban: string; penjelasan: string };

export interface UnitSoal {
  level: number;
  title: string;
  soal: Soal[];
}
