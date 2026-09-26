import { redirect } from "next/navigation";

/** Legacy game route: Susun Kata sekarang canonical di Arena. */
export default function LegacyRedirect() {
  redirect("/arena/game/susun-kata");
}
