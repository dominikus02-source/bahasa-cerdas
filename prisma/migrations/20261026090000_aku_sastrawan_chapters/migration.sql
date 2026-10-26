-- AKU SASTRAWAN: chapters for novel and long-form writing projects
CREATE TABLE "WritingChapter" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL DEFAULT '',
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WritingChapter_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WritingChapter_projectId_orderIndex_key" ON "WritingChapter"("projectId", "orderIndex");
CREATE INDEX "WritingChapter_projectId_updatedAt_idx" ON "WritingChapter"("projectId", "updatedAt");
ALTER TABLE "WritingChapter" ADD CONSTRAINT "WritingChapter_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "WritingProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
