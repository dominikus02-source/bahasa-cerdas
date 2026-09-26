import { redirect } from "next/navigation";

/** Legacy Lari Kata route: gunakan game canonical di Arena. */
export default function LegacyRedirect() {
  redirect("/arena/game/lari-kata");
}
