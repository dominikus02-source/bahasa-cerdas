#!/usr/bin/env node
/**
 * Two-user GoTrue API isolation smoke test. Targets only explicit staging URL.
 * Required: STAGING_AUTH_URL, STAGING_ANON_KEY, STAGING_TEST_USER_A_EMAIL/PASSWORD,
 * STAGING_TEST_USER_B_EMAIL/PASSWORD. Password recovery sends a real email.
 */
const required = ["STAGING_AUTH_URL","STAGING_ANON_KEY","STAGING_TEST_USER_A_EMAIL","STAGING_TEST_USER_A_PASSWORD","STAGING_TEST_USER_B_EMAIL","STAGING_TEST_USER_B_PASSWORD"]
for (const k of required) if (!process.env[k]) throw new Error(`Missing ${k}`)
const base = process.env.STAGING_AUTH_URL.replace(/\/$/,"")
const u = new URL(base)
if (u.protocol !== "https:" || !u.hostname.startsWith("auth-staging.")) throw new Error("Refusing non-staging Auth URL")
const anon = process.env.STAGING_ANON_KEY
const headers = {"Content-Type":"application/json","apikey":anon}
async function request(path, method="GET", body, token) {
  const r = await fetch(base+path,{method,headers:{...headers,...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})})
  const raw=await r.text(); let data={}; try{data=raw?JSON.parse(raw):{}}catch{}
  if(!r.ok) throw new Error(`${method} ${path} -> HTTP ${r.status}: ${JSON.stringify(data).slice(0,300)}`)
  return data
}
const checks=[]
const pass=(s)=>{checks.push("PASS "+s);console.log("PASS "+s)}
try {
  const health=await fetch(base+"/health")
  if(!health.ok) throw new Error("Auth health failed: "+health.status)
  pass("Auth health endpoint")
  const users=[]
  for(const [label,n] of [["A","STAGING_TEST_USER_A"],["B","STAGING_TEST_USER_B"]]){
    const email=process.env[n+"_EMAIL"], password=process.env[n+"_PASSWORD"]
    let signup
    try { signup=await request("/signup","POST",{email,password,data:{full_name:"Staging test "+label}}) }
    catch(e) { if(!String(e).includes("already")&&!String(e).includes("registered")) throw e }
    const session=await request("/token?grant_type=password","POST",{email,password})
    if(!session.access_token||!session.refresh_token||!session.user?.id) throw new Error("Incomplete session for user "+label)
    const me=await request("/user","GET",null,session.access_token)
    if(me.id!==session.user.id) throw new Error("Identity mismatch for user "+label)
    users.push({label,email,session})
    pass("User "+label+" signup/login/session/user endpoint")
  }
  if(users[0].session.user.id===users[1].session.user.id) throw new Error("Two test users unexpectedly share identity")
  const cross=await fetch(base+"/user",{headers:{...headers,Authorization:"Bearer "+users[0].session.access_token}})
  const crossData=await cross.json()
  if(crossData.id!==users[0].session.user.id || crossData.id===users[1].session.user.id) throw new Error("Cross-user identity isolation failed")
  pass("Two-user identity isolation")
  const refreshed=await request("/token?grant_type=refresh_token","POST",{refresh_token:users[0].session.refresh_token})
  if(!refreshed.access_token) throw new Error("Refresh token flow failed")
  pass("Refresh token")
  await request("/logout","POST",{},refreshed.access_token)
  const after=await fetch(base+"/user",{headers:{...headers,Authorization:"Bearer "+refreshed.access_token}})
  if(after.ok) throw new Error("Logout did not invalidate session")
  pass("Logout invalidates access")
  for(const x of users) await request("/recover","POST",{email:x.email,gotrue_meta_security:{}})
  pass("Password recovery requests accepted (verify actual inbox delivery separately)")
  console.log("\nSTAGING AUTH API E2E PASS. Check both inboxes for recovery email before sign-off.")
} catch(e) {
  console.error("STAGING AUTH API E2E FAIL:",e.message)
  process.exit(1)
}
