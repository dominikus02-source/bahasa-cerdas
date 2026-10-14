import { NextResponse } from 'next/server';
import { resolveVerifiedTeacherActor } from '@/src/main-bersama/adapters/auth/teacher-actor';
import { PrismaBankSoalQuestionSource } from '@/src/main-bersama/adapters/bank-soal/bank-soal-source';
import { PrismaBankThemeQuestionSource } from '@/src/main-bersama/infrastructure/repositories/prisma-bank-theme-source';
import { normalizePackageRef } from '@/src/main-bersama/adapters/bank-soal/package-ref';
import { evaluatePackageCompatibility } from '@/src/main-bersama/adapters/bank-soal/compatibility';

/** Read-only, teacher-authenticated preview. Never expose keys on student routes. */
export async function POST(request: Request) {
  const actor = await resolveVerifiedTeacherActor();
  if (!actor) return NextResponse.json({ error: 'Akses guru diperlukan.' }, { status: 401 });
  if (Number(request.headers.get('content-length') ?? 0) > 10000)
    return NextResponse.json({ error: 'Permintaan terlalu besar.' }, { status: 413 });
  try {
    const raw: unknown = await request.json();
    const ref = normalizePackageRef((raw as { packageRef?: unknown })?.packageRef);
    if (!ref) return NextResponse.json({ error: 'Paket soal tidak valid.' }, { status: 400 });
    const source = await new PrismaBankSoalQuestionSource(new PrismaBankThemeQuestionSource(), actor.userId).loadQuestions(ref);
    if (!source.ok) return NextResponse.json({ error: 'Paket soal tidak ditemukan.' }, { status: 404 });
    const compat = evaluatePackageCompatibility(source.questions);
    const questions = compat.items.slice(0, 50).map((item, index) => {
      const original = source.questions[index];
      const adapted = item.question;
      if (adapted) return {
        prompt: adapted.prompt,
        options: adapted.options.map((option) => option.text),
        correctIndex: adapted.type === 'short-answer' ? null : adapted.options.findIndex((option) => option.id === adapted.correctOptionId),
        ...(adapted.type === 'short-answer' ? { answerText: adapted.correctOptionId } : {}),
        explanation: adapted.explanation ?? '',
        ...(adapted.passage ? { passage: adapted.passage } : {}),
      };
      return {
        prompt: original?.prompt ?? '', options: original?.options ?? [], correctIndex: null,
        explanation: original?.explanation ?? '',
        unsupportedReason: item.reason || 'Format soal belum didukung Main Bersama.',
      };
    });
    return NextResponse.json({ title: source.contentTitle || 'Paket soal', questions, total: compat.total, supported: compat.supported }, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch {
    return NextResponse.json({ error: 'Pratinjau belum dapat dimuat.' }, { status: 400 });
  }
}
