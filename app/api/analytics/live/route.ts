/**
 * GET /api/analytics/live — Near-real-time platform health for founder dashboard
 *
 * Returns:
 *  - Online users (from Redis presence, near-real-time)
 *  - Breakdown by role (guru/murid/admin)
 *  - Total Karya count (from PostgreSQL, canonical)
 *  - Presence window (TTL seconds)
 *
 * Auth: Founder/ADMIN only
 * Polling: Client polls every ~15 seconds
 * No public access.
 */
import { NextResponse } from "next/server"
import { getUser } from "@/lib/supabase/server"
import { getOnlineUsers, getTotalKaryaCount, isPresenceAvailable, PRESENCE_TTL_SECONDS } from "@/lib/presence"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const user = await getUser()
    if (!user || (!user.isFounder && user.role !== "ADMIN")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const [online, totalKarya] = await Promise.all([
      getOnlineUsers(),
      getTotalKaryaCount(),
    ])

    return NextResponse.json({
      onlineUsers: online.total,
      onlineGuru: online.guru,
      onlineMurid: online.murid,
      onlineAdmin: online.admin,
      totalKarya,
      generatedAt: new Date().toISOString(),
      presenceWindowSeconds: PRESENCE_TTL_SECONDS,
      presenceAvailable: isPresenceAvailable(),
    })
  } catch (error) {
    console.error("GET /api/analytics/live error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
