#!/usr/bin/env bash
# Read-only production readiness and unauthenticated denial probes.
set -Eeuo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo 'STOP: run as root'; exit 1; }
evidence=/opt/bahasacerdas/staging/auth/evidence
[[ -d "$evidence" && ! -L "$evidence" ]] || { echo 'STOP: evidence directory missing'; exit 1; }
output="$evidence/production-probes-$(date -u +%Y%m%dT%H%M%SZ)-$$.log"
{
date -u +utc=%FT%TZ
git rev-parse HEAD
docker exec -i bahasacerdas-prod-web-1 node --input-type=module <<'NODE'
const base='http://127.0.0.1:3000';
const cases=[
['Application health','GET','/api/health',200,null,d=>d.status==='ok'&&d.db==='up'],
['JUMPA readiness','GET','/api/jumpa/health',200,null,d=>d.ok===true&&d.livekitReachable===true&&d.stageApprovalReady===true&&d.storage==='ready'],
['Anonymous room access','GET','/api/jumpa/rooms/AAAAAA',401],
['Anonymous media token','POST','/api/jumpa/rooms/AAAAAA/token',401,{}],
['Unsigned webhook','POST','/api/jumpa/webhook',401,{event:'participant_joined'}],
['Forged webhook','POST','/api/jumpa/webhook',401,{event:'participant_joined'},null,'Bearer invalid-test-token']
];
let failed=0;
for(const [name,method,path,status,body,validate,auth] of cases){
 try{
 const headers={'host':'www.bahasacerdas.com','x-forwarded-proto':'https'};
 if(body)headers['content-type']='application/json';
 if(auth)headers.authorization=auth;
 const r=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'manual',signal:AbortSignal.timeout(15000)});
 let valid=r.status===status;
 if(validate){const data=await r.json();valid=valid&&validate(data);}
 else await r.arrayBuffer();
 console.log((valid?'PASS':'FAIL')+': '+name+' HTTP '+r.status);
 if(!valid)failed++;
 }catch{failed++;console.log('FAIL: '+name+' request error');}
}
console.log(failed?'STOP: '+failed+' probes failed':'PASS: all 6 production application probes; authenticated media/attendance NOT TESTED');
process.exitCode=failed?1:0;
NODE
} 2>&1 | tee "$output"
echo "EVIDENCE=$output"
