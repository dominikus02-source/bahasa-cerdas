// ─── Team Assignment Policy (Tahap 6 §9) ────────────────────
// Jelajah Kata: setiap peserta baru di-assign ke regu dengan jumlah
// anggota PALING SEDIKIT. Tie → urutan regu domain yang stabil
// (elang, harimau, rusa, badak, gajah, beruang) — TANPA random agar test
// deterministik dan hasil join berulang konsisten.
//
// Murni + stateless: pembacaan keanggotaan hanya dari daftar player
// yang diberikan (snapshot saat join), tanpa I/O.

import type { TeamId } from '../../domain/types/ids';
import {
  activeJelajahTeamKeys,
} from '../../domain/entities/team';

/** Regu dengan anggota paling sedikit; tie → urutan domain stabil. */
export function pickBalancedTeam(
  existingMembers: ReadonlyArray<{ teamId?: string }>,
  activeTeams: readonly string[] = activeJelajahTeamKeys(),
  maxMembersPerTeam = Number.POSITIVE_INFINITY,
): TeamId | null {
  if (activeTeams.length === 0) return null;
  const counts = new Map<string, number>();
  for (const key of activeTeams) counts.set(key, 0);
  for (const member of existingMembers) {
    if (member.teamId && counts.has(member.teamId)) {
      counts.set(member.teamId, (counts.get(member.teamId) ?? 0) + 1);
    }
  }
  let best: TeamId | null = null;
  let bestCount = Number.POSITIVE_INFINITY;
  // Iterasi sesuai urutan JELAJAH_TEAM_KEYS — tie otomatis stabil.
  for (const key of activeTeams) {
    const count = counts.get(key) ?? 0;
    if (count < bestCount && count < maxMembersPerTeam) {
      best = key as TeamId;
      bestCount = count;
    }
  }
  return best;
}
