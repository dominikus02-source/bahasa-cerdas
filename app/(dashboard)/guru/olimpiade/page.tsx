import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, Trophy, ArrowRight, Video, GraduationCap } from "lucide-react";

export default function GuruOlimpiadePage() {
  return (
    <div>
      <div className="guru-role-hero mb-8 rounded-[26px] p-6 sm:p-7">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border border-white/15 bg-white/10">
            <Calendar className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Kalender Kegiatan</h1>
            <p className="mt-1 text-sm text-blue-100">Info dan kalender event, lomba, serta webinar bahasa Indonesia</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <a href="/guru/olimpiade/info">
          <Card className="guru-role-card h-full border-blue-100 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-blue-950/70">
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
          <Card className="guru-role-card h-full border-blue-100 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-blue-950/70">
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
          <Card className="guru-role-card h-full border-blue-100 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-blue-950/70">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Video className="h-7 w-7 text-purple-600" />
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