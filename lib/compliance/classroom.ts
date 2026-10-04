import "server-only";
import {db} from "@/lib/db";
import {NOTICE_VERSION,ageBandFor} from "./policy";
import {childRiskApproved,privacyFor,canUseService} from "./service";
export async function classroomAllowed(sessionId:string,subject:{userId?:string;playerId?:string}={}){
 const session=await db.mainSession.findUnique({where:{id:sessionId},select:{classId:true,teacherId:true}});
 if(!session)return false;
 const player=subject.playerId?await db.mainPlayer.findFirst({where:{id:subject.playerId,sessionId},select:{userId:true}}):null;
 const userId=subject.userId||player?.userId;
 if(userId){
  if(!await canUseService(userId))return false;
  const privacy=await privacyFor(userId);
  if(privacy?.birthDate&&ageBandFor(privacy.birthDate)==="ADULT")return true;
 }
 if(!childRiskApproved()||!session.classId)return false;
 const approval=await db.classroomPrivacyApproval.findUnique({where:{classId:session.classId}});
 return !!approval&&approval.teacherId===session.teacherId&&approval.noticeVersion===NOTICE_VERSION&&approval.expiresAt>new Date();
}
