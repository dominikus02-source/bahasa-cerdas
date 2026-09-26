import { redirect } from "next/navigation";

/** Legacy Komunitas route: fitur tidak lagi menjadi bagian dari IA murid. */
export default function LegacyRedirect() {
  redirect("/murid/beranda");
}
