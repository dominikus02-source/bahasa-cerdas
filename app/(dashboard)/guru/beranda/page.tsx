import GuruBerandaClient from "@/components/guru/GuruBerandaClient";
import { getUser } from "@/lib/supabase/server";

function resolveGreetingName(user: Awaited<ReturnType<typeof getUser>>): string {
  const nickname = user?.nickname?.trim();
  if (nickname) return nickname;

  const fullName = user?.fullName?.trim();
  if (fullName) return fullName.split(/\s+/)[0] || fullName;

  return "Guru";
}

export default async function GuruBerandaPage() {
  const user = await getUser();

  return <GuruBerandaClient displayName={resolveGreetingName(user)} />;
}
