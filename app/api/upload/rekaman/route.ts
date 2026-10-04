import {NextRequest,NextResponse} from "next/server";
import {getUser} from "@/lib/supabase/server";
import {validateUpload,AUDIO_MIMES} from "@/lib/upload-validation";
import {uploadPrivate} from "@/lib/compliance/assets";
export async function POST(req:NextRequest){try{
 const u=await getUser();if(!u)return NextResponse.json({error:"Silakan masuk."},{status:401});
 const f=(await req.formData()).get("file");if(!(f instanceof File))return NextResponse.json({error:"File tidak ditemukan."},{status:400});
 const check=await validateUpload(f,AUDIO_MIMES);if(!check.ok)return NextResponse.json({error:check.error},{status:check.status});
 return NextResponse.json(await uploadPrivate(f,u.id,check.ext));
}catch{return NextResponse.json({error:"Rekaman belum dapat diunggah."},{status:503});}}
