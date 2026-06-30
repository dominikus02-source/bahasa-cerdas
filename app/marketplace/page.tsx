import { db } from "@/lib/db";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import MarketplaceClient from "./MarketplaceClient";

export const dynamic = "force-dynamic";

async function getItems() {
  try {
    const seedUser = await db.user.findUnique({ where: { email: "guru@demo.com" }, select: { id: true } })
    const where: any = { isPublished: true }
    if (seedUser) where.sellerId = { not: seedUser.id }
    return await db.karya.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        seller: { select: { fullName: true } },
      },
    });
  } catch {
    return [];
  }
}

export default async function MarketplacePage() {
  const items = await getItems();

  return (
    <>
      <PageNavbar />
      <MarketplaceClient initialItems={items as any} />
      <PageFooter />
    </>
  );
}
