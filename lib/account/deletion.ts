import { db } from "@/lib/db";
import { AccountError } from "./security";
import cache from "@/lib/redis";

export const DELETED_EMAIL_DOMAIN = "@account.invalid";
export function isDeletedAccount(user: { email: string }) { return user.email.endsWith(DELETED_EMAIL_DOMAIN); }

/** Keep referential/financial evidence; remove personal identity and private work. */
export async function anonymizeAccount(userId: string, supabaseId: string) {
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
    await tx.user.update({ where: { id: userId }, data: {
      email: `deleted-${userId}${DELETED_EMAIL_DOMAIN}`, fullName: "Akun dihapus", nickname: null, nicknameUpdatedAt: null, avatar: null,
      role: "MURID", isFounder: false, isPremium: false, premiumPlan: "FREE", premiumUntil: null,
      trialStartedAt: null, trialEndsAt: null, trialPlan: null, trialCreditsTotal: null, midtransCustomerId: null,
      equippedFrame: null, equippedNameColor: null, equippedBadge: null, equippedBackground: null, equippedNameplate: null, equippedEffect: null,
    } });
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
    await tx.subscription.updateMany({ where: { userId }, data: { status: "CANCELLED", willRenew: false, cancelledAt: new Date() } });
  }, { timeout: 20000, isolationLevel: "Serializable" });
  await Promise.all([cache.del(`user:me:id:${supabaseId}`), cache.del(`user:me:v2:id:${supabaseId}`), cache.del(`profile:public:${userId}`), cache.del(`profile:public:v2:${userId}`), cache.delPattern("feed:*"), cache.delPattern("bca:lb:*"), cache.delPattern("karya:*"), cache.delPattern("league:*")]);
}
