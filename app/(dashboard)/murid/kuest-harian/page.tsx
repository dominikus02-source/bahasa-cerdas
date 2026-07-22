"use client";

import { useState, useEffect } from "react";
import { Target } from "lucide-react";
import { IconCoin, IconFlame, IconCheck, IconPen, IconChat, IconHeart, IconBolt, IconTarget } from "@/lib/icons";

interface Quest {
  id: string; questType: string; target: number; progress: number;
  completed: boolean; rewardCoins: number;
}

const QUEST_LABELS: Record<string, string> = {
  MENULIS: "Menulis Karya",
  MENGOMENTARI: "Mengomentari Karya",
  MEMBERI_LIKE: "Memberi Like",
  BACA_MATERI: "Selesaikan Materi",
  MENJAWAB_KUIS: "Jawab Soal Kuis",
};

function QuestTypeIcon({ type, completed }: { type: string; completed: boolean }) {
  const cls = "text-violet-600";
  if (completed) return <IconCheck size={24} className="text-emerald-600" />;
  switch (type) {
    case "MENULIS": return <IconPen size={24} className={cls} />;
    case "MENGOMENTARI": return <IconChat size={24} className={cls} />;
    case "MEMBERI_LIKE": return <IconHeart size={24} className={cls} />;
    case "BACA_MATERI": return <IconTarget size={24} className={cls} />;
    default: return <IconBolt size={24} className={cls} />;
  }
}

export default function KuestHarianPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/user/me").then(r => r.json()),
      fetch("/api/siswa/quest").then(r => r.json()),
    ]).then(([u, d]) => {
      setUser(u.user);
      setQuests(d.quests || []);
      setLoading(false);
    });
  }, []);

  const allCompleted = quests.length > 0 && quests.every(q => q.completed);
  const completedCount = quests.filter(q => q.completed).length;

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Quest Harian</h1>
          <p className="text-sm text-gray-500">Selesaikan quest untuk dapatkan koin!</p>
        </div>
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl">
          <IconCoin size={20} className="text-amber-500" />
          <span className="font-bold text-amber-600">{user?.coins || 0}</span>
        </div>
      </div>

      {/* Streak Card */}
      {user && (
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-5 text-white mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconFlame size={28} className="text-orange-200" />
              <div>
                <p className="text-sm text-orange-100">Streak Harian</p>
                <p className="text-3xl font-bold mt-1">{user.streak || 0} hari</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-orange-100">XP Total</p>
              <p className="text-xl font-bold">{user.xp?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* Progress Overview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Progress Hari Ini</h2>
          <span className="text-sm text-gray-500">{completedCount}/{quests.length} selesai</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all" style={{ width: `${quests.length > 0 ? (completedCount / quests.length) * 100 : 0}%` }} />
        </div>
        {allCompleted && (
          <div className="mt-3 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 rounded-xl text-sm font-semibold text-emerald-600">
            <IconCheck size={16} /> Semua quest selesai! Kembali besok untuk quest baru.
          </div>
        )}
      </div>

      {/* Quest List */}
      <div className="space-y-3">
        {quests.map(quest => {
          const progress = quest.target > 0 ? (quest.progress / quest.target) * 100 : 0;
          return (
            <div key={quest.id} className={`bg-white rounded-2xl border p-5 transition-all ${
              quest.completed ? "border-emerald-200 bg-emerald-50/30" : "border-gray-100"
            }`}>
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  quest.completed ? "bg-emerald-100" : "bg-violet-100"
                }`}>
                  <QuestTypeIcon type={quest.questType} completed={quest.completed} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">{QUEST_LABELS[quest.questType] || quest.questType}</h3>
                    <span className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                      <IconCoin size={14} className="text-amber-500" /> {quest.rewardCoins}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {quest.completed
                      ? "Selesai!"
                      : `${quest.progress}/${quest.target} selesai`
                    }
                  </p>
                  <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      quest.completed ? "bg-emerald-500" : "bg-violet-500"
                    }`} style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {quests.length === 0 && (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-violet-100 flex items-center justify-center mx-auto mb-4">
            <Target size={24} className="text-violet-500" />
          </div>
          <p className="text-gray-500 font-medium">Belum ada quest hari ini</p>
          <p className="text-gray-400 text-sm mt-1">Mulai menulis untuk membuka quest!</p>
        </div>
      )}

      {/* How to earn */}
      <div className="mt-8 bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-4">Cara Mendapatkan Koin</h2>
        <div className="space-y-3">
          {[
            { icon: <IconPen size={16} />, label: "Menulis karya", coins: "+10" },
            { icon: <IconHeart size={16} />, label: "Mendapat like", coins: "+2" },
            { icon: <IconChat size={16} />, label: "Mengomentari", coins: "+1" },
            { icon: <IconFlame size={16} />, label: "Login harian", coins: "+5" },
            { icon: <IconBolt size={16} />, label: "Menyelesaikan quest", coins: "+5-10" },
            { icon: <IconFlame size={16} />, label: "Streak 7 hari", coins: "+30" },
            { icon: <IconFlame size={16} />, label: "Streak 30 hari", coins: "+150" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="flex items-center gap-2 text-sm text-gray-700">
                <span className="text-violet-500">{item.icon}</span> {item.label}
              </span>
              <span className="text-sm font-semibold text-emerald-600">{item.coins}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
