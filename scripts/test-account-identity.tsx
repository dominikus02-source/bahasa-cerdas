import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveIdentity, normalizedIdentity, type IdentitySource } from "../lib/account/identity";
import { VerifiedBadge } from "../components/arena/UserName";
import { useUserStore } from "../store";
const now = new Date("2026-10-03T00:00:00Z");
const future = "2026-11-03T00:00:00Z";
const past = "2026-09-03T00:00:00Z";
const cases: [string, IdentitySource, string | null][] = [
 ["Founder", {role:"GURU",isFounder:true}, "founder"],
 ["Guru Free", {role:"GURU"}, null],
 ["Guru Pro", {role:"GURU",isPremium:true,premiumUntil:future}, "teacher"],
 ["Guru Pro Trial", {role:"GURU",trialEndsAt:future}, "trial"],
 ["Murid Free", {role:"MURID"}, null],
 ["Murid Premium", {role:"MURID",isPremium:true,premiumUntil:future}, "student"],
 ["Murid FREE plan cannot grant premium", {role:"MURID",premiumPlan:"FREE",isPremium:true,premiumUntil:future}, null],
 ["Murid flag without expiry", {role:"MURID",isPremium:true}, null],
 ["Murid expired", {role:"MURID",isPremium:true,premiumUntil:past}, null],
 ["Murid trial isn't paid", {role:"MURID",trialEndsAt:future}, null],
 ["Murid cancelled overrides stale flag", {role:"MURID",isPremium:true,premiumUntil:future,subscriptions:[{status:"CANCELLED",currentPeriodEnd:future}]}, null],
 ["Expired subscription overrides flag", {role:"GURU",isPremium:true,premiumUntil:future,subscriptions:[{status:"EXPIRED",currentPeriodEnd:past}]}, null],
 ["Murid valid subscription", {role:"MURID",subscriptions:[{status:"ACTIVE",currentPeriodStart:past,currentPeriodEnd:future}]}, "student"],
 ["Future-start subscription denied", {role:"GURU",subscriptions:[{status:"ACTIVE",currentPeriodStart:future,currentPeriodEnd:future}]}, null],
 ["Teacher subscription overrides trial", {role:"GURU",trialEndsAt:future,subscriptions:[{status:"ACTIVE",currentPeriodEnd:future}]}, "teacher"],
 ["Founder precedence", {role:"GURU",isFounder:true,isPremium:true,premiumUntil:future}, "founder"],
 ["Admin privileges aren't founder badge", {role:"ADMIN"}, null],
 ["Expiry exact boundary", {role:"MURID",isPremium:true,premiumUntil:now}, null],
 ["Invalid date", {role:"MURID",isPremium:true,premiumUntil:"invalid"}, null],
];
for (const [name,user,expected] of cases) {
 const resolved = resolveIdentity(user,now);
 assert.equal(resolved.badgeKind,expected,name);
 const html = renderToStaticMarkup(<VerifiedBadge badgeKind={resolved.badgeKind} size={24} />);
 if (!expected) assert.equal(html,"",name);
 else { assert.ok(html.includes('role="img"'),name); assert.ok(html.includes('aria-label='),name); assert.ok(!/>\s*(Founder|Guru Pro|Premium)\s*</.test(html),name); assert.ok(!html.includes("clock"),name); }
}
assert.equal(renderToStaticMarkup(<VerifiedBadge isPremium />),"");
assert.equal(resolveIdentity({role:"MURID",subscriptions:[{status:"ACTIVE",currentPeriodEnd:future}]},now).plan,"MURID_PREMIUM");
useUserStore.getState().setUser({id:"a",isPremium:true,isFounder:true,badgeKind:"founder"});
useUserStore.getState().setUser({id:"b",role:"MURID"});
assert.equal(useUserStore.getState().isPremium,false);
assert.equal(useUserStore.getState().isFounder,false);
assert.equal(useUserStore.getState().badgeKind,null);
console.log(`PASS ${cases.length} identity scenarios, icon-only markup, trial without clock, student tier, account-switch isolation.`);
