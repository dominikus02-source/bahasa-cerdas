/** Mock-only authorization/persistence regressions: no network or production database. */
import assert from "node:assert/strict";
import Module from "node:module";
import { NextRequest } from "next/server";
type Actor = { id: string; role: string; isFounder: boolean };
type Note = { progresId: string; teacherId: string; questionId: string; note: string };
let actor: Actor | null = null;
let active = true;
let writes = 0;
const notes = new Map<string, Note>();
const key = (n: Omit<Note, "note">) => [n.progresId, n.teacherId, n.questionId].join(":");
const db = {
 group: { findMany: async ({where}: {where: {teacherId: string; isActive: boolean}}) => {
  assert.equal(where.isActive, true);
  return active && ["teacher-a","teacher-shared"].includes(where.teacherId)
   ? [{id:"class-a",name:"A",createdAt:new Date(),_count:{members:1},members:[{user:{id:"student-a"}}]}] : [];
 }},
 progresKompetensi: {findFirst: async ({where}: {where:{id:string;userId:{in:string[]};status:string}}) => {
  assert.equal(where.status,"COMPLETED");
  return where.id === "attempt-a" && where.userId.in.includes("student-a")
   ? {answerDetails:{snapshot:{questions:[{id:"q1"}]}}} : null;
 }},
 simulationTeacherFeedback: {
  upsert: async ({where,create,update}:{where:{progresId_teacherId_questionId:Omit<Note,"note">};create:Note;update:{note:string}}) => {
   writes++; const k=key(where.progresId_teacherId_questionId); notes.set(k,notes.has(k)?{...notes.get(k)!,...update}:create);
  },
  deleteMany: async ({where}:{where:Omit<Note,"note">}) => {writes++; notes.delete(key(where));}
 }
};
type Loader = (id:string,...args:unknown[])=>unknown;
const mod = Module as unknown as {_load:Loader};
const original=mod._load;
mod._load=function(id,...args) {
 if(id==="@/lib/db") return {db};
 if(id==="@/lib/supabase/server") return {getUser:async()=>actor};
 return original.call(this,id,...args);
};
async function main() {
 const {PUT}=await import("../app/api/guru/simulasi/feedback/route");
 async function request(body:Record<string,unknown>,status:number) {
  const res=await PUT(new NextRequest("http://localhost/api/guru/simulasi/feedback",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}));
  assert.equal(res.status,status); return res;
 }
 const body={progresId:"attempt-a",questionId:"q1",note:"Perbaiki alasan jawaban."};
 await request(body,401);
 actor={id:"student-a",role:"MURID",isFounder:false}; await request(body,403);
 actor={id:"public-a",role:"UMUM",isFounder:false}; await request(body,403);
 actor={id:"teacher-b",role:"GURU",isFounder:false}; await request(body,404);
 assert.equal(writes,0);
 actor={id:"teacher-a",role:"GURU",isFounder:false};
 active=false; await request(body,404); active=true;
 await request({...body,progresId:"in-progress"},404);
 await request({...body,questionId:"foreign-question"},400);
 await request({...body,note:"x".repeat(3001)},400);
 assert.equal(writes,0);
 await request({...body,teacherId:"teacher-b"},200);
 assert.equal(notes.get("attempt-a:teacher-a:q1")?.note,body.note);
 assert.equal(notes.has("attempt-a:teacher-b:q1"),false);
 await request({...body,note:"Catatan diperbarui"},200);
 assert.equal(notes.get("attempt-a:teacher-a:q1")?.note,"Catatan diperbarui");
 await request({...body,questionId:"",note:"Catatan umum"},200);
 assert.equal(notes.size,2);
 actor={id:"teacher-shared",role:"GURU",isFounder:false};
 await request({...body,note:"Catatan guru kedua"},200);
 await request({...body,note:""},200);
 assert.equal(notes.get("attempt-a:teacher-a:q1")?.note,"Catatan diperbarui");
 actor={id:"teacher-a",role:"GURU",isFounder:false};
 await request({...body,note:""},200);
 assert.equal(notes.has("attempt-a:teacher-a:q1"),false);
 assert.equal(notes.get("attempt-a:teacher-a:")?.note,"Catatan umum");
 console.log("PASS: anonymous, student, public, foreign teacher, inactive class, completed attempt, question ownership, length validation, forged teacher ID, create/update/delete and separate teacher notes.");
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{mod._load=original});
