-- Threaded replies on StudentKaryaComment — a reply points back at the
-- comment it's answering via parentId. Run this in the Supabase SQL Editor.

-- AlterTable
ALTER TABLE "StudentKaryaComment" ADD COLUMN "parentId" TEXT;

-- CreateIndex
CREATE INDEX "StudentKaryaComment_parentId_idx" ON "StudentKaryaComment"("parentId");

-- AddForeignKey
ALTER TABLE "StudentKaryaComment" ADD CONSTRAINT "StudentKaryaComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "StudentKaryaComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
