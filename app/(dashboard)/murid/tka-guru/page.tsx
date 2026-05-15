import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function MuridTKAGuruPage() {
  return (
    <div className="text-center py-20">
      <GraduationCap size={48} className="mx-auto text-gray-200 mb-4" />
      <h1 className="text-xl font-bold text-gray-900">TKA Guru</h1>
      <p className="text-sm text-gray-500 mt-2">Halaman ini khusus untuk guru. Murid bisa mengakses TKA UTBK.</p>
      <Link href="/murid/tka-utbk" className="mt-4 inline-block text-sm text-violet-600 font-semibold hover:underline">Buka TKA UTBK →</Link>
    </div>
  );
}
