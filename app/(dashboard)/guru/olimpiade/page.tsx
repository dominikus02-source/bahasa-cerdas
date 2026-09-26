import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Trophy, ArrowRight, Video, GraduationCap } from "lucide-react";

export default function GuruOlimpiadePage() {
  return (
    <div>
      <div className="bc-guru-hero mb-8 rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-white">Kalender Kegiatan</h1>
        <p className="mt-1 text-sm text-blue-100/90">Info dan kalender event, lomba, serta webinar bahasa Indonesia</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <a href="/guru/olimpiade/info">
          <Card className="bc-guru-surface-interactive h-full cursor-pointer p-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                <Trophy className="h-7 w-7 text-orange-600" />
              </div>
              <div>
                <h3 className="font-bold">Lomba & Olympiade</h3>
                <p className="text-sm text-gray-500 mt-1">Info dan kalender lomba bahasa Indonesia</p>
              </div>
            </div>
          </Card>
        </a>

        <a href="/guru/olimpiade/kalender">
          <Card className="bc-guru-surface-interactive h-full cursor-pointer p-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <Calendar className="h-7 w-7 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold">Kalender Event</h3>
                <p className="text-sm text-gray-500 mt-1">Jadwal event dan lomba sepanjang tahun</p>
              </div>
            </div>
          </Card>
        </a>

        <a href="/guru/olimpiade/webinar">
          <Card className="bc-guru-surface-interactive h-full cursor-pointer p-6">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 dark:bg-blue-950/55">
                <Video className="h-7 w-7 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-bold">Webinar & Seminar</h3>
                <p className="text-sm text-gray-500 mt-1">Jadwal webinar dan seminar pendidikan</p>
              </div>
            </div>
          </Card>
        </a>
      </div>
    </div>
  );
}