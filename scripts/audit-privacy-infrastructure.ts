import { config } from "dotenv";
config({path:".env.local",override:true,quiet:true});config({quiet:true});
import {PrismaClient} from "@prisma/client";
import {writeFileSync,mkdirSync} from "node:fs";
async function main(){
 const url=process.env.DATABASE_URL_POOLED||process.env.DATABASE_URL;
 if(!url||!/^(postgres|postgresql):/.test(url))throw new Error("DATABASE_CONFIG_UNAVAILABLE");
 const db=new PrismaClient({datasources:{db:{url}}});
 try{
  const tables=await db.$queryRaw<{table_name:string;rls:boolean;policies:bigint;anonymous_grant:boolean}[]>`SELECT c.relname AS table_name,c.relrowsecurity AS rls,(SELECT count(*) FROM pg_policies p WHERE p.schemaname=n.nspname AND p.tablename=c.relname) AS policies,EXISTS (SELECT 1 FROM information_schema.role_table_grants g WHERE g.table_schema=n.nspname AND g.table_name=c.relname AND g.grantee IN ('anon','authenticated','PUBLIC')) AS anonymous_grant FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' ORDER BY c.relname`;
  let storage:unknown="UNAVAILABLE";
  try{storage=await db.$queryRaw`SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets`;}catch{}
  mkdirSync("docs/compliance",{recursive:true});
  const policies=await db.$queryRaw`SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE (schemaname='public' AND tablename='Notifikasi') OR schemaname='storage'`;
  const views=await db.$queryRaw`SELECT c.relname AS name,c.relkind AS kind,has_table_privilege('anon',c.oid,'SELECT') AS anon_read,has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_read FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m')`;
  const functions=await db.$queryRaw`SELECT p.proname AS name,p.prosecdef AS security_definer,p.proconfig AS config,has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prosecdef`;
  const report={views,functions,policies,auditedAt:new Date().toISOString(),scope:"read-only infrastructure metadata; no application rows",tables:tables.map(t=>({...t,policies:Number(t.policies)})),storage};
  writeFileSync("docs/compliance/infrastructure-snapshot.json",JSON.stringify(report,null,2));
  console.log(JSON.stringify({tables:tables.length,rlsOff:tables.filter(t=>!t.rls).length,exposedWithoutRls:tables.filter(t=>!t.rls&&t.anonymous_grant).length,storageStatus:storage==="UNAVAILABLE"?"UNAVAILABLE":"READ"}));
 }finally{await db.$disconnect();}
}
main().catch(()=>{console.error("Infrastructure metadata unavailable; no changes made.");process.exitCode=1;});
