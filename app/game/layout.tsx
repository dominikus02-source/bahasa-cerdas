import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Game Kuis Interaktif — BahasaCerdas",
  description: "Mainkan kuis Bahasa Indonesia multiplayer seru. Battle lawan teman, tebak kata, dan asah kemampuan berbahasa.",
};

export default function GameLayout({ children }: { children: React.ReactNode }) {
  return children;
}
