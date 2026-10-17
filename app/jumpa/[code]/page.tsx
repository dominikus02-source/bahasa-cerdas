import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";
import { dashboardForUser } from "@/lib/auth/redirect";
import { isValidRoomCode } from "@/lib/jumpa/code";
import { effectiveRole } from "@/lib/jumpa/permissions";
import { loadActor, loadRoomContext } from "@/lib/jumpa/service";
import JumpaApp from "@/components/jumpa/JumpaApp";

export const dynamic = "force-dynamic";

export default async function JumpaRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!isValidRoomCode(code)) notFound();

  const user = await getUser();
  if (!user) redirect(`/login?next=/jumpa/${code}`);

  const ctx = await loadRoomContext(code, user);
  if (!ctx) notFound();

  const actor = await loadActor(user);
  const role = effectiveRole(actor) ?? "MURID";
  const subtitle = [ctx.view.groupName, ctx.view.hostName ? `Host: ${ctx.view.hostName}` : null].filter(Boolean).join(" · ") || null;

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
    />
  );
}
