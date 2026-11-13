const { build } = require("esbuild");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const out = path.join(__dirname, ".jumpa-recording-test.cjs");
const state = global.__jumpaRecordingTest = {
  user: { id: "host" }, creator: "host", allowed: true, premium: true, storedTier: "PREMIUM",
  live: true, enabled: true, jobs: [], starts: 0, stops: 0, locked: true, events: [],
};
const mocks = {
  "@/lib/supabase/server": 'export async function getUser(){return global.__jumpaRecordingTest.user}',
  "@/lib/db": 'const s=global.__jumpaRecordingTest; export const db={jumpaEvent:{findMany:async()=>[]},$transaction: async fn=>fn({$queryRaw:async()=>[{acquired:s.locked}],jumpaEvent:{create:async event=>s.events.push(event)}})}',
  "@/lib/rate-limit": 'export async function rateLimitRoute(){return null}',
  "@/lib/jumpa/code": 'export function isValidRoomCode(code){return code==="abc-defg-hjk"}',
  "@/lib/jumpa/service": 'export async function loadRoomContext(){const s=global.__jumpaRecordingTest;return {room:{id:"room",createdById:s.creator,livekitRoomName:"private-room",status:s.live?"LIVE":"ENDED"},view:{tier:s.storedTier},decision:{ok:s.allowed}}}',
  "@/lib/jumpa/entitlement": 'export async function resolveJumpaTier(){return {tier:global.__jumpaRecordingTest.premium?"PREMIUM":"FREE"}}',
  "@/lib/jumpa/http": 'export function jumpaDisabledResponse(){return null};export function jumpaJson(body,status=200){return Response.json(body,{status})};export function jumpaError(status,code,error){return Response.json({code,error},{status})}',
  "@/lib/jumpa/recording": 'const s=global.__jumpaRecordingTest;export const recordingEnabled=()=>s.enabled;export const recordingActive=status=>[0,1,2].includes(status);export const canManageRecording=i=>i.creator&&i.premium&&i.live;export const egressClient=()=>({listEgress:async()=>s.jobs,stopEgress:async()=>{s.stops++}});export async function startRecording(){s.starts++;s.jobs=[{egressId:"EG_test",status:0,fileResults:[]}];return s.jobs[0]}',
};
(async()=>{
  await build({entryPoints:["app/api/jumpa/rooms/[code]/recording/route.ts"],outfile:out,bundle:true,platform:"node",format:"cjs",
    external:["livekit-server-sdk"],plugins:[{name:"recording-fakes",setup(b){
      b.onResolve({filter:/^@\//},a=> mocks[a.path] ? {path:a.path,namespace:"mock"} : undefined);
      b.onLoad({filter:/.*/,namespace:"mock"},a=>({contents:mocks[a.path],loader:"js"}));
    }}]});
  const route=require(out), ctx={params:Promise.resolve({code:"abc-defg-hjk"})};
  const request=action=>new Request("http://localhost/api/recording",{method:"POST",body:JSON.stringify({action})});
  let n=0;
  const foreign = new Request("http://localhost/api/recording", { method:"POST",headers:{origin:"https://other.example"},body:JSON.stringify({action:"start"})});
  assert.equal((await route.POST(foreign,ctx)).status,403);n++;
  async function expectStatus(action,status){const r=await route.POST(request(action),ctx);assert.equal(r.status,status);n++;}
  state.user=null;await expectStatus("start",401);
  state.user={id:"member"};await expectStatus("start",403);
  state.allowed=false;await expectStatus("stop",403);
  state.user={id:"host"};state.allowed=true;state.premium=false;await expectStatus("start",403);
  state.premium=true;state.storedTier="FREE";await expectStatus("start",403);
  state.storedTier="PREMIUM";state.live=false;await expectStatus("start",403);
  state.live=true;state.enabled=false;await expectStatus("start",503);
  state.enabled=true;state.locked=false;await expectStatus("start",409);
  state.locked=true;await expectStatus("bogus",400);
  await expectStatus("start",200);assert.equal(state.starts,1);n++;
  await expectStatus("start",200);assert.equal(state.starts,1);n++;
  const restored=await (await route.GET(new Request("http://localhost/api/recording"),ctx)).json();
  assert.equal(restored.active,true);n++;
  state.jobs=[{egressId:"EG_test",status:3,fileResults:[{filename:"private.mp4"}]}];
  state.user={id:"member"};
  const member=await (await route.GET(new Request("http://localhost/api/recording"),ctx)).json();
  assert.deepEqual(member.recordings,[]);n++;
  state.user={id:"host"};state.jobs=[{egressId:"EG_test",status:1,fileResults:[]}];
  state.premium=false;await expectStatus("stop",200);assert.equal(state.stops,1);n++;
  assert.equal(state.events.length,2);n++;
  console.log("JUMPA recording route: "+n+" checks passed");
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{if(fs.existsSync(out))fs.unlinkSync(out);delete global.__jumpaRecordingTest});
