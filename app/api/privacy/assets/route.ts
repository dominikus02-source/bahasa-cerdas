import {NextResponse} from "next/server";
import {getUser} from "@/lib/supabase/server";
import {signedPrivateAsset} from "@/lib/compliance/assets";
import {db} from "@/lib/db";
import {canReadPrivateSubject,publicIdentityAllowed} from "@/lib/compliance/service";
export async function GET(req:Request){try{
 const u=await getUser();const path=new URL(req.url).searchParams.get("path")||"";
 const ownerId=path.split("/")[0];
 let allowed=await canReadPrivateSubject(ownerId,u);
 if(!allowed){
  const assetUrl=`/api/privacy/assets?path=${encodeURIComponent(path)}`;
  const owner=await db.user.findUnique({where:{id:ownerId},select:{avatar:true}});
  allowed=owner?.avatar===assetUrl&&await publicIdentityAllowed(ownerId,"publicProfile");
  if(!allowed&&await publicIdentityAllowed(ownerId,"publicWorks"))allowed=(await db.studentKarya.count({where:{userId:ownerId,OR:[{coverImage:assetUrl},{photos:{has:assetUrl}}]}}))>0;
 }
 if(!allowed)return NextResponse.json({error:"File privat."},{status:404});
 return NextResponse.redirect(await signedPrivateAsset(path),{headers:{"Cache-Control":"private, no-store","Referrer-Policy":"no-referrer"}});
}catch{return NextResponse.json({error:"File belum dapat dimuat."},{status:503});}}
