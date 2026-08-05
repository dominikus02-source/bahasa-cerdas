import { redirect } from "next/navigation";

export default async function ArenaTulisPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  redirect(type ? `/murid/karya/tulis?type=${type}` : "/murid/karya/tulis");
}