import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, Clock } from "lucide-react";

export default function TugaskuPage() {
  const tugasList = [
    { title: "Latihan Sinonim & Antonim", soal: 20, xp: 150, deadline: "Hari ini, 23:59", status: "available" },
    { title: "Pilihan Ganda: Teks Negosiasi", soal: 15, xp: 100, deadline: "Besok, 23:59", status: "available" },
    { title: "Essay: Struktur Teks", soal: 5, xp: 200, deadline: "3 hari lagi", status: "available" },
    { title: "Latihan HOTS", soal: 10, xp: 250, deadline: "Selesai", status: "completed" },
    { title: "Kuis: Bahasa Baku", soal: 25, xp: 180, deadline: "Selesai", status: "completed" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Tugasku</h1>
        <p className="mt-1 text-sm text-gray-600">Latihan dan tugas dari gurumu</p>
      </div>

      <div className="space-y-4">
        {tugasList.map((tugas, i) => (
          <Card key={i} className={`p-5 ${tugas.status === "completed" ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${tugas.status === "completed" ? "bg-emerald-100" : "bg-blue-100"}`}>
                {tugas.status === "completed" ? (
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                ) : (
                  <BookOpen className="h-6 w-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{tugas.title}</h3>
                  <Badge variant={tugas.status === "completed" ? "success" : "secondary"} className="text-[10px]">
                    {tugas.status === "completed" ? "Selesai" : "Tersedia"}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                  <span>{tugas.soal} soal</span>
                  <span>•</span>
                  <span>+{tugas.xp} XP</span>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {tugas.deadline}
                </div>
              </div>
              {tugas.status !== "completed" && (
                <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                  Mulai
                </button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}