/**
 * Skill data — data-driven skill definitions.
 *
 * Skills are consumed by the battle engine via id; damage formulas stay in
 * the engine, costs/effects stay in data. `learningBoost` marks skills whose
 * damage scales with a correct learning answer (Learning → Game Effect).
 */

export interface RPGSkillDefinition {
  id: string;
  name: string;
  /** Base damage before defense/learning multipliers. */
  baseDamage: number;
  /** Cost units (stamina/mana) reserved for the future combat economy. */
  cost: number;
  /** When true, a correct learning challenge multiplies this skill's damage. */
  learningBoost: boolean;
  description: string;
  /** MP cost (canonical prototype SKILLS values; omitted = 0). */
  mpCost?: number;
  /** Damage multiplier on attack stat (canonical; omitted = 1). */
  multiplier?: number;
  /** Minimum player level to unlock (canonical; omitted = unlocked). */
  unlockLevel?: number;
  /** Prototype skill key (maha/angin/api) — lookup aid. */
  prototypeKey?: string;
}

export const SKILLS: RPGSkillDefinition[] = [
  {
    id: "skill.tebas-patah",
    name: "Tebas Patah",
    baseDamage: 8,
    cost: 0,
    learningBoost: false,
    description: "Serangan dasar dengan senjata.",
  },
  {
    id: "skill.pukul-aksara",
    name: "Pukul Aksara",
    baseDamage: 14,
    cost: 2,
    learningBoost: true,
    description: "Serangan bertenaga aksara — damage melonjak jika jawaban learning benar.",
  },
];

/**
 * Canonical prototype skills — VERBATIM transcription (legacy lines 497-501:
 * mp cost, mult, minL). Basic attack is skillBase 0 (prototype uses pAtk()
 * directly); these three carry the prototype multipliers.
 */
export const CANONICAL_SKILLS: RPGSkillDefinition[] = [
  { id: "skill.mahapukul", name: "MAHAPUKUL", baseDamage: 0, cost: 8, learningBoost: false, description: "Jurus turun-temurun Eyang Kartala.", mpCost: 8, multiplier: 2.2, unlockLevel: 1, prototypeKey: "maha" },
  { id: "skill.tebas-angin", name: "TEBAS ANGIN", baseDamage: 0, cost: 12, learningBoost: false, description: "Terbuka otomatis di level 5.", mpCost: 12, multiplier: 2.8, unlockLevel: 5, prototypeKey: "angin" },
  { id: "skill.api-suci", name: "API SUCI", baseDamage: 0, cost: 20, learningBoost: false, description: "Terbuka otomatis di level 8.", mpCost: 20, multiplier: 3.8, unlockLevel: 8, prototypeKey: "api" },
];

/** All skills (placeholders + canonical) by id. */
export function skillById(id: string): RPGSkillDefinition | undefined {
  return SKILLS.find((s) => s.id === id) ?? CANONICAL_SKILLS.find((s) => s.id === id);
}

/**
 * Skill availability derives from player level + canonical definition
 * (no duplicated unlock booleans): unlocked iff level >= unlockLevel ?? 1.
 */
export function isSkillUnlocked(skill: RPGSkillDefinition, level: number): boolean {
  return level >= (skill.unlockLevel ?? 1);
}
