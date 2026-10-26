-- AKU SASTRAWAN private writing projects. IF NOT EXISTS supports deployments where
-- the matching manual SQL has already been applied.
CREATE TABLE IF NOT EXISTS "WritingProject" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "genre" TEXT NOT NULL DEFAULT 'CERPEN',
  "synopsis" TEXT,
  "content" TEXT NOT NULL DEFAULT '',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "wordCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WritingProject_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "WritingProject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "WritingProject_userId_updatedAt_idx" ON "WritingProject"("userId", "updatedAt");
CREATE INDEX IF NOT EXISTS "WritingProject_userId_genre_idx" ON "WritingProject"("userId", "genre");
