"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { GraduationCap, Clock, CheckCircle2, Star, AlertTriangle } from "lucide-react";

const seksiList = [
  { id: 1, nama: "Merespons Kaidah", menit: 30, soal: 40, icon: "📝", bg: "bg-blue-50" },
  { id: 2, nama: "Membaca", menit: 45, soal: 50, icon: "📖", bg: "bg-purple-50" },
  { id: 3, nama: "Menulis", menit: 30, soal: 30, icon: "✍️", bg: "bg-emerald-50" },
  { id: 4, nama: "Merevisi Wacana", menit: 30, soal: 35, icon: "🔄", bg: "bg-amber-50" },
  { id: 5, nama: "Berbicara", menit: 15, soal: 10, icon: "🎤", bg: "bg-rose-50" },
];

export default function UKBIPage() {
  const [selectedPaket, setSelectedPaket] = useState<any>(null);
  const [currentSeksi, setCurrentSeksi] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(seksiList[0].menit * 60);

  const startExam = (paket: any) => {
    setSelectedPaket(paket);
    setCurrentSeksi(0);
    setAnswers({});
    setTimeLeft(seksiList[0].menit * 60);
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Simulasi UKBI</h1>
        <p className="mt-1 text-sm text-gray-600">Latihan UKBI resmi 5 seksi dengan timer</p>
      </div>

      {!selectedPaket ? (
        <>
          <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-blue-100 flex items-center justify-center">
                <GraduationCap className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Uji Kompetensi Bahasa Indonesia</h2>
                <p className="text-sm text-gray-600">165 menit • 5 seksi • 165 soal</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  <span>📝 40 soal Merespons Kaidah</span>
                  <span>📖 50 soal Membaca</span>
                  <span>✍️ 30 soal Menulis</span>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-5">
            {seksiList.map((seksi, i) => (
              <Card key={seksi.id} className={`p-4 ${seksi.bg}`}>
                <div className="text-3xl mb-2">{seksi.icon}</div>
                <h3 className="font-semibold">{seksi.nama}</h3>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  <p><Clock className="inline h-3 w-3 mr-1" />{seksi.menit} menit</p>
                  <p>{seksi.soal} soal</p>
                </div>
              </Card>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button size="lg" onClick={() => startExam({ id: 1, title: "UKBI Lengkap" })} className="px-12">
              Mulai Simulasi
            </Button>
            <p className="mt-3 text-xs text-gray-500">Pastikan kamu punya waktu 2,5 jam tanpa gangguan</p>
          </div>
        </>
      ) : selectedPaket && !showResult ? (
        <Card className="p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold">{seksiList[currentSeksi].icon} {seksiList[currentSeksi].nama}</h2>
            <div className="flex items-center gap-2">
              <Badge variant={timeLeft < 60 ? "destructive" : "secondary"}>
                <Clock className="h-3 w-3 mr-1" />
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </Badge>
            </div>
          </div>

          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded-full">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${((currentSeksi + 1) / 5) * 100}%` }} />
            </div>
            <p className="text-xs text-center text-gray-500 mt-1">Seksi {currentSeksi + 1} dari 5</p>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-600">Soal 1 dari {seksiList[currentSeksi].soal}</p>
            <p className="text-lg">Perhatikan kalimat berikut: "Bahasa Indonesia adalah bahasa pemersatu bangsa."</p>
            <p className="font-medium">Kata 'pemersatu' memiliki makna...</p>
            <div className="space-y-2">
              {["Denotatif (makna sebenarnya)", "Konotatif (makna tambahan)", "Makna leksikal", "Makna gramatikal"].map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setAnswers({ ...answers, [`q${currentSeksi}_1`]: String(i) })}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    answers[`q${currentSeksi}_1`] === String(i) ? "border-blue-500 bg-blue-50" : "hover:border-gray-300"
                  }`}
                >
                  {String.fromCharCode(65 + i)}. {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 mt-8">
            {currentSeksi > 0 && (
              <Button variant="outline" onClick={() => setCurrentSeksi(currentSeksi - 1)} className="flex-1">
                Sebelumnya
              </Button>
            )}
            {currentSeksi < 4 ? (
              <Button onClick={() => { setCurrentSeksi(currentSeksi + 1); setTimeLeft(seksiList[currentSeksi + 1].menit * 60); }} className="flex-1">
                Selanjutnya
              </Button>
            ) : (
              <Button onClick={() => setShowResult(true)} className="flex-1 bg-emerald-600">
                Submit Semua
              </Button>
            )}
          </div>
        </Card>
      ) : showResult ? (
        <Card className="p-8 max-w-lg mx-auto text-center">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold">Simulasi Selesai!</h2>
          <p className="mt-2 text-gray-600">Hasil akan diproses dalam 24 jam</p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-2xl font-bold text-blue-600">165</p>
              <p className="text-xs text-gray-500">Total Soal</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-2xl font-bold text-emerald-600">+825</p>
              <p className="text-xs text-gray-500">XP Earned</p>
            </div>
          </div>
          <Button onClick={() => { setSelectedPaket(null); setShowResult(false); }} className="mt-6 w-full">
            Kembali
          </Button>
        </Card>
      ) : null}
    </div>
  );
}