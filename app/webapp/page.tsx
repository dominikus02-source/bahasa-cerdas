"use client";

import { useState } from "react";
import Link from "next/link";

type Tab = "home" | "belajar" | "arena" | "profil";

export default function WebAppPage() {
  const [tab, setTab] = useState<Tab>("home");

  return (
    <div style={shell}>
      {/* Status bar */}
      <div style={statusBar}>
        <span>Bahasa Cerdas</span>
        <span style={{ fontSize: 12 }}>Web App</span>
      </div>

      {/* Content */}
      <main style={content}>
        {tab === "home" && <HomeTab />}
        {tab === "belajar" && <BelajarTab />}
        {tab === "arena" && <ArenaTab />}
        {tab === "profil" && <ProfilTab />}
      </main>

      {/* Bottom nav */}
      <nav style={bottomNav}>
        <TabButton id="home" label="Beranda" active={tab === "home"} onClick={() => setTab("home")} />
        <TabButton id="belajar" label="Belajar" active={tab === "belajar"} onClick={() => setTab("belajar")} />
        <TabButton id="arena" label="Arena" active={tab === "arena"} onClick={() => setTab("arena")} />
        <TabButton id="profil" label="Profil" active={tab === "profil"} onClick={() => setTab("profil")} />
      </nav>
    </div>
  );
}

function TabButton({ id, label, active, onClick }: { id: string; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ ...tabBtn, color: active ? "#7c3aed" : "#64748b", fontWeight: active ? 600 : 400 }}>
      <div style={{ fontSize: 20 }}>{iconFor(id)}</div>
      <div style={{ fontSize: 11, marginTop: 2 }}>{label}</div>
    </button>
  );
}

function iconFor(id: string) {
  if (id === "home") return "🏠";
  if (id === "belajar") return "📚";
  if (id === "arena") return "🎮";
  return "👤";
}

function HomeTab() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Halo, Selamat Belajar!</h2>
      <p style={{ color: "#64748b" }}>Versi web app Bahasa Cerdas. Pasang ke layar utama untuk pengalaman seperti aplikasi.</p>
      <div style={card}>
        <strong>Jalur Cerdas</strong>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>Lanjutkan materi terakhir</p>
        <Link href="/jalur" style={linkBtn}>Buka</Link>
      </div>
      <div style={card}>
        <strong>Arena</strong>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>Main dan naik ranking</p>
        <Link href="/arena" style={linkBtn}>Main</Link>
      </div>
    </div>
  );
}

function BelajarTab() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Belajar</h2>
      <Link href="/materi" style={row}>Materi</Link>
      <Link href="/kuis" style={row}>Kuis</Link>
      <Link href="/kamus" style={row}>Kamus</Link>
    </div>
  );
}

function ArenaTab() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Arena</h2>
      <Link href="/arena" style={row}>Main Arena</Link>
      <Link href="/peringkat" style={row}>Peringkat</Link>
    </div>
  );
}

function ProfilTab() {
  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Profil</h2>
      <p style={{ color: "#64748b" }}>Masuk untuk menyimpan progres.</p>
      <Link href="/login" style={linkBtn}>Masuk</Link>
      <div style={{ marginTop: 24, fontSize: 13, color: "#94a3b8" }}>
        Tip: di Chrome Android, buka menu → "Pasang aplikasi" atau "Add to Home screen".
      </div>
    </div>
  );
}

const shell: React.CSSProperties = {
  maxWidth: 430,
  margin: "0 auto",
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  background: "#f8fafc",
  fontFamily: "system-ui,sans-serif",
  borderLeft: "1px solid #e2e8f0",
  borderRight: "1px solid #e2e8f0",
};
const statusBar: React.CSSProperties = {
  padding: "12px 16px",
  background: "#7c3aed",
  color: "white",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: 600,
};
const content: React.CSSProperties = { flex: 1, padding: 16, overflow: "auto" };
const bottomNav: React.CSSProperties = {
  display: "flex",
  borderTop: "1px solid #e2e8f0",
  background: "white",
  paddingBottom: "env(safe-area-inset-bottom)",
};
const tabBtn: React.CSSProperties = {
  flex: 1,
  padding: "10px 0",
  background: "none",
  border: 0,
  cursor: "pointer",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};
const card: React.CSSProperties = {
  background: "white",
  padding: 16,
  borderRadius: 12,
  marginTop: 12,
  boxShadow: "0 1px 3px rgba(0,0,0,.06)",
};
const linkBtn: React.CSSProperties = {
  display: "inline-block",
  marginTop: 10,
  padding: "8px 14px",
  background: "#7c3aed",
  color: "white",
  borderRadius: 8,
  textDecoration: "none",
  fontSize: 14,
};
const row: React.CSSProperties = {
  display: "block",
  padding: "14px 0",
  borderBottom: "1px solid #e2e8f0",
  textDecoration: "none",
  color: "#1e293b",
  fontWeight: 500,
};
