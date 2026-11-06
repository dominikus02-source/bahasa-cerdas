import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bahasa Cerdas — Web App",
  description: "Versi web app Bahasa Cerdas. Pasang ke layar utama.",
  manifest: "/manifest-webapp.json",
  themeColor: "#7c3aed",
  appleWebApp: {
    capable: true,
    title: "BC",
    statusBarStyle: "default",
  },
};

export default function WebAppLayout({ children }: { children: React.ReactNode }) {
  return children;
}
