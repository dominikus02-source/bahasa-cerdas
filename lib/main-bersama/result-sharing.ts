type ParticipantResult = {
  displayName: string;
  correctAnswers: number;
  eligibleRounds: number;
  progressPercent: number;
};

export type ShareableResults = {
  contentTitle: string;
  gameMode: "jelajah-kata" | "kota-cahaya";
  totalRounds: number;
  participants: ParticipantResult[];
};

export function buildResultSummary(
  results: ShareableResults,
  className?: string | null,
  includeStudents = false,
) {
  const eligible = results.participants.filter(
    (participant) => participant.eligibleRounds > 0,
  );
  const average = eligible.length
    ? Math.round(
        eligible.reduce(
          (sum, participant) => sum + participant.progressPercent,
          0,
        ) / eligible.length,
      )
    : 0;
  const lines = [
    "Hasil Main Bersama — BahasaCerdas",
    results.contentTitle,
    ...(className ? [`Kelas: ${className}`] : []),
    `Permainan: ${results.gameMode === "jelajah-kata" ? "Jelajah Kata" : "Kota Cahaya"}`,
    `Jumlah soal: ${results.totalRounds}`,
    `Peserta: ${results.participants.length} siswa`,
    `Rata-rata nilai: ${average}% (${eligible.length} siswa mengikuti soal)`,
  ];
  if (includeStudents) {
    lines.push("", "Rincian siswa:");
    for (const participant of [...results.participants].sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "id"),
    )) {
      lines.push(
        `${participant.displayName}: ${participant.eligibleRounds > 0 ? `${participant.progressPercent}% (${participant.correctAnswers}/${participant.eligibleRounds} benar)` : "Belum mengikuti soal"}`,
      );
    }
  }
  return lines.join("\n");
}

function csvCell(value: string | number) {
  const raw = String(value);
  // Spreadsheet apps must treat student names as text, including formula-like names.
  const safe = /^\s*[=+@-]|^[\t\r\n]/.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}

export function buildResultsCsv(results: ShareableResults) {
  return (
    "\uFEFF" +
    [
      ["Nama siswa", "Jawaban benar", "Soal yang diikuti", "Nilai (%)"],
      ...[...results.participants]
        .sort((a, b) => a.displayName.localeCompare(b.displayName, "id"))
        .map((participant) => [
          participant.displayName,
          participant.correctAnswers,
          participant.eligibleRounds,
          participant.eligibleRounds > 0 ? participant.progressPercent : "",
        ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n")
  );
}

export function resultShareLinks(subject: string, text: string) {
  return {
    email: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(text)}`,
  };
}
