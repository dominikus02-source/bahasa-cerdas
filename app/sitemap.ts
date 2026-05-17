import { MetadataRoute } from "next";
import { db } from "@/lib/db";

const SITE_URL = "https://bahasacerdas.site";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/artikel`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/kamus`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/marketplace`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE_URL}/video-belajar`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/ai-bc`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/loker`, lastModified: new Date(), changeFrequency: "daily", priority: 0.5 },
    { url: `${SITE_URL}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${SITE_URL}/register`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];

  try {
    const artikelList = await db.artikel.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true },
    });
    const artikelPages: MetadataRoute.Sitemap = artikelList.map((a) => ({
      url: `${SITE_URL}/artikel/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    const karyaList = await db.karya.findMany({
      where: { isPublished: true },
      select: { id: true, updatedAt: true },
    });
    const karyaPages: MetadataRoute.Sitemap = karyaList.map((k) => ({
      url: `${SITE_URL}/marketplace/${k.id}`,
      lastModified: k.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    return [...staticPages, ...artikelPages, ...karyaPages];
  } catch {
    return staticPages;
  }
}
