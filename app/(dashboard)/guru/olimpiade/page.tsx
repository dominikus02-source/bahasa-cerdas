import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Calendar, Users, Trophy, ArrowRight } from "lucide-react";

export default function GuruOlimpiadePage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Olimpiade Bahasa Indonesia</h1>
        <p className="mt-1 text-sm text-gray-600">Info dan kalender lomba bahasa Indonesia</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <a href="/guru/olimpiade/info">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-orange-100 flex items-center justify-center">
                <Trophy className="h-7 w-7 text-orange-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Info Lomba</h3>
                <p className="text-sm text-gray-500">Daftar lomba yang tersedia</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </Card>
        </a>

        <a href="/guru/olimpiade/kalender">
          <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="h-7 w-7 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold">Kalender Event</h3>
                <p className="text-sm text-gray-500">Jadwal lomba sepanjang tahun</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </Card>
        </a>
      </div>
    </div>
  );
}