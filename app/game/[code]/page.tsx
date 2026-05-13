'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import GamePlay from '@/components/game/GamePlay';
import GameLobby from '@/components/game/GameLobby';

export default function GamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [phase, setPhase] = useState<'lobby' | 'countdown' | 'playing' | 'result'>('lobby');
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    const roomCode = searchParams.get('code');
    const from = searchParams.get('from');
    if (roomCode) {
      setCode(roomCode);
    }
  }, [searchParams]);

  const handleStart = () => {
    setPhase('countdown');
  };

  const handleFinish = () => {
    setPhase('result');
  };

  if (phase === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4">🎉 Game Selesai!</h1>
          <p className="text-white/60 mb-8">Skormu akan disimpan. Cek hasilnya di riwayat!</p>
          <button
            onClick={() => router.push('/murid/game')}
            className="px-8 py-3 bg-white/20 hover:bg-white/30 text-white rounded-xl font-bold transition"
          >
            Kembali ke Game
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'countdown') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-8xl font-black animate-pulse">3</div>
          <p className="text-2xl mt-4">Persiapkan diri!</p>
        </div>
      </div>
    );
  }

  if (code) {
    return <GamePlay roomCode={code} onFinish={handleFinish} />;
  }

  return <GameLobby isHost={false} />;
}