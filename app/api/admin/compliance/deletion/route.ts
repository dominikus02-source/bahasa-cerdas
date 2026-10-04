import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {z} from "zod";
import {getIdentityUser} from "@/lib/supabase/server";
import {sameOrigin,jsonBody,privacyFailure} from "@/lib/compliance/http";
import {finishDeletion} from "@/lib/compliance/deletion-job";
import {db} from "@/lib/db";
export async function POST(req:Request){try{
 sameOrigin(req);const u=await getIdentityUser();if(!u||(u.role!=="ADMIN"&&!u.isFounder))return NextResponse.json({error:"Akses ditolak."},{status:403});
 const {userId}=z.object({userId:z.string().max(100)}).parse(await jsonBody(req));
 const target=await db.user.findUniqueOrThrow({where:{id:userId}});if(!target.email.endsWith("@account.invalid"))throw new Error("ORIGIN");
 const key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error("CONFIG");
 await db.complianceAudit.create({data:{actorId:u.id,subjectId:userId,action:"DELETION_RETRY"}});
 await finishDeletion(userId,createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,key,{auth:{persistSession:false,autoRefreshToken:false}}));
 return NextResponse.json({ok:true});
}catch(e){return privacyFailure(e);}}
