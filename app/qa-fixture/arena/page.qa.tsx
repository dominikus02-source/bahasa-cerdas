/**
 * FIXTURE QA LOKAL — halaman klien Arena asli di dalam replika shell Arena
 * (app/arena/layout.tsx, varian APK: BottomNav, tanpa sidebar) beserta CSS Arena.
 * Hanya dikompilasi bila BC_QA_FIXTURE=1; tidak ada bypass auth (API dimock skrip).
 */
import "@/app/arena/arena.css";
import "@/app/arena/player-theme.css";
import "@/components/game/game-env.css";
import { notFound } from "next/navigation";
import { ArenaHeader } from "@/components/arena/ArenaHeader";
import { ShellLayout } from "@/components/shell/ShellLayout";
import { ArenaWorkspaceContainer } from "@/components/arena/workspace-container";
import { ArenaClientWrapper } from "@/app/arena/arena-client";
import { BottomNav } from "@/app/arena/bottom-nav";
import { QaControls } from "../QaControls";
import { QaPathname } from "../QaPathname";
import { QaClientPage } from "../QaClientPage";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production" || process.env.BC_QA_FIXTURE !== "1") notFound();
  const q = await searchParams;
  const route = q.route && /^\/arena[a-zA-Z0-9\-/\[\]]*$/.test(q.route) ? q.route : null;
  if (!route) notFound();
  const theme = q.theme === "dark" ? "dark" : "light";
  const font = Math.min(200, Math.max(80, Number(q.font) || 100));
  const pathname = route.replace(/\[[^\]]+\]/g, "qa-1");
  return (
    <>
      <QaControls theme={theme} app={q.app !== "0"} font={font} />
      <QaPathname pathname={pathname}>
        <ShellLayout
          rootClassName="arena-theme min-h-screen pb-20 md:pb-0 ui-app-bg"
          header={<ArenaHeader avatar={null} fullName="QA Murid Palsu" homeHref="/murid/beranda" />}
          mainClassName="mx-auto px-0 w-full py-0"
          bottomNav={<BottomNav />}
        >
          <ArenaClientWrapper>
            <ArenaWorkspaceContainer apk><QaClientPage route={route} /></ArenaWorkspaceContainer>
          </ArenaClientWrapper>
        </ShellLayout>
      </QaPathname>
    </>
  );
}
