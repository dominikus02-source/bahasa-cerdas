import { NextRequest, NextResponse } from "next/server";
import { withAdmin } from "@/lib/admin/guard";
import {
  PROVIDER_CATALOG, createProvider, findProvider, listProviders, providerId, providerInput,
  providerPatch, publicView, removeProvider, testProviderConnection, updateProvider, vaultReady
} from "@/lib/admin/ai-provider-vault";

export const runtime = "nodejs";
const noStore={ "Cache-Control":"no-store" };
const json=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:noStore});

function sameOrigin(req:NextRequest) {
  const origin=req.headers.get("origin");
  if (!origin)return true; // Server-side scripts can omit Origin; auth remains mandatory.
  try {return new URL(origin).hostname===new URL(req.url).hostname && new URL(origin).protocol==="https:" || 
    new URL(origin).hostname==="localhost" && new URL(req.url).hostname==="localhost";}catch{return false;}
}
function acceptsJson(req:NextRequest){return req.headers.get("content-type")?.startsWith("application/json")===true;}
function rejectRequest(req:NextRequest){
  if(!sameOrigin(req))return json({error:"Origin tidak diizinkan"},403);
  if(!acceptsJson(req))return json({error:"Gunakan Content-Type: application/json"},415);
  return null;
}
async function adminGET(){
  try{
    const records=await listProviders();
    return json({vaultReady:vaultReady(),providers:records.map(publicView),catalog:PROVIDER_CATALOG});
  }catch{return json({error:"Gagal membaca pengaturan AI"},500);}
}
async function adminPOST(req:NextRequest){
  const rejection=rejectRequest(req);if(rejection)return rejection;
  const data=await req.json().catch(()=>null);
  if(data?.action==="test"){
    if(!vaultReady())return json({error:"Kunci enkripsi server belum dikonfigurasi"},503);
    const parsed=providerId.safeParse({id:data?.id});
    if(!parsed.success)return json({error:"ID tidak valid"},400);
    try{
      const row=await findProvider(parsed.data.id);if(!row)return json({error:"Konfigurasi tidak ditemukan"},404);
      return json(await testProviderConnection(row));
    }catch{return json({error:"Pengujian gagal; periksa konfigurasi enkripsi server"},503);}
  }
  if(!vaultReady())return json({error:"Kunci enkripsi server belum dikonfigurasi"},503);
  const parsed=providerInput.safeParse(data);
  if(!parsed.success)return json({error:"Konfigurasi provider tidak valid",issues:parsed.error.issues},400);
  try{return json({provider:await createProvider(parsed.data)},201);}
  catch{return json({error:"Tidak berhasil menyimpan provider"},500);}
}
async function adminPATCH(req:NextRequest){
  const rejection=rejectRequest(req);if(rejection)return rejection;
  if(!vaultReady())return json({error:"Kunci enkripsi server belum dikonfigurasi"},503);
  const data=await req.json().catch(()=>null);
  const parsed=providerPatch.safeParse(data);
  if(!parsed.success)return json({error:"Konfigurasi tidak valid",issues:parsed.error.issues},400);
  try{
    const result=await updateProvider(parsed.data);
    return result?json({provider:result}):json({error:"Provider tidak ditemukan"},404);
  }catch{return json({error:"Tidak berhasil memperbarui provider"},500);}
}
async function adminDELETE(req:NextRequest){
  const rejection=rejectRequest(req);if(rejection)return rejection;
  const parsed=providerId.safeParse(await req.json().catch(()=>null));
  if(!parsed.success)return json({error:"ID tidak valid"},400);
  try{return (await removeProvider(parsed.data.id))?json({deleted:true}):json({error:"Provider tidak ditemukan"},404);}
  catch{return json({error:"Tidak berhasil menghapus provider"},500);}
}

export const GET=withAdmin(adminGET,{route:"/api/admin/settings/ai-providers",method:"GET"});
export const POST=withAdmin(adminPOST,{route:"/api/admin/settings/ai-providers",method:"POST"});
export const PATCH=withAdmin(adminPATCH,{route:"/api/admin/settings/ai-providers",method:"PATCH"});
export const DELETE=withAdmin(adminDELETE,{route:"/api/admin/settings/ai-providers",method:"DELETE"});
