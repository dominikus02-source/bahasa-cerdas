import { redirect } from "next/navigation";

type SearchParams = Record<string, string | string[] | undefined>;

// Alamat lama dipertahankan agar tautan/cookie lama tidak rusak, tetapi tidak
// lagi merender halaman login kedua. Arahkan ke rute bersama di dalam scope APK.
export default async function LegacyArenaLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const redirectParams = new URLSearchParams();
  const error = params.error;
  if (typeof error === "string" && error) redirectParams.set("error", error);
  redirectParams.set("next", "/arena");
  redirect(`/arena/login?${redirectParams.toString()}`);
}
