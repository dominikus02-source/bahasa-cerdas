import { db } from "@/lib/db";
import { packageDraftSchema } from "./question-authoring";

export async function saveQuestionPackage(teacherId: string, input: unknown) {
  const { title, kelas, questions } = packageDraftSchema.parse(input);
  const set = await db.soalSet.create({
    data: {
      title,
      kelas,
      creatorId: teacherId,
      isPublic: false,
      coverColor: "from-emerald-500 to-teal-600",
      maxQuestions: 50,
      questions: {
        create: questions.map((q, index) => ({
          text: q.prompt,
          options: q.options,
          correctAnswer:
            q.type === "ISIAN_SINGKAT" ? q.answerText : String(q.correctIndex),
          explanation: q.explanation || null,
          kelas,
          uploaderId: teacherId,
          source: "MANUAL",
          type: q.type,
          // Stable source ordering is createdAt + id. Explicit times retain editor order.
          createdAt: new Date(Date.now() + index),
        })),
      },
    },
    select: {
      id: true,
      title: true,
      kelas: true,
      _count: { select: { questions: true } },
    },
  });
  return {
    id: set.id,
    title: set.title,
    kelas: set.kelas,
    questionCount: set._count.questions,
  };
}
