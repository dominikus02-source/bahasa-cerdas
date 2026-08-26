"use client"

import { useState } from "react"

const GAMES = [
  { name: "TTS (Teka-Teki Silang)", env: "game-env-tts", component: () => import("@/components/game/TTSpage") },
  { name: "TebakKata", env: "game-env-tebak", component: () => import("@/components/game/TebakKata") },
  { name: "SusunKata", env: "game-env-susun", component: () => import("@/components/game/SusunKata") },
  { name: "BenarSalah", env: "game-env-benar", component: () => import("@/components/game/BenarSalah") },
  { name: "LariKata", env: "game-env-lari", component: () => import("@/components/game/LariKata") },
  { name: "IramaKata", env: "game-env-irama", component: () => import("@/components/game/IramaKata") },
  { name: "MenaraCerdas", env: "game-env-menara", component: () => import("@/components/game/MenaraCerdas") },
  { name: "KuisTempurSolo", env: "game-env-kuis", component: () => import("@/components/game/KuisTempurSolo") },
  { name: "ZelbyDash", env: "game-env-zelby", component: () => import("@/components/game/ZelbyDash") },
]

export default function GameTestPage() {
  const [selectedGame, setSelectedGame] = useState<number | null>(null)
  const [theme, setTheme] = useState<"light" | "dark">("light")

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light"
    setTheme(next)
    if (next === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 dark:text-white">Game Visual System Review</h1>
        
        <div className="flex gap-3 mb-6">
          <button
            onClick={toggleTheme}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white font-semibold"
          >
            Toggle: {theme === "light" ? "☀️ Light" : "🌙 Dark"}
          </button>
          <span className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-sm dark:text-white">
            Current: {theme} mode — html.dark = {document.documentElement.classList.contains("dark") ? "yes" : "no"}
          </span>
        </div>

        {selectedGame === null ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {GAMES.map((game, i) => (
              <button
                key={i}
                onClick={() => setSelectedGame(i)}
                className="p-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-left hover:border-violet-400 transition-colors"
              >
                <div className="font-bold dark:text-white">{game.name}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{game.env}</div>
              </button>
            ))}
          </div>
        ) : (
          <div>
            <button
              onClick={() => setSelectedGame(null)}
              className="mb-4 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-sm dark:text-white"
            >
              ← Back to list
            </button>
            <div className="text-lg font-bold mb-2 dark:text-white">
              {GAMES[selectedGame].name} — {theme} mode
            </div>
            <div className="border-2 border-slate-300 dark:border-slate-700 rounded-xl overflow-hidden">
              <GameLoader index={selectedGame} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function GameLoader({ index }: { index: number }) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)
  
  useState(() => {
    GAMES[index].component().then((mod) => setComponent(() => mod.default))
  })

  if (!Component) return <div className="p-8 text-center text-slate-500">Loading...</div>
  return <Component />
}
