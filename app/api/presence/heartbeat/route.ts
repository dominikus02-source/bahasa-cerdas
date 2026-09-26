/**
 * POST /api/presence/heartbeat — Near-real-time user presence heartbeat
 *
 * Behavior:
 *  - Requires authenticated user
 *  - Server derives userId and role (never trusts client)
 *  - Client sends pathname; server reduces it to a coarse product/menu bucket
 *  - Sets Redis key `bc:presence:{userId}` with 60s TTL
 *  - Client calls every ~20 seconds and immediately after route changes
 *  - Multiple tabs share same user-level key (no inflation)
 *  - No IP, email, query string, or dynamic route ID stored
 */
import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { setPresence, type PresenceRole } from "@/lib/presence"
import { resolvePresenceLocation } from "@/lib/presence-location"

export async function POST(request: Request) {
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

    let pathname: string | null = null
    try {
      const body = (await request.json()) as { pathname?: unknown }
      pathname = typeof body?.pathname === "string" ? body.pathname : null
    } catch {
      // Body is optional; older clients remain compatible.
    }

    const location = resolvePresenceLocation(pathname)
    const ok = await setPresence(user.id, role, location.key)

    return NextResponse.json({ ok, ttl: 60, location: location.key })
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
