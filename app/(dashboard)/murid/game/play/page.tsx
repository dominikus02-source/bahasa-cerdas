'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import GamePlay from '@/components/game/GamePlay';

export default function MuridGamePlayPage() {
  const params = useParams();
  const router = useRouter();
  const [started, setStarted] = useState(false);

  const roomCode = params.code as string;

  const handleFinish = () => {
    setStarted(false);
  };

  return (
    <div>
      {started ? (
        <GamePlay roomCode={roomCode} onFinish={handleFinish} />
      ) : (
        <div className="min-h-screen bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-pulse text-6xl mb-4">🎮</div>
            <h1 className="text-3xl font-bold mb-4">Menunggu Game Dimulai...</h1>
            <p className="text-white/60 mb-6">Room: {roomCode}</p>
            <p className="text-white/40 text-sm">Host akan memulai game sebentar lagi</p>
          </div>
        </div>
      )}
    </div>
  );
}