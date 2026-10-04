import "server-only";
import { db } from "@/lib/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
const manifestSchema = z.array(z.object({ bucket_id: z.string(), name: z.string() }));
/** Durable cleanup: authorization happens at the account or admin boundary. */
export async function finishDeletion(userId: string, admin: SupabaseClient, accessToken?: string) {
 const job = await db.deletionJob.findUniqueOrThrow({ where: { userId } });
 if (job.status === "COMPLETED") return;
 await db.deletionJob.update({ where: { userId }, data: { attempts: { increment: 1 }, status: "CLEANING" } });
 try {
  const objects = manifestSchema.parse(job.objectManifest);
  for (const bucket of new Set(objects.map(o=>o.bucket_id))) {
   const paths=objects.filter(o=>o.bucket_id===bucket).map(o=>o.name);
   for(let i=0;i<paths.length;i+=100){ const {error}=await admin.storage.from(bucket).remove(paths.slice(i,i+100)); if(error)throw new Error("STORAGE_CLEANUP"); }
  }
  if(accessToken){const {error}=await admin.auth.admin.signOut(accessToken,"global");if(error)throw new Error("SESSION_REVOCATION");}
  const {error}=await admin.auth.admin.deleteUser(job.authId);
  if(error && error.status!==404)throw new Error("AUTH_DELETION");
  // Auth removal revokes refresh sessions; tombstone rejects surviving JWTs.
  await db.$transaction(async tx=>{
   await tx.deletionJob.update({where:{userId},data:{status:"COMPLETED",objectManifest:[],lastErrorCode:null}});
   await tx.complianceAudit.create({data:{subjectId:userId,action:"ACCOUNT_DELETION_COMPLETED"}});
  });
 }catch(e){await db.deletionJob.update({where:{userId},data:{status:"RETRY_REQUIRED",lastErrorCode:e instanceof Error && ["STORAGE_CLEANUP","SESSION_REVOCATION","AUTH_DELETION"].includes(e.message)?e.message:"CLEANUP_FAILED"}});throw e;}
}
