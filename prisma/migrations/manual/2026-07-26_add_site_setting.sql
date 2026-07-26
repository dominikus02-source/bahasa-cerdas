-- Generic key-value settings table — first use: admin-editable landing page
-- promo video link. Run this in the Supabase SQL Editor.

-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- Enable RLS to match the rest of the public schema (app access goes
-- through Prisma with the service role, which bypasses RLS).
ALTER TABLE "SiteSetting" ENABLE ROW LEVEL SECURITY;
