import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { dashboardForUser } from "@/lib/auth/redirect";
import { isUmum, UMUM_HOME } from "@/lib/auth/roles";
import { INVITE_TOKEN_RE, isValidRoomCode } from "@/lib/jumpa/code";
import { loadRoomContext } from "@/lib/jumpa/service";
import { tierView } from "@/lib/jumpa/tiers";
import JumpaApp from "@/components/jumpa/JumpaApp";
import JumpaLoginGate from "@/components/jumpa/JumpaLoginGate";

export const dynamic = "force-dynamic";

// Pratinjau tautan generik: tanpa judul/nama ruang (keamanan anak), tetap noindex.
const OG_IMAGE = { url: "/jumpa/og-jumpa-1200x630.jpg", width: 1200, height: 630, alt: "JUMPA — ruang video kelas BahasaCerdas" };
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const title = "Gabung JUMPA — BahasaCerdas";
  const description = "Ruang video kelas, langsung di BahasaCerdas.";
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, type: "website", url: `/jumpa/${isValidRoomCode(code) ? code : ""}`, siteName: "BahasaCerdas", locale: "id_ID", images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title, description, images: [OG_IMAGE.url] },
  };
}

const KIND_LABEL = { KELAS: "Kelas", GURU: "Ruang guru", MURID: "Belajar bareng", UMUM: "Ruang umum" } as const;

export default async function JumpaRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ u?: string | string[] }>;
}) {
  const { code } = await params;
  if (!isValidRoomCode(code)) notFound();
  const sp = await searchParams;
  const rawInvite = typeof sp.u === "string" ? sp.u : null;
  const inviteToken = rawInvite && INVITE_TOKEN_RE.test(rawInvite) ? rawInvite : null;

  const user = await getUser();
  if (!user) {
    const next = `/jumpa/${code}${inviteToken ? `?u=${inviteToken}` : ""}`;
    return <JumpaLoginGate loginHref={`/login?next=${encodeURIComponent(next)}`} />;
  }

  const ctx = await loadRoomContext(code, user, 0, new Date(), inviteToken);
  if (!ctx) notFound();

  const role = ctx.effective ?? "MURID";
  // Isolasi satu arah: akun UMUM yang membuka ruang sekolah tidak melihat
  // judul/nama pemandu, hanya pesan penolakan. Akun sekolah boleh membuka
  // ruang UMUM (tautan/kode) — judul tampil hanya bila boleh masuk.
  const isUmumRoom = ctx.room.kind === "UMUM";
  const crossed = isUmumRoom ? !ctx.decision.ok && ctx.effective !== "UMUM" : ctx.effective === "UMUM";
  // Perlindungan murid: pengingat di lobi saat murid membuka ruang akun umum.
  const umumNotice = isUmumRoom && ctx.effective === "MURID" && ctx.decision.ok
    ? "Ruang ini dibuat akun umum, bukan kelasmu. Jangan bagikan data pribadi (nomor HP, alamat, sekolah). Kalau ada yang membuatmu tidak nyaman, keluar dan tekan Laporkan."
    : null;
  const place = ctx.view.groupName ?? ctx.view.communityName ?? KIND_LABEL[ctx.view.kind];
  const subtitle = crossed ? null : [place, ctx.view.hostName ? `Pemandu: ${ctx.view.hostName}` : null].filter(Boolean).join(" · ") || null;

  return (
    <JumpaApp
      code={ctx.view.code}
      title={crossed ? "Ruang JUMPA" : ctx.view.title}
      subtitle={subtitle}
      displayName={user.nickname || user.fullName}
      bcRole={role}
      canJoin={ctx.decision.ok}
      denyMessage={ctx.decision.ok ? null : ctx.decision.message}
      denyCode={ctx.decision.ok ? null : ctx.decision.code}
      scheduledAt={ctx.view.scheduledAt}
      mode={ctx.view.mode}
      share={
        // Ruang UMUM: lembar bagikan hanya untuk akun UMUM (guru/murid yang
        // ikut lewat tautan tidak menyebarkan ruang ini).
        ((ctx.room.kind === "MURID" || isUmumRoom || crossed) && !ctx.decision.ok) || (isUmumRoom && ctx.effective !== "UMUM")
          ? null
          : {
              code: ctx.view.code,
              title: ctx.view.title,
              kind: ctx.room.kind,
              scheduledAt: ctx.view.scheduledAt,
              // Tautan 24 jam: ruang guru / ruang umum, oleh pembuat/pemandu.
              canLink: (ctx.room.kind === "GURU" || ctx.room.kind === "UMUM") && ctx.decision.ok && ctx.decision.roomRole !== "MEMBER",
            }
      }
      dashboardHref={isUmum(user.role) ? UMUM_HOME : dashboardForUser(user.role, user.isFounder)}
      inviteToken={inviteToken}
      umumNotice={umumNotice}
      tier={tierView({
        tier: ctx.view.tier,
        kind: ctx.room.kind,
        maxParticipants: ctx.room.maxParticipants,
        maxDurationMin: ctx.room.maxDurationMin,
        viewerIsGuruCreator: ctx.room.createdById === user.id && ctx.effective === "GURU",
      })}
    />
  );
}
