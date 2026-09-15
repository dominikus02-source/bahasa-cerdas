/**
 * POST /api/presence/heartbeat — Near-real-time user presence heartbeat
 *
 * Behavior:
 *  - Requires authenticated user
 *  - Server derives userId and role (never trusts client)
 *  - Sets Redis key `bc:presence:{userId}` with 60s TTL
 *  - Client calls every ~20 seconds
 *  - Multiple tabs share same user-level key (no inflation)
 *  - No IP, no email, no page URL stored
 */
import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { setPresence, type PresenceRole } from "@/lib/presence"

export async function POST() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Server derives role — never trust client
    let role: PresenceRole = "MURID"
    if (user.isFounder || user.role === "ADMIN") {
      role = "ADMIN"
    } else if (user.role === "GURU") {
      role = "GURU"
    }

    const ok = await setPresence(user.id, role)

    return NextResponse.json({ ok, ttl: 60 })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
