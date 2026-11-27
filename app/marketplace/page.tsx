import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import { db } from "@/lib/db";
import PageNavbar from "@/components/public/PageNavbar";
import PageFooter from "@/components/public/PageFooter";
import MarketplaceClient from "./MarketplaceClient";
import PublisherPublications from "./PublisherPublications";
import { withQueryTimeout } from "@/lib/db/with-query-timeout";

export const dynamic = "force-dynamic";

async function getItems() {
  try {
    const seedUser = await withQueryTimeout(
      db.user.findUnique({ where: { email: "guru@demo.com" }, select: { id: true } }),
    );
    const where: Prisma.KaryaWhereInput = { isPublished: true };
    if (seedUser) where.sellerId = { not: seedUser.id };
    return await withQueryTimeout(db.karya.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        title: true,
        type: true,
        price: true,
        images: true,
        downloads: true,
        seller: { select: { fullName: true } },
      },
    }));
  } catch {
    return [];
  }
}

async function TeacherMarketplace() {
  const items = await getItems();
  return <MarketplaceClient initialItems={items} />;
}

export default function MarketplacePage() {

  return (
    <>
      <PageNavbar />
      <main className="min-h-screen ui-app-bg">
        <PublisherPublications />
        <section id="toko-karya" className="scroll-mt-24" aria-label="Toko Karya Guru">
          <Suspense fallback={<div role="status" className="mx-auto max-w-7xl px-4 py-8 text-bc-text-2">Memuat Toko Karya…</div>}>
            <TeacherMarketplace />
          </Suspense>
        </section>
      </main>
      <PageFooter />
    </>
  );
}
