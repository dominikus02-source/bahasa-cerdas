import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resumeLoginSession } from "../lib/auth/resume-login-session";
let count = 0;
async function probe(user: unknown, search = "", arenaEntry = false, status = 200) {
  const controller = new AbortController();
  const fetcher: typeof fetch = async (url, options) => {
    assert.equal(url, "/api/user/me?fresh=1");
    assert.equal(options?.credentials, "same-origin"); assert.equal(options?.cache, "no-store");
    return new Response(JSON.stringify({success: true, user}), {status});
  };
  return resumeLoginSession({search, arenaEntry, signal:controller.signal, fetcher});
}
async function run() {
for (const [role,target] of [["MURID","/murid/beranda"],["GURU","/guru/beranda"],["UMUM","/umum"],["ADMIN","/admin"]]) {
  assert.equal(await probe({role,isFounder:false}),target); count++;
}
assert.equal(await probe({role:"MURID",isFounder:false},"",true),"/arena"); count++;
assert.equal(await probe({role:"UMUM",isFounder:false},"",true),"/umum"); count++;
assert.equal(await probe({role:"GURU",isFounder:false},"",true),null); count++;
for (const user of [null,{}, {role:"EVIL",isFounder:false},{role:"MURID",isFounder:"true"}]) {
 assert.equal(await probe(user),null); count++;
}
for (const q of ["?error=google_expired","?reset=success","?code=abc","?type=recovery","?token_hash=abc"]) {
 let called=false;
 const target=await resumeLoginSession({search:q,arenaEntry:false,signal:new AbortController().signal,fetcher:async()=>{called=true;throw Error();}});
 assert.equal(target,null);assert.equal(called,false);count++;
}
for (const next of ["//evil.example","/\\evil.example","/login","/arena/login","/auth/arena-login"]) {
 assert.equal(await probe({role:"MURID",isFounder:false},"?next="+encodeURIComponent(next)),"/murid/beranda");count++;
}
assert.equal(await probe({role:"MURID",isFounder:false},"?next=/murid/belajar"),"/murid/belajar");count++;
assert.equal(await probe(null,"",false,401),null);count++;
assert.equal(await probe(null,"",false,503),null);count++;
const c=new AbortController();c.abort();
assert.equal(await resumeLoginSession({search:"",arenaEntry:false,signal:c.signal,fetcher:async()=>new Response(JSON.stringify({success:true,user:{role:"MURID",isFounder:false}}))}),null);count++;
assert.equal(await resumeLoginSession({search:"",arenaEntry:false,signal:new AbortController().signal,fetcher:async()=>{throw Error("offline");}}),null);count++;
// Native cold start always opens login; no automatic cache/cookie clearing. Logout still signs out.
const native=readFileSync("mobile/lib/features/shell/app_shell.dart","utf8");
assert.match(native,/loginPath/);count++;
const webview=readFileSync("mobile/lib/features/webview/webview_screen.dart","utf8");
assert.doesNotMatch(webview,/clearCookies\(|clearLocalStorage\(|clearCache\(/);count++;
assert.match(readFileSync("app/api/auth/logout/route.ts","utf8"),/await supabase.auth.signOut\(\)/);count++;
assert.match(readFileSync("node_modules/@supabase/ssr/src/utils/constants.ts","utf8"),/maxAge: 400 \* 24 \* 60 \* 60/);count++;
console.log(`RESULT ${count} passed, 0 failed`);
}
run().catch(e=>{console.error(e);process.exitCode=1;});
