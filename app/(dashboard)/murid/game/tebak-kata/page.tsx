import { redirect } from "next/navigation";

/** Legacy game route: Tebak Kata sekarang canonical di Arena. */
export default function LegacyRedirect() {
  redirect("/arena/game/tebak-kata");
}
