import { redirect } from "next/navigation";

/** Legacy KataStra hub: Lari Kata sekarang satu-satunya route canonical di Arena. */
export default function LegacyRedirect() {
  redirect("/arena/game/lari-kata");
}
