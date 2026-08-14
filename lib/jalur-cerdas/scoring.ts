export interface JalurQuestionAnswer {
  id: string;
  jawaban: string | number;
}

export interface JalurScore {
  correctCount: number;
  answeredCount: number;
  totalQuestions: number;
  score: number;
}

export function isJalurAnswerCorrect(expected: string | number, actual: unknown): boolean {
  if (actual === undefined || actual === null) return false;
  return String(actual).toLowerCase() === String(expected).toLowerCase();
}

/** Hitung skor dari jawaban mentah menggunakan kunci yang hanya ada di server. */
export function scoreJalurAnswers(
  questions: JalurQuestionAnswer[],
  answers: Record<string, unknown>
): JalurScore {
  let correctCount = 0;
  let answeredCount = 0;

  for (const question of questions) {
    const answer = answers[question.id];
    if (answer === undefined || answer === null) continue;
    answeredCount += 1;
    if (isJalurAnswerCorrect(question.jawaban, answer)) correctCount += 1;
  }

  return {
    correctCount,
    answeredCount,
    totalQuestions: questions.length,
    score: questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0,
  };
}
