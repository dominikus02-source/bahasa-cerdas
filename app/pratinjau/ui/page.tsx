import { notFound } from "next/navigation";
import UiGallery from "./UiGallery";

export const dynamic = "force-dynamic";

/** Galeri primitif UI untuk tangkapan layar lokal. Hanya bila BC_UI_PREVIEW=1. */
export default function Page() {
  if (process.env.BC_UI_PREVIEW !== "1") notFound();
  return <UiGallery />;
}
