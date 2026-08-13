import { Megaphone } from "lucide-react";
import { getUser } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import MuridPengumumanList from "@/components/pengumuman/MuridPengumumanList";

export default async function MuridPengumumanPage() {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }
  if (user.role !== "MURID" && !user.isFounder) {
    redirect("/guru/beranda");
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-200">
            <Megaphone className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-slate-100">Papan Pengumuman</h1>
            <p className="text-xs text-gray-500 dark:text-slate-400">Tugas &amp; pengumuman dari gurumu</p>
          </div>
        </div>
      </div>

      <MuridPengumumanList userId={user.id} />
    </div>
  );
}
