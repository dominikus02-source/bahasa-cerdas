import { db } from "@/lib/db";
import { AccountError } from "./security";
import cache from "@/lib/redis";

export const DELETED_EMAIL_DOMAIN = "@account.invalid";
export function isDeletedAccount(user: { email: string }) { return user.email.endsWith(DELETED_EMAIL_DOMAIN); }

/** Keep referential/financial evidence; remove personal identity and private work. */
export async function anonymizeAccount(userId: string, supabaseId: string, objects: { bucket_id: string; name: string }[] = []) {
  await db.$transaction(async tx => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const wallet = await tx.teacherWallet.findUnique({ where: { teacherId: userId } });
    const recurring = await tx.subscription.count({ where: { userId, midtransSubscriptionId: { not: null }, willRenew: true } });
    if (recurring > 0) throw new AccountError("Batalkan perpanjangan otomatis melalui pengelola sebelum menghapus akun.", 409);
    const pending = await tx.withdrawal.count({ where: { userId, status: "PENDING" } });
    if (user.saldo > 0 || pending > 0 || (wallet && (wallet.availableBalance > 0 || wallet.pendingBalance > 0 || wallet.lockedBalance > 0))) throw new AccountError("Selesaikan saldo atau penarikan yang masih berjalan sebelum menghapus akun.", 409);
    const soldWorks = await tx.karya.count({ where: { sellerId: userId, purchases: { some: { status: { in: ["PAID", "PENDING"] } } } } });
    if (soldWorks > 0) throw new AccountError("Hubungi pengelola untuk mengalihkan karya yang sudah dibeli atau memiliki pembayaran berjalan sebelum menghapus akun. Akses pembeli harus tetap terjaga.", 409);
    if (user.isFounder && await tx.user.count({ where: { isFounder: true, email: { not: { endsWith: DELETED_EMAIL_DOMAIN } } } }) <= 1) throw new AccountError("Alihkan pengelolaan platform ke pendiri lain sebelum menghapus akun ini.", 409);
    const activeClasses = await tx.group.count({where:{teacherId:userId,isActive:true,members:{some:{}}}});
    if(activeClasses>0) throw new AccountError("Alihkan kelas aktif ke pengajar lain sebelum menghapus akun. Hubungi pengelola untuk menjaga akses murid.",409);
    // Storage ownership evidence must survive profile removal and auth revocation.
    await tx.deletionJob.upsert({ where: { userId }, create: { userId, authId: supabaseId, objectManifest: objects }, update: {} });
    await tx.complianceAudit.create({ data: { subjectId: userId, actorId: userId, action: "ACCOUNT_DELETION_REQUESTED" } });
    await tx.user.update({ where: { id: userId }, data: {
      email: `deleted-${userId}${DELETED_EMAIL_DOMAIN}`, fullName: "Akun dihapus", nickname: null, nicknameUpdatedAt: null, avatar: null,
      xp: 0, level: 1, streak: 0, coins: 0, totalLikes: 0, totalViews: 0, lastActiveAt: null, onboarded: false, emailConfirmed: false,
      role: "MURID", isFounder: false, isPremium: false, premiumPlan: "FREE", premiumUntil: null,
      trialStartedAt: null, trialEndsAt: null, trialPlan: null, trialCreditsTotal: null, midtransCustomerId: null,
      equippedFrame: null, equippedNameColor: null, equippedBadge: null, equippedBackground: null, equippedNameplate: null, equippedEffect: null,
    } });
    await tx.materiDownload.deleteMany({where:{userId}});
    await tx.coinTransaction.deleteMany({where:{userId}});
    await tx.lombaPeserta.deleteMany({where:{userId}});
    await tx.aIUsage.deleteMany({where:{userId}});
    await tx.premiumUsage.deleteMany({where:{userId}});
    await tx.agentTelegramBinding.deleteMany({where:{userId}});
    await tx.classroomPrivacyApproval.deleteMany({where:{teacherId:userId}});
    await tx.profile.deleteMany({ where: { userId } });
    await tx.nicknameHistory.deleteMany({ where: { userId } });
    await tx.studentKaryaComment.deleteMany({ where: { userId } });
    await tx.studentKarya.deleteMany({ where: { userId } });
    await tx.aIJob.deleteMany({ where: { userId } });
    await tx.aiSavedResult.deleteMany({ where: { userId } });
    await tx.generatedRPP.deleteMany({ where: { uploaderId: userId } });
    await tx.chatMessage.deleteMany({ where: { userId } });
    await tx.communityPost.deleteMany({ where: { userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.notifikasi.deleteMany({ where: { userId } });
    await tx.teacherPayoutProfile.deleteMany({ where: { teacherId: userId } });
    await tx.karya.updateMany({ where: { sellerId: userId }, data: { isPublished: false } });
    await tx.privacyAccount.deleteMany({ where: { userId } });
    await tx.guardianRequest.updateMany({ where: { OR: [{ childId: userId }, { guardianId: userId }] }, data: { guardianEmail: "deleted@account.invalid", status: "WITHDRAWN", verificationRef: null } });
    // A deleted guardian cannot leave a child with active consent.
    const children = await tx.guardianRequest.findMany({ where: { guardianId: userId }, select: { childId: true } });
    await tx.privacyAccount.updateMany({ where: { userId: { in: children.map(c => c.childId) } }, data: { guardianStatus: "WITHDRAWN", aiAssistance: false, publicProfile: false, publicWorks: false, analytics: false } });
    const consentClasses=await tx.group.findMany({where:{members:{some:{userId:{in:[userId,...children.map(c=>c.childId)]}}}},select:{id:true}});
    await tx.classroomPrivacyApproval.deleteMany({where:{classId:{in:consentClasses.map(c=>c.id)}}});
    await tx.studentKaryaLike.deleteMany({ where: { userId } });
    await tx.follow.deleteMany({ where: { OR: [{ followerId: userId }, { followingId: userId }] } });
    await tx.profileLike.deleteMany({ where: { OR: [{ likerId: userId }, { targetId: userId }] } });
    await tx.testAnswer.deleteMany({ where: { userId } });
    await tx.testSession.deleteMany({ where: { userId } });
    await tx.quizSubmission.deleteMany({ where: { userId } });
    await tx.quizSession.deleteMany({ where: { userId } });
    await tx.penugasanSubmission.deleteMany({ where: { userId } });
    await tx.pengumumanSubmission.deleteMany({ where: { userId } });
    await tx.nilai.deleteMany({ where: { userId } });
    await tx.groupQuizResult.deleteMany({ where: { userId } });
    await tx.gameResult.deleteMany({ where: { userId } });
    await tx.gameSession.deleteMany({ where: { userId } });
    await tx.progresKompetensi.deleteMany({ where: { userId } });
    await tx.kompetensiCertificate.deleteMany({ where: { userId } });
    await tx.certificate.deleteMany({ where: { userId } });
    await tx.dailyAction.deleteMany({ where: { userId } });
    await tx.koleksiKata.deleteMany({ where: { userId } });
    await tx.ttsSession.deleteMany({ where: { userId } });
    await tx.userUnitProgress.deleteMany({ where: { userId } });
    await tx.adaptivePracticeSession.deleteMany({ where: { userId } });
    await tx.learningEvidence.deleteMany({ where: { userId } });
    await tx.learningRecommendation.deleteMany({ where: { userId } });
    await tx.learningInsight.deleteMany({ where: { userId } });
    await tx.learningSkill.deleteMany({ where: { userId } });
    await tx.learningJourney.deleteMany({ where: { userId } });
    await tx.playerCTA.deleteMany({ where: { userId } });
    await tx.playerActivity.deleteMany({ where: { userId } });
    await tx.xPTransaction.deleteMany({ where: { userId } });
    await tx.xpLedger.deleteMany({ where: { userId } });
    await tx.dailyQuest.deleteMany({ where: { userId } });
    await tx.userItem.deleteMany({ where: { userId } });
    await tx.userBadge.deleteMany({ where: { userId } });
    await tx.userAchievement.deleteMany({ where: { userId } });
    await tx.leaderboardPeriodResult.deleteMany({ where: { userId } });
    await tx.playerProfile.deleteMany({ where: { userId } });
    await tx.pendekarPlayer.deleteMany({ where: { userId } });
    await tx.arenaJuniorProgress.deleteMany({ where: { userId } });
    await tx.arenaJuniorAkun.deleteMany({ where: { userId } });
    await tx.groupMember.deleteMany({ where: { userId } });
    await tx.communityMember.deleteMany({ where: { userId } });
    await tx.artikelLike.deleteMany({ where: { userId } });
    await tx.artikelComment.deleteMany({ where: { userId } });
    await tx.productEvent.deleteMany({ where: { actorId: userId } });
    await tx.mainPlayer.updateMany({ where: { userId: { in: [userId, supabaseId] } }, data: { userId: null, displayName: "Peserta", avatarUrl: null, connected: false } });
    await tx.taskShareToken.deleteMany({ where: { createdById: userId } });
    await tx.safetyReport.updateMany({ where: { reporterId: userId }, data: { reporterId: null, contact: null } });
    await tx.subscription.updateMany({ where: { userId }, data: { status: "CANCELLED", willRenew: false, cancelledAt: new Date() } });
  }, { timeout: 20000, isolationLevel: "Serializable" });
  await Promise.all([cache.del(`user:me:id:${supabaseId}`), cache.del(`user:me:v2:id:${supabaseId}`), cache.del(`profile:public:${userId}`), cache.del(`profile:public:v2:${userId}`), cache.delPattern("feed:*"), cache.delPattern("bca:lb:*"), cache.delPattern("karya:*"), cache.delPattern("league:*")]);
}
