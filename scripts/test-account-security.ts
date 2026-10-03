/** Route-level tests with isolated Auth/DB/Storage doubles; no live accounts touched. */
import assert from "node:assert/strict";
import Module from "node:module";
import { NextRequest } from "next/server";
const events: string[] = [];
let validPassword = true, authId = "auth-owner", allowed = true, saldo = 0, soldWorks = 0, storageFails = false, updateFails = false, factors = false, aal = "aal1";
let loggedIn = true;
let uploadPath = "";
let uploadFails = false;
let adminAllowed = true;
let amrMethod = "oauth";
let amrTime = Math.floor(Date.now()/1000);
let updatedData: Record<string, unknown> | undefined;
const currentAuth = { auth: {
 getUser: async () => ({data:{user:{id:"auth-owner",email:"owner@example.test",factors:factors?[{status:"verified"}]:[]}},error:null}),
 getClaims: async () => ({data:{claims:{sub:"auth-owner",amr:[{method:amrMethod,timestamp:amrTime}]}},error:null}),
 getSession: async () => ({data:{session:{access_token:"verified-jwt"}}}),
 updateUser: async () => { events.push("password-update"); return {error:updateFails?{code:"weak_password"}:null}; },
 signOut: async ({scope}:{scope:string}) => {events.push(`original-signout-${scope}`);return {error:null};},
 mfa: {getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal}})},
}, storage:{from:(bucket:string)=>({
 upload:async(path:string,_file:File,options:{upsert:boolean})=>{assert.equal(bucket,"avatars");assert.equal(options.upsert,false);uploadPath=path;return {error:uploadFails?{statusCode:"403"}:null};},
 getPublicUrl:(path:string)=>({data:{publicUrl:`https://example.test/avatars/${path}`}}),
})} };
const sdkAuth = { auth: {
 updateUser: currentAuth.auth.updateUser,
 signInWithPassword: async () => {events.push("password-verify");return {error:validPassword?null:{message:"invalid"},data:{user:{id:authId},session:{access_token:"reauth-jwt"}}};},
 verifyOtp: async () => {events.push("otp-verify");return {error:null,data:{user:{id:authId},session:{access_token:"reauth-jwt"}}};},
 signInWithOtp: async () => ({error:null}),
 signOut: async () => {events.push("verifier-cleanup");return {error:null};},
 admin:{getUserById:async()=>({data:{user:adminAllowed?{id:"auth-owner"}:null},error:adminAllowed?null:{message:"forbidden"}}),signOut:async()=>{events.push("revoke");return {error:null};},deleteUser:async(id:string)=>{events.push(`delete-auth:${id}`);return {error:null};}},
 }, storage:{from:()=>({remove:async()=>{events.push("storage-remove");return {error:storageFails?{message:"outage"}:null};}})}};
const tx: Record<string, unknown> = {
 user:{findUniqueOrThrow:async()=>({id:"app-owner",saldo,isFounder:false}),update:async({data}:{data:Record<string,unknown>})=>{updatedData=data;events.push("tombstone");},count:async()=>2},
 teacherWallet:{findUnique:async()=>null},withdrawal:{count:async()=>0},
};
for (const model of ["profile","nicknameHistory","studentKaryaComment","studentKarya","aIJob","aiSavedResult","generatedRPP","chatMessage","communityPost","pushSubscription","notifikasi","teacherPayoutProfile","karya","subscription"]) tx[model]={deleteMany:async()=>({count:1}),updateMany:async()=>({count:1}),count:async()=>0};
tx.karya={count:async()=>soldWorks,updateMany:async()=>({count:1})};
const db = {user:{findUnique:async({where}:{where:{supabaseId:string}})=>{assert.equal(where.supabaseId,"auth-owner");return {id:"app-owner"};}},$queryRaw:async()=>[{bucket_id:"avatars",name:"owned.png"}],$transaction:async(fn:(p:unknown)=>unknown)=>fn(tx)};
const originalLoad = (Module as unknown as {_load:(name:string,parent:unknown,isMain:boolean)=>unknown})._load;
(Module as unknown as {_load:typeof originalLoad})._load = function(name,parent,isMain) {
 if(name==="@/lib/supabase/server")return {createClient:async()=>currentAuth,getUser:async()=>loggedIn?{id:"app-owner"}:null};
 if(name==="@/lib/security")return {checkRateLimit:async()=>({allowed})};
 if(name==="@supabase/supabase-js")return {createClient:()=>sdkAuth};
 if(name==="@/lib/db")return {db};
 if(name==="@/lib/redis")return {del:async()=>{},delPattern:async()=>{}};
 return originalLoad(name,parent,isMain);
};
process.env.NEXT_PUBLIC_SUPABASE_URL="https://example.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY="test-key";
process.env.SUPABASE_SERVICE_ROLE_KEY="test-admin-key";
const passwordRoute = require("../app/api/user/password/route");
const deletionRoute = require("../app/api/user/account/route");
function request(body:object,method="POST",origin="https://app.example.test") {
 return new NextRequest("https://app.example.test/api/user/account",{method,headers:{"Content-Type":"application/json",Origin:origin},body:JSON.stringify(body)});
}
async function main() {
 const uploadRoute=await import("../app/api/upload/image/route");
 const uploadRequest=()=>{const form=new FormData();form.append("file",new File([Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p1cAAAAASUVORK5CYII=","base64")],"qa.png",{type:"image/png"}));return new NextRequest("https://app.example.test/api/upload/image",{method:"POST",body:form});};
 loggedIn=false;assert.equal((await uploadRoute.POST(uploadRequest())).status,401);assert.equal(uploadPath,"");loggedIn=true;
 assert.equal((await uploadRoute.POST(uploadRequest())).status,200);assert.ok(uploadPath.startsWith("toko/app-owner/"));
 uploadFails=true;assert.equal((await uploadRoute.POST(uploadRequest())).status,403);uploadFails=false;

 const malformed = new NextRequest("https://app.example.test/api/user/password", {method:"POST",headers:{Origin:"https://app.example.test"},body:"{"});
 assert.equal((await passwordRoute.POST(malformed)).status,400);
 const passwordBody={currentPassword:"existing-test",newPassword:"different-test-password"};
 events.length=0; validPassword=false;
 assert.equal((await passwordRoute.POST(request(passwordBody))).status,403);assert.ok(!events.includes("password-update"));
 validPassword=true;authId="attacker";events.length=0;
 assert.equal((await passwordRoute.POST(request(passwordBody))).status,403);assert.ok(!events.includes("password-update"));
 authId="auth-owner";events.length=0;
 assert.equal((await passwordRoute.POST(request(passwordBody,"POST","https://evil.test"))).status,403);assert.equal(events.length,0);
 assert.equal((await passwordRoute.POST(request({...passwordBody,newPassword:"short"}))).status,400);
 allowed=false;assert.equal((await passwordRoute.POST(request(passwordBody))).status,429);allowed=true;
 factors=true;assert.equal((await passwordRoute.POST(request(passwordBody))).status,403);factors=false;
 updateFails=true;events.length=0;assert.equal((await passwordRoute.POST(request(passwordBody))).status,400);assert.ok(!events.includes("original-signout-global"));updateFails=false;
 events.length=0;assert.equal((await passwordRoute.POST(request(passwordBody))).status,200);
 assert.ok(events.indexOf("password-verify")<events.indexOf("password-update"));assert.ok(events.includes("original-signout-global"));
 events.length=0;assert.equal((await passwordRoute.POST(request({verificationCode:"123456",newPassword:"different-test-password"}))).status,200);assert.ok(events.includes("otp-verify"));
 amrTime=Math.floor(Date.now()/1000)-600;assert.equal((await passwordRoute.POST(request({oauthReauth:true,newPassword:"different-test-password"}))).status,403);
 amrTime=Math.floor(Date.now()/1000);assert.equal((await passwordRoute.POST(request({oauthReauth:true,newPassword:"different-test-password"}))).status,200);
 amrMethod="password";assert.equal((await passwordRoute.POST(request({emailReauth:true,newPassword:"different-test-password"}))).status,403);
 amrMethod="otp";assert.equal((await passwordRoute.POST(request({emailReauth:true,newPassword:"different-test-password"}))).status,200);
 amrTime=Math.floor(Date.now()/1000)-600;assert.equal((await passwordRoute.POST(request({emailReauth:true,newPassword:"different-test-password"}))).status,403);
 amrTime=Math.floor(Date.now()/1000);amrMethod="oauth";
 const deleteBody={currentPassword:"existing-test",confirmation:"HAPUS AKUN",userId:"victim",supabaseId:"victim"};
 adminAllowed=false;events.length=0;assert.equal((await deletionRoute.DELETE(request(deleteBody,"DELETE"))).status,503);assert.ok(!events.includes("tombstone"));adminAllowed=true;
 events.length=0;assert.equal((await deletionRoute.DELETE(request({...deleteBody,confirmation:"hapus"},"DELETE"))).status,400);assert.ok(!events.includes("tombstone"));
 saldo=10;events.length=0;assert.equal((await deletionRoute.DELETE(request(deleteBody,"DELETE"))).status,409);assert.ok(!events.includes("tombstone"));saldo=0;
 soldWorks=1;events.length=0;assert.equal((await deletionRoute.DELETE(request(deleteBody,"DELETE"))).status,409);assert.ok(!events.includes("tombstone"));assert.ok(!events.includes("storage-remove"));soldWorks=0;
 validPassword=false;events.length=0;assert.equal((await deletionRoute.DELETE(request(deleteBody,"DELETE"))).status,403);assert.ok(!events.includes("tombstone"));validPassword=true;
 events.length=0;assert.equal((await deletionRoute.DELETE(request(deleteBody,"DELETE"))).status,200);
 assert.equal(updatedData?.email,"deleted-app-owner@account.invalid");assert.equal(updatedData?.isPremium,false);
 assert.ok(events.indexOf("tombstone")<events.indexOf("storage-remove"));assert.ok(events.indexOf("revoke")<events.indexOf("delete-auth:auth-owner"));assert.ok(!events.includes("delete-auth:victim"));
 storageFails=true;events.length=0;const partial=await deletionRoute.DELETE(request(deleteBody,"DELETE"));assert.equal(partial.status,503);assert.match((await partial.json()).error,/dinonaktifkan/);assert.ok(events.includes("tombstone"));assert.ok(!events.includes("delete-auth:auth-owner"));
 console.log("PASS account routes: wrong password, mismatched owner, CSRF, validation, rate limit, MFA, provider failure, password/OTP/Google re-auth, expiry, confirmation, balance, deletion sequencing, attacker ID ignored, partial failure.");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{(Module as unknown as {_load:typeof originalLoad})._load=originalLoad;});
