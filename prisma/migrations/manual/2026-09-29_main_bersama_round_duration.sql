-- Main Bersama: durasi per soal dipilih guru dan dikunci per sesi.
ALTER TABLE "MainSession" ADD COLUMN "roundDurationMs" INTEGER NOT NULL DEFAULT 60000;
