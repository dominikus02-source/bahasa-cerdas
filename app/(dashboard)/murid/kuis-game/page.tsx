import { redirect } from "next/navigation";

/** Legacy Kuis Tempur route: gunakan entry point canonical Arena. */
export default function LegacyRedirect() {
  redirect("/arena/game/kuis-tempur");
}
