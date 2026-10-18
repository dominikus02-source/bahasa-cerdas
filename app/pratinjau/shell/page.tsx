import { notFound } from "next/navigation";
import { MuridShellFrame } from "@/components/shell/MuridShellFrame";
import { levelFromXp } from "@/lib/gamification/levels";
import { rankFromLevel } from "@/lib/gamification/ranks";
import HomeFeedPage from "@/app/(dashboard)/murid/beranda/page";

export const dynamic = "force-dynamic";

/** Pratinjau Student Shell + beranda murid dengan data contoh. Hanya bila BC_UI_PREVIEW=1. */
export default function Page() {
  if (process.env.BC_UI_PREVIEW !== "1") notFound();
  return (
    <MuridShellFrame user={{ fullName: "Dimas Pratama", avatar: null, role: "MURID", isFounder: false }} rank={rankFromLevel(levelFromXp(1800))}>
      <HomeFeedPage />
    </MuridShellFrame>
  );
}
