import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Trophy } from "lucide-react";

const now = new Date();
const tahun = now.getFullYear();
const events = [
  { month: `Juli ${tahun}`, items: [
    { date: `${now.getDate()}`, name: "Kegiatan Hari Ini", type: "Aktif", level: "BahasaCerdas" },
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