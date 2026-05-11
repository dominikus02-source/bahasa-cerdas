import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trophy } from "lucide-react";

const events = [
  { month: "Juni 2025", items: [
    { date: "15", name: "Olimpiade Bahasa Nasional", type: "Olimpiade", level: "Nasional" },
    { date: "20", name: "Seminar Metodologi Bahasa", type: "Seminar", level: "Online" },
    { date: "28", name: "Lomba Pidato Antar Sekolah", type: "Lomba", level: "Kabupaten" },
  ]},
  { month: "Juli 2025", items: [
    { date: "5", name: "Workshop Penulisan Ilmiah", type: "Workshop", level: "Online" },
    { date: "20", name: "Lomba Menulis Kreatif", type: "Lomba", level: "Provinsi" },
    { date: "25", name: "UTBK Bahasa Indonesia", type: "Ujian", level: "Nasional" },
  ]},
  { month: "Agustus 2025", items: [
    { date: "1", name: "Festival Debat Bahasa", type: "Festival", level: "Nasional" },
    { date: "10", name: "UKBI Guru", type: "Sertifikasi", level: "Nasional" },
    { date: "20", name: "LombaPuisi Antar SMA", type: "Lomba", level: "Nasional" },
  ]},
];

export default function KalenderEventPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Kalender Event</h1>
        <p className="mt-1 text-sm text-gray-600">Jadwal lomba dan event sepanjang tahun</p>
      </div>

      <div className="space-y-8">
        {events.map((month) => (
          <div key={month.month}>
            <h2 className="font-bold text-lg mb-4">{month.month}</h2>
            <div className="space-y-3">
              {month.items.map((event, i) => (
                <Card key={i} className="p-4 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl bg-blue-50 flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-blue-600">{event.date}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{event.name}</h3>
                      <Badge variant="secondary" className="text-[10px]">{event.type}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">{event.level}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}