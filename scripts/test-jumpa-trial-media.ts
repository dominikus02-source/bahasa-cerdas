/** Simulasi kebijakan/galat 20 identitas; bukan uji 20 koneksi media nyata. */
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { canCreateRoom, evaluateJoin, publishSourcesFor, canModerate, canInvite, type JumpaActor } from "../lib/jumpa/permissions";
import { buildJoinGrant } from "../lib/jumpa/token";
import { parseParticipantLimit } from "../lib/jumpa/server-limits";
import { isOpenMeeting } from "../lib/jumpa/trial-policy";
import { VisibleTracks, shouldReceiveTrack } from "../components/jumpa/visible-subscriptions";
import { mediaErrorMessage, withDefaultDeviceFallback } from "../components/jumpa/media-errors";

async function main() {
  assert.equal(parseParticipantLimit(undefined), 30);
  assert.equal(parseParticipantLimit("150"), 150);
  for (const raw of ["abc", "0", "501", "100.5", "-1"]) assert.throws(() => parseParticipantLimit(raw));
  const now = new Date("2026-11-02T14:00:00Z");
  const actors: JumpaActor[] = ["GURU", "MURID", "UMUM"].map(role => ({ role: role as JumpaActor["role"], isFounder: false, isJunior: false, umumEnabled: true }));
  const room = { kind: "GURU" as const, mode: "MEETING" as const, openMeeting: true, status: "LIVE" as const, isLocked: false, startedAt: now, maxDurationMin: 120, maxParticipants: 30 };
  const relation = { isCreator: false, isGroupOwner: false, isGroupMember: false, groupActive: false, isExistingParticipant: false, isRemoved: false };
  assert.equal(isOpenMeeting({ policyVersion: 2 }), true);
  assert.equal(isOpenMeeting({}), false);
  for (const actor of actors) {
    assert.ok(canCreateRoom({ actor, kind: "GURU", group: null }).ok);
    const join = evaluateJoin({ actor, room, relation, activeOthers: 19, now });
    assert.ok(join.ok);
    assert.equal(evaluateJoin({ actor, room: { ...room, isLocked: true }, relation, activeOthers: 0, now }).ok, false);
    assert.equal(evaluateJoin({ actor, room, relation: { ...relation, isRemoved: true }, activeOthers: 0, now }).ok, false);
    assert.equal(evaluateJoin({ actor, room, relation, activeOthers: 30, now }).ok, false);
    assert.equal(evaluateJoin({ actor, room: { ...room, openMeeting: false }, relation, activeOthers: 0, now }).ok, false);
    assert.equal(evaluateJoin({ actor, room: { ...room, kind: "KELAS", openMeeting: false }, relation, activeOthers: 0, now }).ok, false);
    const host = { userId: "host", roomRole: "HOST" as const, effective: actor.role as "GURU" | "MURID" | "UMUM" };
    assert.ok(canModerate({ actor: host, action: "END", roomKind: "GURU" }).ok);
    assert.ok(canInvite({ actor: host, roomKind: "GURU", invite: { kind: "LINK" } }).ok);
    assert.equal(canModerate({ actor: { ...host, roomRole: "MEMBER" }, action: "END", roomKind: "GURU" }).ok, false);
  }
  assert.equal(evaluateJoin({ actor: { ...actors[1], isJunior: true }, room, relation, activeOthers: 0, now }).ok, false);
  const grants = await Promise.all(Array.from({ length: 20 }, async (_, i) => {
    const role = actors[i % actors.length].role as "GURU" | "MURID" | "UMUM";
    const sources = publishSourcesFor("MEMBER", role, { kind: "GURU", allowMuridScreenShare: false });
    assert.ok(sources.includes("screen_share"));
    return buildJoinGrant("meeting", sources);
  }));
  for (const grant of grants) {
    assert.equal(grant.canPublish, true); assert.ok(grant.canPublishSources?.includes(1)); assert.ok(grant.canPublishSources?.includes(2));
    assert.equal(grant.roomAdmin, false); assert.equal(grant.roomRecord, false);
  }
  // 150 publications: only visible page is received; audio remains available.
  let changes = 0;
  const visible = new VisibleTracks(() => changes++);
  const tokens = Array.from({ length: 150 }, () => Symbol("tile"));
  for (let i = 0; i < 9; i++) visible.set(String(i), tokens[i], true);
  const receiving = (audioOnly = false, pageVisible = true) => Array.from({ length: 150 }, (_, i) => shouldReceiveTrack({ kind: "video", source: "camera", visible: visible.has(String(i)), screenVisible: false, audioOnly, pageVisible })).filter(Boolean).length;
  assert.equal(receiving(), 9); assert.equal(receiving(true), 0); assert.equal(receiving(false, false), 0);
  const duplicate = Symbol("focus"); visible.set("0", duplicate, true); visible.set("0", tokens[0], false);
  assert.equal(visible.has("0"), true); visible.set("0", duplicate, false); assert.equal(visible.has("0"), false);
  for (let i = 1; i < 9; i++) visible.set(String(i), tokens[i], false);
  for (let i = 9; i < 13; i++) visible.set(String(i), tokens[i], true);
  assert.equal(receiving(), 4); assert.ok(changes > 0);
  assert.equal(shouldReceiveTrack({ kind: "audio", source: "microphone", visible: false, screenVisible: false, audioOnly: true, pageVisible: false }), true);
  assert.equal(shouldReceiveTrack({ kind: "audio", source: "screen_share_audio", visible: false, screenVisible: false, audioOnly: false, pageVisible: true }), false);
  assert.equal(shouldReceiveTrack({ kind: "video", source: "screen_share", visible: true, screenVisible: true, audioOnly: true, pageVisible: true }), true);
  const view = readFileSync("components/jumpa/JumpaRoomView.tsx", "utf8");
  assert.ok(view.includes("autoSubscribe: false"));
  let selected = 0, fallback = 0;
  const output = await withDefaultDeviceFallback(async () => { selected++; throw { name: "NotFoundError" }; }, async () => { fallback++; return "default"; });
  assert.equal(output, "default"); assert.equal(selected, 1); assert.equal(fallback, 1);
  await assert.rejects(withDefaultDeviceFallback(async () => { throw new DOMException("denied", "NotAllowedError"); }, async () => { throw Error("must not retry permission denial"); }), { name: "NotAllowedError" });
  assert.match(mediaErrorMessage({ name: "NotAllowedError" }, "Mikrofon"), /izin/);
  assert.match(mediaErrorMessage({ name: "NotReadableError" }, "Kamera"), /aplikasi lain/);
  const token = readFileSync("app/api/jumpa/rooms/[code]/token/route.ts", "utf8");
  assert.equal(token.includes("? []"), false);
  const controller = readFileSync("components/jumpa/media-controller.tsx", "utf8");
  assert.equal(controller.includes("setCameraEnabled(true)"), false);
  console.log("Kebijakan lintas peran, 20 grant, 150 publikasi/9 atau 4 video terlihat, audio, akses privat, lock/remove, dan fallback perangkat: lulus. Media nyata belum diuji.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
