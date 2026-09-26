import { redirect } from "next/navigation";

/** Legacy game lobby: Kuis Tempur sekarang punya satu entry point canonical di Arena. */
export default function LegacyRedirect() {
  redirect("/arena/game/kuis-tempur");
}
