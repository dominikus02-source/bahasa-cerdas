import { redirect } from "next/navigation";

/** Legacy learning-skill route: Progresku adalah tujuan progres murid yang canonical. */
export default function PlayerSkillsLegacyRedirect() {
  redirect("/murid/progresku");
}
