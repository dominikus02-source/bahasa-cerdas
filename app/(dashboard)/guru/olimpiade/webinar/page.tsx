import { Card } from "@/components/ui/card";
import { Video, Calendar, Bell } from "lucide-react";

export default function GuruOlimpiadeWebinarPage() {
  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <a href="/guru/olimpiade" className="hover:underline">Kalender Kegiatan</a>
          <span>/</span>
          <span>Webinar & Seminar</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Webinar & Seminar</h1>
        <p className="mt-1 text-sm text-gray-600">Jadwal webinar dan seminar pendidikan bahasa Indonesia</p>
      </div>

      <Card className="p-12 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <Bell className="w-10 h-10 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Webinar</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Webinar dan seminar akan diumumkan melalui pengumuman resmi BahasaCerdas. Pantau terus info terbaru di halaman ini.
        </p>
      </Card>
    </div>
  );
}