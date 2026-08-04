// Quiz result screen, mounted inside /arena. See the sibling take/page.tsx for why
// this route exists and why the segment name is fixed.
//
// Note the segment carries a QuizSubmission id here, not an assignment id — that
// is what /api/murid/quiz/submission/[id] resolves.
export { default } from "@/app/(dashboard)/murid/tugasku/[assignId]/result/page";
