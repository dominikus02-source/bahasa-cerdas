// The UKBI/TKA exam screen, mounted inside /arena.
//
// Arena's simulation cards start a run here. At /kompetisi/... the whole run would
// sit outside the APK's /arena scope, so a student would be pushed into a browser
// tab the moment they pressed "Mulai" — mid-exam, with a timer running.
//
// The screen is unchanged and still serves the dashboard at its original path. It
// asks useKompetisiHref() where it is mounted, so device-check, the test and the
// result screen all stay in whichever tree the run started in.
//
// The segment MUST stay [paketId]: the component reads params.paketId.
export { default } from "@/app/(dashboard)/kompetisi/[paketId]/page";
