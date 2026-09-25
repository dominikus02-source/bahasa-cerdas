/**
 * Camera transform regression gate.
 * Run: npx tsx scripts/test-rpg-camera.ts
 */
import {
  createCamera,
  followTargetWithFeel,
  screenToWorldScaled,
  worldToScreenScaled,
} from "../src/game/rpg/rendering/camera";

let passed = 0;
let failed = 0;
function check(label: string, ok: boolean): void {
  if (ok) { passed += 1; console.log("PASS", label); }
  else { failed += 1; console.error("FAIL", label); }
}
function near(a: number, b: number, eps = 1e-9): boolean { return Math.abs(a - b) <= eps; }

const camera = createCamera({ x: 0.5, y: 0.5 }, 1280, 720);
const mapW = 46;
const mapH = 36;

for (const zoom of [0.8, 1, 1.25]) {
  const zoomed = { ...camera, zoom };
  const samples = [
    { x: 0.5, y: 0.5 },
    { x: 0.23, y: 0.71 },
    { x: 0.81, y: 0.19 },
  ];
  for (const world of samples) {
    const screen = worldToScreenScaled(world, zoomed, mapW, mapH);
    const roundTrip = screenToWorldScaled(screen, zoomed, mapW, mapH);
    check("round-trip zoom " + zoom + " @ " + world.x + "," + world.y, near(roundTrip.x, world.x) && near(roundTrip.y, world.y));
  }
}

const followed = followTargetWithFeel(camera, { x: 0.5, y: 0.5 }, "right", mapW, mapH);
check("look-ahead remains normalized", followed.position.x >= 0 && followed.position.x <= 1 && followed.position.y >= 0 && followed.position.y <= 1);
check("look-ahead is restrained", followed.position.x < 0.51);

console.log("\nCamera gate: " + passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);