/** Live integration, only disposable accounts created by this run. Never prints secrets. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const base = new URL(process.env.ACCOUNT_QA_BASE_URL || "http://localhost:3107");
const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
if (!process.argv.includes("--execute")) {
  console.log(`PRECHECK: localhost=${["localhost", "127.0.0.1"].includes(base.hostname)}, adminConfigured=${Boolean(key)}. Use --execute to test disposable accounts.`);
  process.exit(0);
}
assert.ok(["localhost", "127.0.0.1"].includes(base.hostname), "Only local application servers are allowed.");
assert.ok(key, "Admin Supabase key is missing; no accounts created.");
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.DATABASE_URL, "Missing Auth/DB configuration.");
const run = randomUUID();
const password = `Qa!${randomUUID()}`;
const nextPassword = `Qa!${randomUUID()}`;
const authUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(authUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
const db = new PrismaClient();
const created = [];
const uploaded = [];
const sdk = () => createClient(authUrl, anon, { auth: { persistSession: false, autoRefreshToken: false } });
function browserSession() {
  const jar = new Map();
  return async (path, method = "GET", body) => {
    const response = await fetch(new URL(path, base), {
      method, redirect: "manual", signal: AbortSignal.timeout(60000),
      headers: { Origin: base.origin, Cookie: [...jar].map(([k,v]) => `${k}=${v}`).join("; "), ...(body ? {"Content-Type":"application/json"} : {}) },
      ...(body ? {body:JSON.stringify(body)} : {}),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0]; const split = pair.indexOf("=");
      const name = pair.slice(0,split), value = pair.slice(split+1);
      if (value) jar.set(name,value); else jar.delete(name);
    }
    const text = await response.text();
    let data; try { data = JSON.parse(text); } catch { data = null; }
    return { status:response.status, text, data, location:response.headers.get("location") };
  };
}
async function fixture(kind, fields = {}) {
  const email = `qa-account-${run}-${kind}@example.com`;
  const result = await admin.auth.admin.createUser({ email, password, email_confirm:true, app_metadata:{account_qa_run:run}, user_metadata:{role:fields.role || "MURID",full_name:`QA ${kind}`} });
  assert.ifError(result.error); assert.ok(result.data.user);
  const id = `qa-account-${run}-${kind}`;
  const record = {id, authId:result.data.user.id, email}; created.push(record);
  await db.user.create({data:{id,supabaseId:record.authId,email,fullName:`QA ${kind}`,role:"MURID",onboarded:true,...fields}});
  const request = browserSession();
  assert.equal((await request("/api/auth/login","POST",{email,password})).status,200,`Login ${kind}`);
  return {...record,request};
}
async function checkRoute(request, path) {
  const response = await request(path);
  assert.equal(response.status,200,`Page ${path}`);
  assert.ok(!response.text.includes('id="__next_error__"') && !response.text.includes("Internal Server Error"),`Server error on ${path}`);
}
async function main() {
  const future = new Date(Date.now()+86400000), past = new Date(Date.now()-86400000);
  const cases = [
    ["founder",{role:"GURU",isFounder:true},"founder"],
    ["guru-free",{role:"GURU",trialStartedAt:past,trialEndsAt:past},null],
    ["guru-paid",{role:"GURU",isPremium:true,premiumPlan:"PRO",premiumUntil:future},"teacher"],
    ["guru-trial",{role:"GURU",trialStartedAt:new Date(),trialEndsAt:future},"trial"],
    ["murid-free",{role:"MURID",isPremium:true,premiumUntil:past},null],
    ["murid-paid",{role:"MURID",isPremium:true,premiumPlan:"PRO",premiumUntil:future},"student"],
  ];
  for (const [kind,fields,badge] of cases) {
    const account = await fixture(kind,fields);
    const me = await account.request("/api/user/me?fresh=1"); assert.equal(me.status,200);
    assert.equal(me.data.user.badgeKind,badge,`Badge ${kind}`);
    for (const path of ["/arena","/arena/toko-koin","/arena/player","/main-bersama/join",fields.role === "GURU" ? "/guru/profile" : "/murid/profile",fields.role === "GURU" ? "/guru/pengaturan" : "/murid/pengaturan"]) await checkRoute(account.request,path);
    console.log(`PASS authenticated role/routes: ${kind}`);
  }
  const account = await fixture("security");
  let result = await account.request("/api/user/password","POST",{currentPassword:"wrong-test-password",newPassword:nextPassword});
  assert.equal(result.status,403);
  const second = sdk(); const login = await second.auth.signInWithPassword({email:account.email,password}); assert.ifError(login.error);
  const refreshToken = login.data.session.refresh_token;
  result = await account.request("/api/user/password","POST",{currentPassword:password,newPassword:nextPassword}); assert.equal(result.status,200); assert.equal(result.data.revocationPending,undefined);
  const revoked = await sdk().auth.refreshSession({refresh_token:refreshToken}); assert.ok(revoked.error,"Other device refresh token must be revoked.");
  assert.ok((await sdk().auth.signInWithPassword({email:account.email,password})).error,"Old password must fail.");
  const signed = sdk(); const newLogin = await signed.auth.signInWithPassword({email:account.email,password:nextPassword}); assert.ifError(newLogin.error);
  assert.equal((await account.request("/api/auth/login","POST",{email:account.email,password:nextPassword})).status,200);
  const storagePath = `toko/${account.id}/qa.png`;
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p1cAAAAASUVORK5CYII=","base64");
  const upload = await signed.storage.from("avatars").upload(storagePath,png,{contentType:"image/png",upsert:false}); assert.ifError(upload.error);
  uploaded.push({bucket:"avatars",path:storagePath});
  const owners = await db.$queryRaw`SELECT owner_id FROM storage.objects WHERE bucket_id='avatars' AND name=${storagePath}`;
  assert.equal(owners[0]?.owner_id,account.authId,"Storage owner must match authenticated user.");
  result = await account.request("/api/user/account","DELETE",{currentPassword:nextPassword,confirmation:"hapus"}); assert.equal(result.status,400);
  result = await account.request("/api/user/account","DELETE",{currentPassword:nextPassword,confirmation:"HAPUS AKUN",userId:"not-this-user"}); assert.equal(result.status,200);
  assert.ok((await admin.auth.admin.getUserById(account.authId)).error,"Auth user must be removed.");
  const deleted = await db.user.findUnique({where:{id:account.id}}); assert.equal(deleted.email,`deleted-${account.id}@account.invalid`); assert.equal(deleted.fullName,"Akun dihapus");
  const remaining = await db.$queryRaw`SELECT name FROM storage.objects WHERE bucket_id='avatars' AND name=${storagePath}`; assert.equal(remaining.length,0);
  console.log("PASS live password verification, password replacement, global revocation, owned Storage cleanup, confirmation, Auth deletion, DB anonymization.");
  const otpAccount = await fixture("email");
  const link = await admin.auth.admin.generateLink({type:"magiclink",email:otpAccount.email}); assert.ifError(link.error);
  result = await otpAccount.request("/api/user/password","POST",{verificationCode:link.data.properties.email_otp,newPassword:nextPassword}); assert.equal(result.status,200,"Real email OTP verification");
  console.log("PASS real OTP verification (generated without sending email). Email delivery and interactive Google consent require their respective inbox/account.");
}
let failed = false;
try { await main(); } catch (error) { failed=true; console.error(`FAIL live account QA: ${error instanceof Error ? error.message : "Unknown error"}`); }
finally {
  for (const file of uploaded) { const {error}=await admin.storage.from(file.bucket).remove([file.path]); if(error){failed=true;console.error("QA Storage cleanup failed.");} }
  for (const account of created.reverse()) {
    const auth = await admin.auth.admin.getUserById(account.authId);
    if (auth.data?.user && auth.data.user.app_metadata.account_qa_run !== run) { failed=true;console.error("Cleanup ownership mismatch; account preserved.");continue; }
    if(auth.data?.user){const {error}=await admin.auth.admin.deleteUser(account.authId);if(error){failed=true;console.error("QA Auth cleanup failed; DB record preserved.");continue;}}
    await db.user.deleteMany({where:{id:account.id,supabaseId:account.authId}});
  }
  await db.$disconnect();
}
process.exitCode = failed ? 1 : 0;
