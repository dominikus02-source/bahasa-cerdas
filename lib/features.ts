/**
 * Feature flags. Values come from NEXT_PUBLIC_* so they work on both server and
 * client (inlined at build time).
 *
 * MULTIPLAYER_ENABLED — gates the real-time games that need the Socket.IO game
 * server (Kuis Tempur, Adu Cepat, lobby/play). Default OFF: the game server is
 * not hosted right now, so these show a "Segera Hadir" screen instead of trying
 * to connect to a dead socket. To re-enable once the server is live again, set
 * NEXT_PUBLIC_MULTIPLAYER_ENABLED=true in Vercel and redeploy — no code changes.
 */
export const MULTIPLAYER_ENABLED =
  process.env.NEXT_PUBLIC_MULTIPLAYER_ENABLED === "true";
