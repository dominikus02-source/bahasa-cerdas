import type { LucideIcon } from "lucide-react";
import { PenLine, MessageCircle, Heart, BookOpen, Brain, Gift } from "lucide-react";

// Single source of truth for how a DailyQuest.questType renders — label, icon,
// color. Used by both the Arena beranda preview and the full Misi Harian page
// so the two never drift out of sync with each other. Icon is the component
// itself (not pre-sized JSX) so each caller can size it to its own layout.
export const QUEST_META: Record<string, { Icon: LucideIcon; label: string; warna: string }> = {
  MENULIS: { Icon: PenLine, label: "Tulis 1 Karya", warna: "from-amber-500 to-orange-600" },
  MENGOMENTARI: { Icon: MessageCircle, label: "Beri Komentar", warna: "from-blue-500 to-cyan-600" },
  MEMBERI_LIKE: { Icon: Heart, label: "Beri Suka ke Karya", warna: "from-rose-500 to-pink-600" },
  BACA_MATERI: { Icon: BookOpen, label: "Belajar Jalur Cerdas", warna: "from-violet-500 to-purple-600" },
  MENJAWAB_KUIS: { Icon: Brain, label: "Jawab Soal Jalur Cerdas", warna: "from-cyan-500 to-blue-600" },
};

export function getQuestMeta(questType: string) {
  return QUEST_META[questType] || { Icon: Gift, label: questType, warna: "from-gray-500 to-gray-600" };
}

export function questProgressText(progress: number, target: number, completed: boolean) {
  if (completed) return "Selesai!";
  const sisa = Math.max(0, target - progress);
  return `${sisa} lagi`;
}
