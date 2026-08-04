// Quiz-taking screen, mounted inside /arena.
//
// Arena's assignment list links here; at /murid/tugasku/... it would fall outside
// the APK's /arena scope and open a browser tab mid-quiz. The screen is unchanged
// and still serves the student dashboard at its original path — it asks
// useTugasHref() where it is mounted so "back" lands in the matching list.
//
// The segment MUST stay [assignId]: the component reads params.assignId, and a
// differently-named segment would hand it undefined.
export { default } from "@/app/(dashboard)/murid/tugasku/[assignId]/take/page";
