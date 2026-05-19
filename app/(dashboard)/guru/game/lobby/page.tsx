"use client";

import { useState } from "react";
import Link from "next/link";

export default function GuruGameLobbyPage() {
  const [roomCode, setRoomCode] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomCode(code);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Link href="/guru/game" className="text-emerald-600 hover:underline text-sm flex items-center gap-1 mb-4">
            ← Kembali ke Menu Gim
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Buat Ruang Gim</h1>
          <p className="text-gray-500 text-sm mt-1">Buat ruangan Kuis Battle dan ajak siswa bergabung</p>
        </div>

        {/* Create Room */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="font-bold text-gray-900 mb-4">Buat Ruangan Baru</h2>
          
          {!roomCode ? (
            <button
              onClick={handleCreateRoom}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            >
              Buat Ruang Baru
            </button>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl text-center">
                <p className="text-sm text-emerald-600 mb-2">Kode Ruangan</p>
                <p className="text-3xl font-bold text-emerald-700 tracking-wider">{roomCode}</p>
              </div>
              
              <button
                onClick={handleCopy}
                className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                {copied ? "✓ Disalin!" : "Salin Kode"}
              </button>
              
              <div className="flex gap-3">
                <Link
                  href={`/guru/game/lobby?code=${roomCode}`}
                  className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-medium text-center hover:opacity-90 transition-opacity"
                >
                  Buka Ruangan
                </Link>
                <button
                  onClick={() => setRoomCode("")}
                  className="px-4 py-3 border border-gray-200 text-gray-600 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Baru
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Join Room */}
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

        {/* Recent Rooms */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-4">Ruangan Aktif</h2>
          <p className="text-gray-400 text-sm text-center py-4">Belum ada ruangan aktif</p>
        </div>
      </div>
    </div>
  );
}