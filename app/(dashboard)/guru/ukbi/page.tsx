import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export default async function GuruUKBIPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">UKBI untuk Guru</h1>
      <p className="mt-1 text-sm text-gray-600">Latihan UKBI khusus untuk persiapan sertifikasi guru</p>
      <div className="mt-8 text-center py-16 text-gray-400">
        Fitur dalam pengembangan
      </div>
    </div>
  );
}