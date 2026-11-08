/**
 * Indeks FIXTURE QA VISUAL LOKAL (BC_QA_FIXTURE=1, dev saja). Merender
 * /qa-fixture/frame dalam iframe dengan lebar perangkat tetap.
 * Query: view=guru-founder|guru|murid|murid-founder|login, theme=light|dark,
 * app=1|0, sizes=320,360,... (opsional), landscape=1 menambah 740x360.
 */
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const DEFAULT_SIZES = [320, 360, 390, 412, 430, 768];
const VIEWS = ["guru-founder", "guru", "murid-founder", "murid", "login"];

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  if (process.env.NODE_ENV === "production" || process.env.BC_QA_FIXTURE !== "1") notFound();
  const q = await searchParams;
  const view = VIEWS.includes(q.view ?? "") ? q.view! : "guru-founder";
  const theme = q.theme === "dark" ? "dark" : "light";
  const app = q.app === "0" ? "0" : "1";
  const sizes = (q.sizes ?? "").split(",").map(Number).filter((n) => n >= 280 && n <= 1400);
  const frames: Array<[number, number]> = (sizes.length ? sizes : DEFAULT_SIZES).map((w) => [w, 720]);
  if (q.landscape === "1") frames.push([740, 360]);
  const src = `/qa-fixture/frame?view=${view}&theme=${theme}&app=${app}`;
  const link = (patch: Record<string, string>) => {
    const p = new URLSearchParams({ view, theme, app, ...(q.sizes ? { sizes: q.sizes } : {}), ...(q.landscape ? { landscape: q.landscape } : {}), ...patch });
    return `/qa-fixture?${p.toString()}`;
  };
  return (
    <div style={{ padding: 12, fontFamily: "system-ui" }}>
      <p style={{ fontWeight: 800 }}>QA FIXTURE LOKAL — data palsu, bukan produksi</p>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: 8, margin: "8px 0 12px" }}>
        {VIEWS.map((v) => <a key={v} href={link({ view: v })} style={{ fontWeight: v === view ? 800 : 400 }}>{v}</a>)}
        <span>|</span>
        <a href={link({ theme: "light" })}>terang</a><a href={link({ theme: "dark" })}>gelap</a>
        <span>|</span>
        <a href={link({ app: "1" })}>mode app</a><a href={link({ app: "0" })}>mode web</a>
        <span>|</span>
        <a href={link({ landscape: q.landscape === "1" ? "0" : "1" })}>landscape</a>
      </nav>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        {frames.map(([w, h]) => (
          <figure key={`${w}x${h}`} style={{ margin: 0 }}>
            <figcaption style={{ fontSize: 12 }}>{w}×{h}</figcaption>
            <iframe title={`${view} ${w}x${h}`} src={src} width={w} height={h} style={{ border: "1px solid #999" }} />
          </figure>
        ))}
      </div>
    </div>
  );
}
