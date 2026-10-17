import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { dashboardForUser } from "@/lib/auth/redirect";

// Fase 1: belum ada daftar ruang. Ruang dimulai dari halaman kelas.
export default async function JumpaIndex() {
  const user = await getUser();
  if (!user) redirect("/login?next=/jumpa");
  redirect(user.role === "GURU" || user.isFounder ? "/guru/kelasku" : dashboardForUser(user.role, user.isFounder));
}
