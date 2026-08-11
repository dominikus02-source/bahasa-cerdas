import { redirect } from "next/navigation";

// AI Tutor (legacy) sudah digantikan oleh AI Cerdik di /arena/ai (canonical
// pengalaman AI murid). Halaman ini tidak memiliki tautan masuk dan API-nya
// sama (/api/ai/chat), jadi cukup diarahkan ke canonical.
export default function MuridAIRedirect() {
  redirect("/arena/ai");
}
