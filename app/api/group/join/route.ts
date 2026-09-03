import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { ensureAttributionOnClassJoin } from "@/lib/commission/attribution";
import { recordRiskSignal } from "@/lib/guru/risk/signals";
import {
  recordProductEvent,
  PRODUCT_EVENT_F5_FIRST_JOIN,
} from "@/lib/analytics/product-event-store";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await db.user.findUnique({ where: { supabaseId: user.id } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = await req.json();
    const { accessCode } = body;

    if (!accessCode) return NextResponse.json({ error: "Kode akses wajib diisi" }, { status: 400 });

    const group = await db.group.findUnique({
      where: { accessCode: accessCode.toUpperCase(), isActive: true },
      include: { teacher: { select: { fullName: true, id: true } } },
    });

    if (!group) return NextResponse.json({ error: "Kode tidak valid atau grup sudah tidak aktif" }, { status: 404 });

    const existing = await db.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: dbUser.id } },
    });

    if (existing) return NextResponse.json({ error: "Anda sudah terdaftar di grup ini", group }, { status: 409 });

    const member = await db.groupMember.create({
      data: { groupId: group.id, userId: dbUser.id },
    });

    // ── P0 #5 — Operational Teacher Experiment: F5 milestone (server-truth) ──
    // First student joins the class = the observable "share worked" moment that
    // follows F4 (code shared). Idempotent logicalKey (once per group); only
    // fired on the actual FIRST join (memberCount === 1) so later joins don't
    // re-record. Best-effort, fire-and-forget, safe props — never blocks join.
    const memberCount = await db.groupMember.count({ where: { groupId: group.id } });
    if (memberCount === 1) {
      void recordProductEvent({
        actorId: group.teacherId,
        event: PRODUCT_EVENT_F5_FIRST_JOIN,
        entityType: "Group",
        entityId: group.id,
        logicalKey: `group-${group.id}-first-join`,
        props: { grade: group.grade, studentId: dbUser.id },
      });
    }

    // ── P7C: atribusi "Guru Cerdas Sejahtera" (first-valid-wins) ──
    // Best-effort: kegagalan di sini TIDAK menggagalkan join kelas. Kalau
    // murid sudah punya atribusi, skip (aturan locked P7A).
    // ── P8C: SELF_REFERRAL_ATTEMPT dicatat sebagai signal observability ──
    ensureAttributionOnClassJoin(dbUser.id, group.id)
      .then((res) => {
        if (res.skipped && res.skipReason === "SELF_REFERRAL") {
          recordRiskSignal({
            teacherId: res.teacherId,
            signalType: "SELF_REFERRAL_ATTEMPT",
            severity: "LOW",
            dedupeKey: `self-referral:${dbUser.id}`,
            evidence: { groupId: group.id },
          }).catch(() => {});
        }
      })
      .catch((err) => {
        console.error("[attribution] gagal saat join kelas:", err);
      });

    // ── P8B: notifikasi faktual ke guru — TANPA menyebut komisi (best-effort) ──
    db.notifikasi
      .create({
        data: {
          userId: group.teacherId,
          title: "Murid baru bergabung ke kelasmu",
          body: `${dbUser.fullName || "Seorang murid"} bergabung ke kelas ${group.name}.`,
          type: "KELAS",
          data: { groupId: group.id, studentId: dbUser.id },
        },
      })
      .catch(() => {});

    const responseGroup = {
      ...group,
      teacher: undefined,
      guruNama: group.teacher?.fullName ?? null,
    };
    delete (responseGroup as Record<string, unknown>).teacher;

    return NextResponse.json({ message: "Berhasil bergabung", group: responseGroup, member });
  } catch (error) {
    console.error("POST /api/group/join error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}