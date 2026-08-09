import { redirect } from "next/navigation";

// Editor kuis tunggal ada di /guru/kuis/new?edit=<id> (mode "Ubah Kuis").
// Halaman ini tinggal meneruskan agar tombol "Ubah" di /guru/kuis tidak
// menuju rute yang hilang (404). Semua alur edit (load + PUT + publish)
// tetap memakai editor yang sama — tidak ada editor kedua.
export default async function EditKuisPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/guru/kuis/new?edit=${encodeURIComponent(id)}`);
}
