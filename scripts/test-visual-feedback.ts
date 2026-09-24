/**
 * P2.11 visual feedback unit gate.
 * Run: npx tsx scripts/test-visual-feedback.ts
 */
import {
  createVisualFeedbackState,
  triggerImpact,
  triggerVictory,
  shakeOffset,
  flashAlpha,
  floatingDamageOpacity,
  floatingDamageOffset,
} from "../src/game/rpg/rendering/visual-feedback";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean): void {
  if (condition) {
    passed += 1;
    console.log("PASS", label);
  } else {
    failed += 1;
    console.error("FAIL", label);
  }
}

const base = createVisualFeedbackState();
check("1. fresh feedback is inert", base.freezeUntilMs === 0 && base.shakeIntensity === 0);
const hit = triggerImpact(base, 1000, 0.75);
check("2. impact creates micro freeze", hit.freezeUntilMs > 1000);
check("3. impact creates shake", hit.shakeIntensity > 0 && hit.shakeUntilMs > 1000);
check("4. impact creates flash", hit.flashAlpha > 0 && hit.flashUntilMs > 1000);
check("5. shake decays to zero after window", shakeOffset(hit, hit.shakeUntilMs + 1).x === 0 && shakeOffset(hit, hit.shakeUntilMs + 1).y === 0);
check("6. flash decays to zero after window", flashAlpha(hit, hit.flashUntilMs + 1) === 0);

const victory = triggerVictory(base, 2000);
check("7. victory adds shake", victory.shakeIntensity >= 3);
check("8. victory adds flash", victory.flashAlpha >= 0.12);

const damage = {
  id: 1,
  value: 24,
  x: 0.5,
  y: 0.5,
  startedAtMs: 3000,
  durationMs: 620,
  critical: false,
};
check("9. floating damage visible during lifetime", floatingDamageOpacity(damage, 3300) > 0);
check("10. floating damage hidden after lifetime", floatingDamageOpacity(damage, 3700) === 0);
check("11. floating damage rises over time", floatingDamageOffset(damage, 3500) < floatingDamageOffset(damage, 3100));\n\nconst burst = createImpactBurst(1, 0.5, 0.5, 4000, 0.8);\ncheck("12. impact burst starts visible", impactBurstOpacity(burst, 4100) > 0);\ncheck("13. impact burst expires cleanly", impactBurstOpacity(burst, 4401) === 0);\nconst particle = impactBurstParticle(burst, 0, 4200);\ncheck("14. burst particle is deterministic and finite", Number.isFinite(particle.x) && Number.isFinite(particle.y) && particle.size > 0);\n\nconst victoryBurst = createImpactBurst(2, 0.5, 0.5, 5000, 1, true);\ncheck("15. victory burst has longer lifetime", impactBurstOpacity(victoryBurst, 5400) > 0);\ncheck("16. victory burst remains finite", Number.isFinite(impactBurstParticle(victoryBurst, 11, 5250).x));

console.log(`\nVisual feedback gate: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
