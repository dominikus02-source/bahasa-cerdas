-- JUMPA: simpan izin panggung webinar agar pulih setelah peserta tersambung ulang.
-- ADDITIVE: satu kolom boolean dengan nilai awal aman (tidak ada peserta yang otomatis naik panggung).
ALTER TABLE "JumpaParticipant" ADD COLUMN "stageApproved" BOOLEAN NOT NULL DEFAULT false;
