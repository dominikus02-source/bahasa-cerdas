-- Add photos array to StudentKarya, so students can embed multiple photos
-- (e.g. interview photos) in an ARTIKEL, not just a single cover image.
ALTER TABLE "StudentKarya" ADD COLUMN "photos" TEXT[] NOT NULL DEFAULT '{}';
