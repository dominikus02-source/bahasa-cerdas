import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { stateFromJson } from "./controller";
import { AI_DIAGNOSTIC_SELECTION_VERSION } from "./config";
import type { AiSessionState } from "./types";

export async function loadAiSessionState(sessionId: string, userId: string): Promise<AiSessionState | null> {
  const session = await db.adaptivePracticeSession.findFirst({
    where: { id: sessionId, userId },
    select: { questionIds: true },
  });
  if (!session) return null;
  return stateFromJson(session.questionIds);
}

export async function saveAiSessionState(
  sessionId: string,
  userId: string,
  state: AiSessionState
): Promise<boolean> {
  const result = await db.adaptivePracticeSession.updateMany({
    where: { id: sessionId, userId },
    data: { questionIds: state as unknown as Prisma.InputJsonValue },
  });
  return result.count > 0;
}

export function evidenceMetadata() {
  return {
    version: "1.0",
    selectionVersion: AI_DIAGNOSTIC_SELECTION_VERSION,
    ai: true,
  };
}