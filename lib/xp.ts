export function calcLevel(xp: number): number {
  return Math.floor(xp / 500) + 1
}

export function calcLeagueFromXP(xp: number): "BRONZE" | "SILVER" | "GOLD" | "DIAMOND" {
  if (xp >= 8000) return "DIAMOND"
  if (xp >= 3000) return "GOLD"
  if (xp >= 1000) return "SILVER"
  return "BRONZE"
}

export function calcXpForNextLevel(level: number): number {
  return level * 500
}

export function calcLevelProgress(xp: number, level: number) {
  const baseXp = (level - 1) * 500
  const current = xp - baseXp
  const needed = 500
  return { current, needed, pct: Math.min(Math.round((current / needed) * 100), 100) }
}

export function calcXpFromLevel(level: number): number {
  return (level - 1) * 500
}
