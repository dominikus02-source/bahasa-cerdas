import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { dashboardForUser } from "@/lib/auth/redirect";
import { INVITE_TOKEN_RE, isValidRoomCode } from "@/lib/jumpa/code";
import { loadRoomContext } from "@/lib/jumpa/service";
import { tierView } from "@/lib/jumpa/tiers";
import JumpaApp from "@/components/jumpa/JumpaApp";

export const dynamic = "force-dynamic";

const KIND_LABEL = { KELAS: "Kelas", GURU: "Ruang guru", MURID: "Belajar bareng" } as const;

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
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  const ctx = await loadRoomContext(code, user, 0, new Date(), inviteToken);
  if (!ctx) notFound();

  const role = ctx.effective ?? "MURID";
  const place = ctx.view.groupName ?? ctx.view.communityName ?? KIND_LABEL[ctx.view.kind];
  const subtitle = [place, ctx.view.hostName ? `Pemandu: ${ctx.view.hostName}` : null].filter(Boolean).join(" · ") || null;

  return (
    <JumpaApp
      code={ctx.view.code}
      title={ctx.view.title}
      subtitle={subtitle}
      displayName={user.nickname || user.fullName}
      bcRole={role}
      canJoin={ctx.decision.ok}
      denyMessage={ctx.decision.ok ? null : ctx.decision.message}
      dashboardHref={dashboardForUser(user.role, user.isFounder)}
      inviteToken={inviteToken}
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
