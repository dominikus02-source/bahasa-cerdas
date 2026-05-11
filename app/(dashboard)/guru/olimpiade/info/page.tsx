import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Calendar, MapPin, Gift, Users } from "lucide-react";

export default function InfoLombaPage() {
  const lombas = [
    {
      title: "Olimpiade Bahasa Indonesia Nasional 2025",
      level: "Nasional",
      date: "15 Juni 2025",
      deadline: "31 Mei 2025",
      location: "Online",
      prize: "Rp 10.000.000",
      participants: 1245,
      status: "OPEN",
      desc: "Olimpiade bahasa Indonesia tingkat nasional untuk siswa SMA/SMK",
    },
    {
      title: "Lomba Menulis Kreatif",
      level: "Provinsi",
      date: "20 Juli 2025",
      deadline: "15 Juni 2025",
      location: "Bandung",
      prize: "Rp 5.000.000",
      participants: 432,
      status: "UPCOMING",
      desc: "Lomba menulis cerpen dan puisi untuk jenjang SMP",
    },
    {
      title: "Festival Debat Bahasa Indonesia",
      level: "Nasional",
      date: "1 Agustus 2025",
      deadline: "20 Juli 2025",
      location: "Jakarta",
      prize: "Rp 15.000.000",
      participants: 89,
      status: "UPCOMING",
      desc: "Festival debat untuk guru dan mahasiswa",
    },
  ];

  const statusColors: Record<string, string> = {
    OPEN: "bg-emerald-100 text-emerald-700",
    UPCOMING: "bg-blue-100 text-blue-700",
    CLOSED: "bg-gray-100 text-gray-600",
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Info Lomba</h1>
        <p className="mt-1 text-sm text-gray-600">Daftar lomba bahasa Indonesia yang tersedia</p>
      </div>

      <div className="space-y-4">
        {lombas.map((lomba, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center shrink-0">
                <Trophy className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">{lomba.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[lomba.status]}`}>
                    {lomba.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{lomba.desc}</p>
                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {lomba.date}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {lomba.location}</span>
                  <span className="flex items-center gap-1"><Gift className="h-3 w-3" /> {lomba.prize}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {lomba.participants} peserta</span>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Button size="sm">Daftar Sekarang</Button>
                  <span className="text-xs text-gray-500">Batas: {lomba.deadline}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}