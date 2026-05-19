"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import QRCode from "qrcode";

const ZapIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const TrophyIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 15l-2 5-3-3-2 1-1-4 5-4-4-2 3-5 2 8z M12 15l2 5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SwordsIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M14.5 5l4.5 14-9.5 4.5L5 19l4.5-14z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const HeartIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const TimerIcon = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/></svg>;

const GAME_MODES = [
  { id: "KUIS_BATTLE", name: "Adu Cerdas", desc: "Jawab benar, kumpulkan poin, rebut peringkat teratas!", Icon: ZapIcon, color: "from-violet-500 to-purple-600" },
  { id: "GOLD_RUSH", name: "Rebut Emas", desc: "Kumpulkan emas sebanyak-banyaknya, jawab benar untuk menambang!", Icon: TrophyIcon, color: "from-amber-500 to-orange-600" },
  { id: "SPEED_BATTLE", name: "Cepat Tepat", desc: "Kecepatan adalah segalanya! Jawab paling cepat dapat poin banyak!", Icon: SwordsIcon, color: "from-red-500 to-rose-600" },
  { id: "SURVIVAL", name: "Tak Terkalahkan", desc: "Punya 3 nyawa! Jawab salah = nyawa berkurang. Bertahan paling akhir jadi juara!", Icon: HeartIcon, color: "from-pink-500 to-rose-600" },
  { id: "TIMED_TRIAL", name: "Lawan Waktu", desc: "Waktu terbatas! Jawab benar untuk tambah waktu. Kejar skor tertinggi!", Icon: TimerIcon, color: "from-cyan-500 to-blue-600" },
];

export default function GuruGameLobbyPage() {
  const [roomCode, setRoomCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [selectedMode, setSelectedMode] = useState("KUIS_BATTLE");
  const [step, setStep] = useState<"select" | "create">("select");
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (roomCode) {
      const joinUrl = `${window.location.origin}/game/${roomCode}`;
      QRCode.toDataURL(joinUrl, { width: 200, margin: 1, color: { dark: "#064e3b", light: "#ffffff" } }, (err, url) => {
        if (!err) setQrCodeUrl(url);
      });
    }
  }, [roomCode]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/guru/game" className="text-emerald-600 hover:underline text-sm flex items-center gap-1 mb-4">
            ← Kembali ke Menu Gim
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Kuis Battle Lobby</h1>
          <p className="text-gray-500 text-sm mt-1">Buat ruangan dan pilih mode gim untuk dimainkan bersama siswa</p>
        </div>

        {step === "select" ? (
          <div className="mb-8">
            <h2 className="font-bold text-gray-900 mb-4">Pilih Mode Gim</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GAME_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => { setSelectedMode(mode.id); setStep("create"); }}
                  className={`relative p-4 bg-white rounded-2xl border-2 text-left transition-all hover:shadow-lg hover:-translate-y-1 ${selectedMode === mode.id ? "border-emerald-500 shadow-lg" : "border-gray-100 hover:border-emerald-200"}`}
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center mb-3`}>
                    <mode.Icon />
                  </div>
                  <h3 className="font-bold text-gray-900">{mode.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{mode.desc}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Buat Ruangan</h2>
              <button onClick={() => setStep("select")} className="text-emerald-600 text-sm hover:underline">
                ← Ganti Mode
              </button>
            </div>
            
            <div className="p-4 bg-emerald-50 rounded-xl mb-4">
              <p className="text-sm text-emerald-600 mb-1">Mode yang dipilih</p>
              <p className="font-bold text-emerald-700">{GAME_MODES.find(m => m.id === selectedMode)?.name}</p>
            </div>
          
            {!roomCode ? (
              <button
                onClick={handleCreateRoom}
                type="button"
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
              >
                Buat Ruangan
              </button>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50 rounded-xl text-center">
                  <p className="text-sm text-emerald-600 mb-2">Kode Ruangan</p>
                  <p className="text-3xl font-bold text-emerald-700 tracking-wider">{roomCode}</p>
                </div>
                
                {qrCodeUrl && (
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-sm text-gray-600 mb-3 font-medium">Scan QR untuk Gabung</p>
                    <div className="inline-block bg-white p-3 rounded-xl shadow-sm border">
                      <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                    </div>
                    <p className="text-xs text-gray-400 mt-2">Arahkan kamera HP ke QR code ini</p>
                  </div>
                )}
                
                <button
                  onClick={handleCopy}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  {copied ? "✓ Disalin!" : "Salin Kode"}
                </button>
                
                <div className="flex gap-3">
                  <Link
                    href={`/guru/game/lobby?code=${roomCode}&mode=${selectedMode}`}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium text-center hover:opacity-90 transition-opacity"
                  >
                    Buka Ruangan
                  </Link>
                  <button
                    onClick={() => { setRoomCode(""); setQrCodeUrl(""); setStep("select"); }}
                    className="px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                  >
                    Baru
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Gabung ke Ruangan</h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Masukkan kode ruangan"
              className="flex-1 h-12 px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              maxLength={6}
            />
            <button className="px-6 h-12 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors">
              Gabung
            </button>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Ruangan Aktif</h2>
          <p className="text-gray-400 text-sm text-center py-4">Belum ada ruangan aktif</p>
        </div>
      </div>
    </div>
  );
}