import {NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
import {db} from "@/lib/db";
import {canUseService,privacyFor} from "@/lib/compliance/service";
import {ageBandFor,trustedAgeAssurance} from "@/lib/compliance/policy";
export async function GET(req:Request){
 try{
  const token=req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if(!token)return NextResponse.json({error:"Akses ditolak."},{status:401});
  const auth=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await auth.auth.getUser(token);
  if(error||!data.user)return NextResponse.json({error:"Akses ditolak."},{status:401});
  const u=await db.user.findUnique({where:{supabaseId:data.user.id}});
  if(!u||u.email.endsWith("@account.invalid")||!await canUseService(u.id))return NextResponse.json({error:"Lengkapi persetujuan privasi."},{status:403});
  const p=await privacyFor(u.id);
  if(p?.birthDate){const band=ageBandFor(p.birthDate);if(band==="ADULT"&&!trustedAgeAssurance(p.ageAssuranceLevel))return NextResponse.json({error:"Verifikasi usia diperlukan untuk bermain bersama."},{status:403});if(band!=="ADULT"&&!process.env.LEGACY_GAME_CHILD_REVIEW_REF)return NextResponse.json({error:"Izin bermain bersama perlu ditinjau."},{status:403});}
  return NextResponse.json({id:u.id,name:u.nickname||`Peserta-${u.id.slice(-4)}`},{headers:{"Cache-Control":"private, no-store"}});
 }catch{return NextResponse.json({error:"Layanan belum tersedia."},{status:503});}
}
