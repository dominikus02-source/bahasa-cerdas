"use client";

import { Crown, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import "@/components/billing/billing.css";

interface SidebarPremiumBadgeProps {
  plan: string;
  isTrialActive: boolean;
  daysRemaining: number;
  remainingCredits: number | null;
  creditsTotal?: number;
  premiumUntil: Date | null;
}

const kredit = (sisa: number | null, total?: number) => (sisa !== null && total ? `${sisa}/${total} kredit` : null);

export function SidebarPremiumBadge({
  plan,
  isTrialActive,
  daysRemaining,
  remainingCredits,
  creditsTotal,
  premiumUntil,
}: SidebarPremiumBadgeProps) {
  if (plan === "MURID_FREE") return null;

  let tone: "pro" | "coba" | "gratis" = "gratis";
  let title = "Guru Gratis";
  let meta: string | null = kredit(remainingCredits, creditsTotal);
  let cta: string | null = "Jadi Pro";
  let Icon = Zap;

  if (plan === "FOUNDER") {
    tone = "pro"; title = "Akses Pendiri"; meta = "Semua fitur Pro"; cta = null; Icon = Crown;
  } else if (plan === "GURU_PRO") {
    tone = "pro"; title = "Guru Pro"; Icon = Crown; cta = null;
    meta = premiumUntil
      ? `Sampai ${new Date(premiumUntil).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })}`
      : "Aktif";
  } else if (isTrialActive && plan === "GURU_PRO_TRIAL") {
    tone = "coba"; title = "Guru Pro (coba)"; Icon = Sparkles;
    meta = [`${daysRemaining} hari lagi`, kredit(remainingCredits, creditsTotal)].filter(Boolean).join(" · ");
  }

  return (
    <div className="shell-premium-badge bp-side">
      <Link href="/guru/berlangganan" className="bp-side__card" data-tone={tone} aria-label={`${title}${meta ? `, ${meta}` : ""}. Buka paket.`}>
        <Icon size={18} aria-hidden="true" />
        <span style={{ minWidth: 0 }}>
          <span className="bp-side__title">{title}</span>
          {meta && <span className="bp-side__meta">{meta}</span>}
        </span>
        {cta && <span className="bp-side__cta" aria-hidden="true">{cta}</span>}
      </Link>
    </div>
  );
}
