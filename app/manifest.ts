import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BahasaCerdas — Platform edukasi Bahasa Indonesia",
    short_name: "BahasaCerdas",
    description: "Platform edukasi Bahasa Indonesia untuk guru dan murid. AI RPP, bank soal, kuis game, UKBI, toko karya.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7c3aed",
    icons: [
      { src: "/favicon.ico", sizes: "any", type: "image/x-icon" },
      { src: "/BC-logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
