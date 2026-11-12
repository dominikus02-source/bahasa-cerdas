import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: "/opt/google/chrome/chrome" });
const ctx = await b.newContext({ viewport: { width: 320, height: 780 }, isMobile: true, hasTouch: true, serviceWorkers: "block" });
const p = await ctx.newPage();
await p.route("**/api/**", (r) => r.fulfill({ status: 200, contentType: "application/json", body: "{}" }));
await p.goto("http://127.0.0.1:3100" + (process.argv[2] || "/"), { waitUntil: "networkidle" }).catch(() => {});
await p.waitForTimeout(2000);
console.log(await p.evaluate(() => {
  const out = []; const sw = () => document.documentElement.scrollWidth;
  const walk = (el, depth) => {
    for (const c of el.children) {
      const prev = c.style.display; c.style.display = "none"; const w = sw(); c.style.display = prev;
      if (w <= 321) { out.push(`${"  ".repeat(depth)}${c.tagName}.${String(c.className).slice(0, 80)} -> hides overflow`); if (depth < 12) walk(c, depth + 1); return; }
    }
  };
  out.push("sw=" + sw()); walk(document.body, 0); return out.join("\n");
}));
await b.close();
