import { db } from "../lib/db";

function maskEmail(email: string | null | undefined): string {
  if (!email) return "(none)";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  return name.slice(0, 2) + "***@" + domain;
}

async function main() {
  console.log("\n📋 CONTENT DATA AUDIT");
  console.log("=".repeat(60));

  // ── User Stats ─────────────────────────────────────
  console.log("\n👥 USER STATS");
  const totalUsers = await db.user.count();
  const totalGuru = await db.user.count({ where: { role: "GURU" } });
  const totalMurid = await db.user.count({ where: { role: "MURID" } });
  const totalAdmin = await db.user.count({ where: { role: "ADMIN" } });
  const totalFounder = await db.user.count({ where: { isFounder: true } });
  const totalOnboarded = await db.user.count({ where: { onboarded: true } });
  const totalWithAvatar = await db.user.count({ where: { avatar: { not: null } } });

  console.log(`   Total users:         ${totalUsers}`);
  console.log(`   Guru:                ${totalGuru}`);
  console.log(`   Murid:               ${totalMurid}`);
  console.log(`   Admin:               ${totalAdmin}`);
  console.log(`   Founder:             ${totalFounder}`);
  console.log(`   Onboarded:           ${totalOnboarded}`);
  console.log(`   With avatar:         ${totalWithAvatar}`);

  // Users with null/invalid emails
  const usersNoEmail = await db.user.count({ where: { email: "" } });
  console.log(`   Empty email:         ${usersNoEmail}`);

  // ── Artikel Stats ───────────────────────────────────
  console.log("\n📰 ARTIKEL");
  const totalArtikel = await db.artikel.count();
  const artikelPublished = await db.artikel.count({ where: { isPublished: true } });
  const artikelNoContent = await db.artikel.count({ where: { content: "" } });
  const artikelNoTitle = await db.artikel.count({ where: { title: "" } });
  const artikelNoCover = await db.artikel.count({ where: { coverImage: null } });
  console.log(`   Total:               ${totalArtikel}`);
  console.log(`   Published:           ${artikelPublished}`);
  console.log(`   No content:          ${artikelNoContent}`);
  console.log(`   No title:            ${artikelNoTitle}`);
  console.log(`   No cover image:      ${artikelNoCover}`);

  // 20 newest
  const artikelNewest = await db.artikel.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, slug: true, createdAt: true, isPublished: true },
  });
  console.log(`\n   ── 20 Terbaru ──`);
  for (const a of artikelNewest) {
    console.log(`   [${a.createdAt.toISOString().slice(0, 10)}] ${a.title} ${a.isPublished ? "✅" : "🔒"} (${a.slug})`);
  }

  const artikelOldest = await db.artikel.findMany({
    orderBy: { createdAt: "asc" },
    take: 20,
    select: { id: true, title: true, slug: true, createdAt: true, isPublished: true },
  });
  console.log(`\n   ── 20 Terlama ──`);
  for (const a of artikelOldest) {
    console.log(`   [${a.createdAt.toISOString().slice(0, 10)}] ${a.title} ${a.isPublished ? "✅" : "🔒"} (${a.slug})`);
  }

  // ── Video Stats ─────────────────────────────────────
  console.log("\n🎬 VIDEO");
  const totalVideo = await db.video.count();
  const videoPublished = await db.video.count({ where: { isPublished: true } });
  const videoNoTitle = await db.video.count({ where: { title: "" } });
  const videoNoUrl = await db.video.count({ where: { videoUrl: "" } });
  const videoNoThumbnail = await db.video.count({ where: { thumbnailUrl: null } });
  console.log(`   Total:               ${totalVideo}`);
  console.log(`   Published:           ${videoPublished}`);
  console.log(`   No title:            ${videoNoTitle}`);
  console.log(`   No URL:              ${videoNoUrl}`);
  console.log(`   No thumbnail:        ${videoNoThumbnail}`);

  const videoNewest = await db.video.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, createdAt: true, isPublished: true },
  });
  console.log(`\n   ── 20 Terbaru ──`);
  for (const v of videoNewest) {
    console.log(`   [${v.createdAt.toISOString().slice(0, 10)}] ${v.title} ${v.isPublished ? "✅" : "🔒"}`);
  }

  // ── Karya (Marketplace) Stats ───────────────────────
  console.log("\n🏪 KARYA (Marketplace)");
  const totalKarya = await db.karya.count();
  const karyaPublished = await db.karya.count({ where: { isPublished: true } });
  const karyaPremium = await db.karya.count({ where: { isPremium: true } });
  const karyaNoTitle = await db.karya.count({ where: { title: "" } });
  const karyaNoDesc = await db.karya.count({ where: { description: "" } });
  const karyaNoFile = await db.karya.count({ where: { fileUrl: "" } });
  const karyaNoSeller = await db.karya.count({ where: { sellerId: "" } });
  const karyaFree = await db.karya.count({ where: { price: 0 } });
  console.log(`   Total:               ${totalKarya}`);
  console.log(`   Published:           ${karyaPublished}`);
  console.log(`   Premium:             ${karyaPremium}`);
  console.log(`   Free (Rp 0):         ${karyaFree}`);
  console.log(`   No title:            ${karyaNoTitle}`);
  console.log(`   No description:      ${karyaNoDesc}`);
  console.log(`   No file:             ${karyaNoFile}`);

  const karyaNewest = await db.karya.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, type: true, price: true, createdAt: true, isPublished: true, sellerId: true },
  });
  console.log(`\n   ── 20 Terbaru ──`);
  for (const k of karyaNewest) {
    const seller = await db.user.findUnique({ where: { id: k.sellerId }, select: { email: true } });
    console.log(`   [${k.createdAt.toISOString().slice(0, 10)}] ${k.title} | ${k.type} | Rp${k.price} | seller: ${maskEmail(seller?.email)} ${k.isPublished ? "✅" : "🔒"}`);
  }

  // ── Student Karya Stats ─────────────────────────────
  console.log("\n📝 KARYA SISWA");
  const totalSK = await db.studentKarya.count();
  const skFeatured = await db.studentKarya.count({ where: { isFeatured: true } });
  const skNoTitle = await db.studentKarya.count({ where: { title: "" } });
  const skNoContent = await db.studentKarya.count({ where: { content: "" } });
  const skNoCover = await db.studentKarya.count({ where: { coverImage: null } });
  console.log(`   Total:               ${totalSK}`);
  console.log(`   Featured:            ${skFeatured}`);
  console.log(`   No title:            ${skNoTitle}`);
  console.log(`   No content:          ${skNoContent}`);
  console.log(`   No cover:            ${skNoCover}`);

  // Per type
  const skTypes = ["PUISI", "CERPEN", "ARTIKEL", "ANEKDOT", "PANTUN", "OPINI"] as const;
  for (const t of skTypes) {
    const c = await db.studentKarya.count({ where: { type: t as any } });
    if (c > 0) console.log(`   ${t}: ${c}`);
  }

  const skNewest = await db.studentKarya.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, title: true, type: true, createdAt: true, likesCount: true, viewsCount: true, userId: true },
  });
  console.log(`\n   ── 20 Terbaru ──`);
  for (const k of skNewest) {
    const author = await db.user.findUnique({ where: { id: k.userId }, select: { email: true } });
    console.log(`   [${k.createdAt.toISOString().slice(0, 10)}] ${k.title} | ${k.type} | ❤️${k.likesCount} 👁️${k.viewsCount} | ${maskEmail(author?.email)}`);
  }

  // ── Comments & Likes Stats ─────────────────────────
  console.log("\n💬 KOMENTAR & LIKE");
  const totalComment = await db.studentKaryaComment.count();
  const totalLike = await db.studentKaryaLike.count();
  const commentsEmpty = await db.studentKaryaComment.count({ where: { content: "" } });
  console.log(`   Total komentar:      ${totalComment}`);
  console.log(`   Total like:          ${totalLike}`);
  console.log(`   Komentar kosong:     ${commentsEmpty}`);

  // ── Pembelian (Purchases) Stats ────────────────────
  console.log("\n💰 PEMBELIAN / TRANSACTIONS");
  const totalPembelian = await db.pembelian.count();
  const totalTransaksi = await db.transaksi.count();
  const totalPurchaseHistory = await db.purchaseHistory.count();
  const totalSellerEarnings = await db.sellerEarning.count();
  const totalWithdrawals = await db.withdrawal.count();
  const totalSubscriptions = await db.subscription.count();
  console.log(`   Pembelian:           ${totalPembelian}`);
  console.log(`   Transaksi:           ${totalTransaksi}`);
  console.log(`   Purchase History:    ${totalPurchaseHistory}`);
  console.log(`   Seller Earnings:     ${totalSellerEarnings}`);
  console.log(`   Withdrawals:         ${totalWithdrawals}`);
  console.log(`   Subscriptions:       ${totalSubscriptions}`);

  // ── AI Data Stats ───────────────────────────────────
  console.log("\n🤖 AI DATA");
  const totalAiSaved = await db.aiSavedResult.count();
  const totalAiUsage = await db.aIUsage.count();
  const totalAiCreditLedger = await db.aiCreditLedger.count();
  const totalAiJobs = await db.aIJob.count();
  console.log(`   AiSavedResult:       ${totalAiSaved}`);
  console.log(`   AIUsage:             ${totalAiUsage}`);
  console.log(`   AiCreditLedger:      ${totalAiCreditLedger}`);
  console.log(`   AIJob:               ${totalAiJobs}`);

  // ── Groups & Quiz Stats ─────────────────────────────
  console.log("\n👥 KELAS & QUIZ");
  const totalGroups = await db.group.count();
  const totalGroupMembers = await db.groupMember.count();
  const totalQuiz = await db.quiz.count();
  const totalQuizQ = await db.quizQuestion.count();
  const totalQuizAssignment = await db.quizAssignment.count();
  const totalQuizSubmission = await db.quizSubmission.count();
  const totalPenugasan = await db.penugasan.count();
  const totalPenugasanSub = await db.penugasanSubmission.count();
  console.log(`   Groups:              ${totalGroups}`);
  console.log(`   Group Members:       ${totalGroupMembers}`);
  console.log(`   Quizzes:             ${totalQuiz}`);
  console.log(`   Quiz Questions:      ${totalQuizQ}`);
  console.log(`   Quiz Assignments:    ${totalQuizAssignment}`);
  console.log(`   Quiz Submissions:    ${totalQuizSubmission}`);
  console.log(`   Penugasan:           ${totalPenugasan}`);
  console.log(`   Penugasan Sub:       ${totalPenugasanSub}`);

  // ── Notifikasi ─────────────────────────────────────
  console.log("\n🔔 NOTIFIKASI");
  const totalNotif = await db.notifikasi.count();
  console.log(`   Total:               ${totalNotif}`);

  // ── Game Data ───────────────────────────────────────
  console.log("\n🎮 GAME");
  const totalGameRooms = await db.gameRoom.count();
  const totalGameQuestions = await db.gameQuestion.count();
  const totalGameSessions = await db.gameSession.count();
  const totalGameResults = await db.gameResult.count();
  console.log(`   Game Rooms:          ${totalGameRooms}`);
  console.log(`   Game Questions:      ${totalGameQuestions}`);
  console.log(`   Game Sessions:       ${totalGameSessions}`);
  console.log(`   Game Results:        ${totalGameResults}`);

  // ── Seed Data Detection ─────────────────────────────
  console.log("\n🔍 SEED DATA DETECTION");
  
  // Check for seed Artikel (title contains certain patterns)
  const seedKeywords = ["demo", "test", "contoh", "sample", "seed", "percobaan"];
  for (const kw of seedKeywords) {
    const c = await db.artikel.count({ where: { title: { contains: kw, mode: "insensitive" } } });
    if (c > 0) console.log(`   Artikel dengan "${kw}" di judul: ${c}`);
  }

  // Check demo users
  const demoEmails = ["guru@demo.com", "murid@demo.com"];
  for (const e of demoEmails) {
    const demo = await db.user.findFirst({ where: { email: e } });
    if (demo) console.log(`   Demo user: ${demo.email} (role: ${demo.role})`);
  }

  // ── Users with missing data ─────────────────────────
  console.log("\n⚠️  ANOMALIES");
  const usersNoSupabaseId = await db.user.count({ where: { supabaseId: "" } });
  const usersNoFullName = await db.user.count({ where: { fullName: "" } });
  console.log(`   Users without supabaseId: ${usersNoSupabaseId}`);
  console.log(`   Users without fullName:   ${usersNoFullName}`);

  // Check for orphaned records (Karya without valid seller)
  const karyaOrphanCount = await db.karya.count();
  if (karyaOrphanCount === 0) {
    console.log(`   Karya without seller: 0 (no karya data)`);
  } else {
    const karyaOrphanQuery = await db.karya.findMany({
      take: 10,
      select: { id: true, title: true, sellerId: true },
    });
    let orphaned = 0;
    for (const k of karyaOrphanQuery) {
      const seller = await db.user.findUnique({ where: { id: k.sellerId } });
      if (!seller) orphaned++;
    }
    console.log(`   Karya checked (first 10): ${orphaned} without valid seller`);
  }

  // ── Summary ─────────────────────────────────────────
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 AUDIT SUMMARY");
  console.log(`   Artikel:         ${totalArtikel}`);
  console.log(`   Video:           ${totalVideo}`);
  console.log(`   Karya:           ${totalKarya}`);
  console.log(`   Karya Siswa:     ${totalSK}`);
  console.log(`   Komentar:        ${totalComment}`);
  console.log(`   Like:            ${totalLike}`);
  console.log(`   Users:           ${totalUsers} (Guru:${totalGuru} Murid:${totalMurid} Admin:${totalAdmin})`);
  console.log(`   Pembelian:       ${totalPembelian}`);
  console.log(`   Subscriptions:   ${totalSubscriptions}`);
  console.log(`   Groups:          ${totalGroups}`);
  console.log(`   Notifikasi:      ${totalNotif}`);
  console.log(`   Game Rooms:      ${totalGameRooms}`);

  await db.$disconnect();
  console.log("\n✅ Audit complete\n");
}

main().catch((e) => {
  console.error("❌ Audit failed:", e.message);
  process.exit(1);
});
