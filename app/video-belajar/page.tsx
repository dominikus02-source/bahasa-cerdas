import { db } from "@/lib/db";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import VideoClient from "./VideoClient";

export const dynamic = "force-dynamic";

async function getVideos() {
  try {
    const seedUser = await db.user.findUnique({ where: { email: "guru@demo.com" }, select: { id: true } })
    const where: any = { isPublished: true }
    if (seedUser) where.creatorId = { not: seedUser.id }
    return await db.video.findMany({
      where,
      orderBy: { views: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        description: true,
        videoUrl: true,
        thumbnailUrl: true,
        duration: true,
        source: true,
        category: true,
        grade: true,
        views: true,
        isPremium: true,
        createdAt: true,
        creator: { select: { id: true, fullName: true } },
      },
    });
  } catch {
    return [];
  }
}

export default async function VideoBelajarPage() {
  const videos = await getVideos();

  return (
    <>
      <PageNavbar />
      <VideoClient initialVideos={videos as any} />
      <PageFooter />
    </>
  );
}
