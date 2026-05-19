import { Card } from "@/components/ui/card";
import { Video, Calendar, Users, ArrowRight, Play } from "lucide-react";

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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Sample webinar cards - placeholder */}
        <Card className="p-6 hover:shadow-lg transition-shadow">
          <div className="h-40 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl mb-4 flex items-center justify-center">
            <Play className="w-12 h-12 text-white/80" />
          </div>
          <h3 className="font-bold text-gray-900">Webinar akan segera hadir</h3>
          <p className="text-sm text-gray-500 mt-2">Nantikan webinar menarik dari pakarnya bahasa Indonesia!</p>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
            <Calendar size={14} />
            <span>Segera</span>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow opacity-70">
          <div className="h-40 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl mb-4 flex items-center justify-center">
            <Video className="w-12 h-12 text-white/80" />
          </div>
          <h3 className="font-bold text-gray-900">Seminar Pendidikan</h3>
          <p className="text-sm text-gray-500 mt-2">Bergabung dengan seminar untuk guru bahasa Indonesia</p>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
            <Calendar size={14} />
            <span>Akan datang</span>
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-shadow opacity-70">
          <div className="h-40 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl mb-4 flex items-center justify-center">
            <Users className="w-12 h-12 text-white/80" />
          </div>
          <h3 className="font-bold text-gray-900">Workshop Terbaru</h3>
          <p className="text-sm text-gray-500 mt-2">Workshop kreativitas mengajar bahasa Indonesia</p>
          <div className="flex items-center gap-2 mt-4 text-xs text-gray-400">
            <Calendar size={14} />
            <span>Akan datang</span>
          </div>
        </Card>
      </div>

      <div className="mt-8 p-6 bg-gray-50 rounded-xl text-center">
        <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Belum ada webinar yang tersedia</p>
        <p className="text-sm text-gray-400 mt-1">Nantikan update terbaru dari kami!</p>
      </div>
    </div>
  );
}