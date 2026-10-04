/** Run from an approved scheduler. Dry run by default. Never load another environment implicitly. */
import {PrismaClient} from '@prisma/client';
const db=new PrismaClient();
const cutoff=(days:number)=>new Date(Date.now()-days*86400000);
async function main(){
 const execute=process.argv.includes('--execute');
 const expiredAi={createdAt:{lt:cutoff(30)}};
 const expiredEvents={createdAt:{lt:cutoff(90)}};
 const expiredInvites={status:{in:['PENDING','SUPERSEDED','REJECTED']},expiresAt:{lt:cutoff(30)}};
 const reportPayload={status:'RESOLVED',reviewedAt:{lt:cutoff(180)}};
 const counts={aiJobs:await db.aIJob.count({where:expiredAi}),aiSaved:await db.aiSavedResult.count({where:expiredAi}),analytics:await db.productEvent.count({where:expiredEvents}),invitations:await db.guardianRequest.count({where:expiredInvites}),reportPayloads:await db.safetyReport.count({where:{...reportPayload,detail:{not:'[retention-expired]'}}})};
 console.log(JSON.stringify({mode:execute?'execute':'dry-run',counts}));
 if(!execute)return;
 if(!process.env.PRIVACY_RETENTION_REVIEW_REF)throw new Error("RETENTION_REVIEW_REQUIRED");
 await db.$transaction(async tx=>{
  await tx.aIJob.deleteMany({where:expiredAi});await tx.aiSavedResult.deleteMany({where:expiredAi});await tx.productEvent.deleteMany({where:expiredEvents});
  await tx.guardianRequest.updateMany({where:expiredInvites,data:{status:'EXPIRED',guardianEmail:'expired@account.invalid',verificationRef:null}});
  await tx.safetyReport.updateMany({where:reportPayload,data:{detail:'[retention-expired]',contact:null,reporterId:null,targetId:'[retention-expired]'}});
  await tx.complianceAudit.create({data:{action:'RETENTION_SWEEP',reference:JSON.stringify(counts)}});
 },{timeout:20000});
}
main().catch(()=>{console.error('Retention sweep failed; inspect restricted operational logs.');process.exitCode=1;}).finally(()=>db.$disconnect());
