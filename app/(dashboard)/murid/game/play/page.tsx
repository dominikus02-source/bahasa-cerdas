import { redirect } from "next/navigation";

/** Legacy game play: Kuis Tempur sekarang dimainkan melalui route canonical Arena. */
export default function LegacyRedirect() {
  redirect("/arena/game/kuis-tempur");
}
