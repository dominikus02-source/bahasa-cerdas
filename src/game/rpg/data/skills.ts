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
