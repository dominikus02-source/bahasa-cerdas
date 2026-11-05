import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { z } from "zod";

export const AI_PROVIDER_PREFIX = "ai_provider:v1:";
export const PROVIDER_CATALOG = {
  deepseek: { label: "DeepSeek", endpoint: "https://api.deepseek.com/chat/completions", example: "deepseek-flash", kind: "openai" },
  groq: { label: "Groq", endpoint: "https://api.groq.com/openai/v1/chat/completions", example: "openai/gpt-oss-120b", kind: "openai" },
  openai: { label: "OpenAI", endpoint: "https://api.openai.com/v1/chat/completions", example: "gpt-4.1-mini", kind: "openai" },
  gemini: { label: "Google Gemini", endpoint: "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", example: "gemini-2.5-flash", kind: "gemini" },
  anthropic: { label: "Anthropic Claude", endpoint: "https://api.anthropic.com/v1/messages", example: "claude-sonnet-4-5", kind: "anthropic" },
  openrouter: { label: "OpenRouter", endpoint: "https://openrouter.ai/api/v1/chat/completions", example: "openai/gpt-4.1-mini", kind: "openai" },
  mistral: { label: "Mistral", endpoint: "https://api.mistral.ai/v1/chat/completions", example: "mistral-small-latest", kind: "openai" },
  xai: { label: "xAI", endpoint: "https://api.x.ai/v1/chat/completions", example: "grok-4", kind: "openai" },
} as const;

export const providerName = z.enum(["deepseek","groq","openai","gemini","anthropic","openrouter","mistral","xai"]);
export const providerInput = z.object({
  provider: providerName,
  label: z.string().trim().min(2).max(90),
  model: z.string().trim().min(2).max(150).regex(/^[a-zA-Z0-9._:/-]+$/, "ID model tidak valid"),
  apiKey: z.string().trim().min(12).max(4096),
  enabled: z.boolean().default(false),
}).strict();
export const providerPatch = providerInput.omit({apiKey:true}).partial().extend({
  id: z.string().uuid(),
  apiKey: providerInput.shape.apiKey.optional(),
}).strict();
export const providerId = z.object({id:z.string().uuid()}).strict();

export type StoredProvider = {
  id: string; provider: z.infer<typeof providerName>; label: string; model: string; enabled: boolean;
  encryptedKey: string; createdAt: string;
};
export type PublicProvider = Omit<StoredProvider,"encryptedKey"> & {hasKey:boolean; endpoint:string};
const settingKey = (id:string) => AI_PROVIDER_PREFIX+id;
function encryptionKey() {
  const raw=process.env.AI_PROVIDER_ENCRYPTION_KEY || "";
  const key=/^[a-f0-9]{64}$/i.test(raw) ? Buffer.from(raw,"hex") : Buffer.from(raw,"base64");
  if (key.length!==32) throw new Error("AI_PROVIDER_ENCRYPTION_KEY_NOT_CONFIGURED");
  return key;
}
export function vaultReady() {
  try { encryptionKey();return true; } catch {return false;}
}
export function encryptApiKey(id:string, raw:string):string {
  const iv=randomBytes(12), c=createCipheriv("aes-256-gcm",encryptionKey(),iv);
  c.setAAD(Buffer.from(settingKey(id)));
  const data=Buffer.concat([c.update(raw,"utf8"),c.final()]);
  return ["v1",iv.toString("base64"),c.getAuthTag().toString("base64"),data.toString("base64")].join(":");
}
export function decryptApiKey(row:StoredProvider):string {
  const [version,iv,tag,data]=row.encryptedKey.split(":");
  if(version!=="v1" || !iv || !tag || !data)throw new Error("INVALID_VAULT_RECORD");
  const d=createDecipheriv("aes-256-gcm",encryptionKey(),Buffer.from(iv,"base64"));
  d.setAAD(Buffer.from(settingKey(row.id)));d.setAuthTag(Buffer.from(tag,"base64"));
  return Buffer.concat([d.update(Buffer.from(data,"base64")),d.final()]).toString("utf8");
}
function decode(raw:string|null|undefined):StoredProvider|null {
  try {
    const x=JSON.parse(raw||"");
    if(!x || typeof x.id!=="string" || !providerName.safeParse(x.provider).success ||
       typeof x.encryptedKey!=="string" || typeof x.model!=="string" ||
       typeof x.label!=="string" || typeof x.enabled!=="boolean")return null;
    return x as StoredProvider;
  } catch {return null;}
}
export function publicView(row:StoredProvider):PublicProvider {
  const {encryptedKey,...visible}=row;
  return {...visible,hasKey:Boolean(encryptedKey),endpoint:PROVIDER_CATALOG[row.provider].endpoint};
}
export async function listProviders() {
  const records=await db.siteSetting.findMany({where:{key:{startsWith:AI_PROVIDER_PREFIX}},orderBy:{updatedAt:"desc"}});
  return records.map(r=>decode(r.value)).filter((v):v is StoredProvider=>v!==null);
}
export async function findProvider(id:string) {
  const record=await db.siteSetting.findUnique({where:{key:settingKey(id)}});
  return decode(record?.value);
}
export async function createProvider(input:z.infer<typeof providerInput>) {
  const id=randomUUID(); const row:StoredProvider={
    id,provider:input.provider,label:input.label,model:input.model,enabled:input.enabled,
    encryptedKey:encryptApiKey(id,input.apiKey),createdAt:new Date().toISOString()
  };
  await db.siteSetting.create({data:{key:settingKey(id),value:JSON.stringify(row)}});
  return publicView(row);
}
export async function updateProvider(input:z.infer<typeof providerPatch>) {
  const old=await findProvider(input.id);
  if(!old)return null;
  const updated:StoredProvider={
    ...old,
    ...(input.provider?{provider:input.provider}:{}),
    ...(input.label?{label:input.label}:{}),
    ...(input.model?{model:input.model}:{}),
    ...(input.enabled!==undefined?{enabled:input.enabled}:{}),
    ...(input.apiKey?{encryptedKey:encryptApiKey(input.id,input.apiKey)}:{})
  };
  await db.siteSetting.update({where:{key:settingKey(input.id)},data:{value:JSON.stringify(updated)}});
  return publicView(updated);
}
export async function removeProvider(id:string){
  const exists=await findProvider(id);if(!exists)return false;
  await db.siteSetting.delete({where:{key:settingKey(id)}});return true;
}
export async function testProviderConnection(row:StoredProvider):Promise<{ok:boolean;status:number;message:string}>{
  const preset=PROVIDER_CATALOG[row.provider];
  const key=decryptApiKey(row);
  const headers:Record<string,string>={"Content-Type":"application/json"};
  let body:Record<string,unknown>={model:row.model,messages:[{role:"user",content:"Balas OK."}],max_tokens:16};
  let endpoint:string=preset.endpoint;
  if(preset.kind==="gemini"){
    endpoint=endpoint.replace("{model}",encodeURIComponent(row.model));
    headers["x-goog-api-key"]=key;
    body={contents:[{parts:[{text:"Balas OK."}]}],generationConfig:{maxOutputTokens:16}};
  } else if(preset.kind==="anthropic"){
    headers["x-api-key"]=key;
    headers["anthropic-version"]="2026-10-21";
    body={model:row.model,messages:[{role:"user",content:"Balas OK."}],max_tokens:16};
  } else {
    headers.Authorization="Bearer "+key;
  }
  try {
    const response=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify(body),
      signal:AbortSignal.timeout(12000),cache:"no-store",redirect:"error"});
    // Never return provider error bodies: providers may echo submitted data.
    return {ok:response.ok,status:response.status,message:response.ok?"Koneksi dan model merespons.":"Provider menolak permintaan. Periksa key, izin, model, kuota, dan billing."};
  } catch {
    return {ok:false,status:0,message:"Koneksi gagal atau timeout."};
  }
}
