import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — BahasaCerdas",
    default: "Masuk / Daftar — BahasaCerdas",
  },
  description: "Masuk atau daftar akun BahasaCerdas. Guru dan murid Bahasa Indonesia bergabung di platform edukasi terpadu.",
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
