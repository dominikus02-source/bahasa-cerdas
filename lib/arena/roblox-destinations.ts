/** ID resmi hasil Publish Roblox Studio. Experience tetap PRIVATE saat pengembangan. */
export const ROBLOX_DESTINATIONS = {
  lobby: { placeId: "83975639468986", universeId: "10778631695" },
  games: {
    "benar-salah": { placeId: "100707509457007" },
    nusantara: { placeId: "135622689114243" },
  },
} as const;
export const ROBLOX_LOBBY_WEB_URL =
  `https://www.roblox.com/games/${ROBLOX_DESTINATIONS.lobby.placeId}`;
export const ROBLOX_LOBBY_APP_URL =
  `roblox://placeId=${ROBLOX_DESTINATIONS.lobby.placeId}`;
export const ROBLOX_DOWNLOAD_URL = "https://www.roblox.com/download";
