import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

/**
 * Token global (app/theme/tokens.css) sebagai warna Tailwind.
 * `bg-bc-surface`, `text-bc-text-2`, `border-bc-line`, `bg-bc-accent/20`, …
 * Modifier opasitas bekerja lewat color-mix, jadi token tetap hex di satu file.
 */
const tok = (name: string) => `color-mix(in srgb, var(--clr-${name}) calc(<alpha-value> * 100%), transparent)`;
const BC_COLORS = [
  "bg", "surface", "surface-2", "border", "border-strong", "line", "line-strong", "field",
  "text", "text-2", "text-3", "on-brand", "focus",
  "accent", "accent-strong", "accent-soft",
  "success", "success-soft", "warning", "warning-strong", "warning-soft",
  "danger", "danger-soft", "violet", "violet-soft", "info", "info-soft",
  // Aksen per audiens (murid = violet/gradien merek, guru = biru) — tokens.css §3
  "aud", "aud-strong", "aud-soft", "on-aud",
] as const;
const bcColors = Object.fromEntries(BC_COLORS.map((n) => [n, tok(n)]));

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    // P2.8.4 — RPG UI lives in src/game/rpg/ui. Without this glob, utilities
    // used ONLY there (e.g. bg-stone-950/85) were never generated: the quest
    // card rendered transparent with invisible white text in production.
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "\"Segoe UI\"", "sans-serif"],
        // Judul memakai Inter juga (keputusan CEO 2026-10-19: tanpa Georgia).
        display: ["var(--font-inter)", "Inter", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "\"Segoe UI\"", "sans-serif"],
        "junior-heading": ["Elegant Bloom", "sans-serif"],
        "junior-body": ["Elegant Bloom", "sans-serif"],
        "game-display": ["Newscrash", "sans-serif"],
      },
      colors: {
        bc: bcColors,
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          light: "#FEF2F2",
          dark: "#991B1B",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        surface: "hsl(var(--surface))",
        "surface-elevated": "hsl(var(--surface-elevated))",
        "surface-muted": "hsl(var(--surface-muted))",
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        danger: "hsl(var(--danger))",
        gold: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          400: "#D4AF37",
          500: "#C5A028",
          600: "#A8841F",
        },
        zinc: {
          900: "#18181B",
          800: "#27272A",
          700: "#3F3F46",
        },
      },
      borderRadius: {
        "bc-xs": "var(--bc-r-xs)",
        "bc-sm": "var(--bc-r-sm)",
        "bc-icon": "var(--bc-r-icon)",
        "bc-ctl": "var(--bc-r-ctl)",
        "bc-tile": "var(--bc-r-tile)",
        "bc-card": "var(--bc-r-card)",
        "bc-hero": "var(--bc-r-hero)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        "bc-depth": "var(--bc-depth)",
        "bc-1": "var(--bc-shadow-1)",
        "bc-2": "var(--bc-shadow-2)",
        "bc-3": "var(--bc-shadow-3)",
        "bc-glow": "var(--bc-glow-brand)",
      },
      fontSize: {
        "bc-hero": ["var(--bc-fs-hero)", { lineHeight: "1.05", letterSpacing: "-0.02em", fontWeight: "900" }],
        "bc-h1": ["var(--bc-fs-h1)", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "800" }],
        "bc-h2": ["var(--bc-fs-h2)", { lineHeight: "1.25", fontWeight: "800" }],
        "bc-h3": ["var(--bc-fs-h3)", { lineHeight: "1.3", fontWeight: "700" }],
        "bc-body": ["var(--bc-fs-body)", { lineHeight: "1.55" }],
        "bc-small": ["var(--bc-fs-small)", { lineHeight: "1.5" }],
        "bc-eyebrow": ["var(--bc-fs-eyebrow)", { lineHeight: "1.3", letterSpacing: "0.12em", fontWeight: "800" }],
      },
      transitionTimingFunction: {
        bc: "var(--bc-ease)",
        "bc-spring": "var(--bc-spring)",
      },
      backgroundImage: {
        "bc-brand": "var(--bc-grad-brand)",
        "bc-murid": "var(--bc-grad-murid)",
        "bc-aud-grad": "var(--bc-grad-aud)",
        "bc-premium": "var(--bc-grad-premium)",
        "bc-surface": "var(--bc-grad-surface)",
        "bc-tint": "var(--bc-grad-tint)",
        "batik-subtle": "url('/batik bg bc.png')",
        "batik-header": "url('/batik-header-profile-bc.png')",
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in-left": {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-right": {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 5px rgba(185, 28, 28, 0.3)" },
          "50%": { boxShadow: "0 0 25px rgba(185, 28, 28, 0.5)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in-left": "fade-in-left 0.6s ease-out forwards",
        "fade-in-right": "fade-in-right 0.6s ease-out forwards",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
        float: "float 3s ease-in-out infinite",
      },
    },
  },
  // Dibutuhkan oleh setiap tempat yang memakai kelas `prose` (AI Cerdik, AI BC,
  // artikel, marketplace, artikel guru) untuk merender <ReactMarkdown>. Sudah
  // dipakai di 4 halaman sebelum ini, tapi paketnya tidak pernah terpasang —
  // kelas `prose` selama ini tidak menghasilkan CSS apa pun (Tailwind Preflight
  // menghapus margin/ukuran bawaan heading & list, jadi hasilnya bukan cuma
  // "tidak berubah" tapi tanpa jarak antar-elemen sama sekali).
  plugins: [typography],
};

export default config;
