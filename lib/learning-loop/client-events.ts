import type { ActivityInput } from "@/lib/learning-loop/types";
import type { ActivityType } from "@prisma/client";

/**
 * Aktivitas yang boleh dilaporkan langsung oleh browser.
 *
 * Event yang punya konsekuensi belajar/reward wajib dicatat oleh route fitur
 * server-side (Jalur, Karya, Quiz, Game, Simulasi), bukan endpoint generik ini.
 * LOGIN/SOCIAL hanya telemetry ringan dan tidak menghasilkan skill/XP/koin.
 */
const CLIENT_EVENT_RULES: Partial<Record<ActivityType, { subtype: string }>> = {
  LOGIN: { subtype: "CLIENT_EVENT" },
  SOCIAL: { subtype: "CLIENT_EVENT" },
};

export function deriveClientEvent(userId: string, requestedType: unknown): ActivityInput | null {
  if (typeof requestedType !== "string") return null;

  const type = requestedType.toUpperCase() as ActivityType;
  const rule = CLIENT_EVENT_RULES[type];
  if (!rule) return null;

  return {
    userId,
    type,
    subtype: rule.subtype,
    skill: null,
    skillDelta: 0,
    xp: 0,
    coin: 0,
    meta: { source: "CLIENT_EVENT" },
  };
}
