import { randomUUID } from "node:crypto";

import Link from "next/link";

import { db } from "@/lib/db";
import { authorizeFounder } from "@/src/agent/control";

export const dynamic = "force-dynamic";

/**
 * BC Agent P8B — Telegram binding management (Founder Control Center).
 *
 * Enrollment model (P8B Phase 8): the founder creates a binding by entering
 * their Telegram numeric user id + the bound chat id here, under their
 * authenticated web session. There is NO auto-linking by name/username and
 * NO token-in-URL pairing. The Telegram side can never enroll itself: the
 * adapter only READS bindings; only this page (session-gated) and explicit
 * founder action create or revoke them.
 *
 * The numeric Telegram id is not a secret (any user can learn their own);
 * the binding is safe because authorization requires the founder to ALSO
 * control that Telegram account and the bound chat at command time.
 */

function parseId(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return /^\d{3,20}$/.test(trimmed) ? trimmed : null;
}

async function createBinding(formData: FormData): Promise<string> {
  "use server";

  const access = await authorizeFounder();
  if (!access.ok) return "Akses ditolak.";

  const telegramUserId = parseId(formData.get("telegramUserId"));
  const telegramChatId = parseId(formData.get("telegramChatId"));
  const label = typeof formData.get("label") === "string" ? String(formData.get("label")).slice(0, 60) : null;
  if (!telegramUserId || !telegramChatId) {
    return "Telegram User ID dan Chat ID harus berupa angka.";
  }

  try {
    await db.agentTelegramBinding.upsert({
      where: { telegramUserId },
      create: {
        id: randomUUID(),
        telegramUserId,
        telegramChatId,
        userId: access.userId,
        label,
        boundBy: access.userId,
      },
      update: {
        // Re-enrollment / chat change / un-revoke are explicit founder acts.
        telegramChatId,
        userId: access.userId,
        boundBy: access.userId,
        revokedAt: null,
        ...(label !== null ? { label } : {}),
      },
    });
    return "Binding tersimpan.";
  } catch {
    return "Gagal menyimpan binding.";
  }
}

async function revokeBinding(formData: FormData): Promise<string> {
  "use server";

  const access = await authorizeFounder();
  if (!access.ok) return "Akses ditolak.";

  const id = typeof formData.get("id") === "string" ? String(formData.get("id")) : null;
  if (!id) return "ID binding tidak valid.";

  try {
    await db.agentTelegramBinding.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return "Binding dicabut.";
  } catch {
    return "Gagal mencabut binding.";
  }
}

export default async function TelegramBindingPage() {
  const access = await authorizeFounder();
  if (!access.ok) {
    return <p className="p-6 text-sm text-red-600">Akses ditolak.</p>;
  }

  const bindings = await db.agentTelegramBinding.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      telegramUserId: true,
      telegramChatId: true,
      label: true,
      boundAt: true,
      lastSeenAt: true,
      revokedAt: true,
    },
  });

  async function bindAction(formData: FormData) {
    "use server";
    await createBinding(formData);
  }
  async function revokeAction(formData: FormData) {
    "use server";
    await revokeBinding(formData);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-6 p-6">
      <header className="space-y-1">
        <Link href="/admin/agent" className="text-xs text-violet-600 hover:underline dark:text-violet-300">
          ← Kembali ke Control Center
        </Link>
        <h1 className="text-lg font-bold text-slate-900 dark:text-slate-50">Telegram Binding</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Daftarkan identitas Telegram yang diizinkan mengendalikan BC Agent. Hanya founder yang
          membuat/mencabut binding di sini — Telegram tidak bisa mendaftar sendiri.
        </p>
      </header>

      <form action={bindAction} className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
        <h2 className="text-sm font-semibold">Tambah / perbarui binding</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-medium">
            Telegram User ID (angka)
            <input name="telegramUserId" required pattern="\d{3,20}" className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-600" />
          </label>
          <label className="text-xs font-medium">
            Telegram Chat ID (angka)
            <input name="telegramChatId" required pattern="\d{3,20}" className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-600" />
          </label>
        </div>
        <label className="text-xs font-medium block">
          Label (opsional)
          <input name="label" maxLength={60} className="mt-1 w-full rounded border px-2 py-1.5 text-sm dark:bg-slate-800 dark:border-slate-600" />
        </label>
        <button type="submit" className="rounded bg-violet-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-violet-700">
          Simpan binding
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Binding terdaftar</h2>
        {bindings.length === 0 && <p className="text-xs text-slate-500">Belum ada binding.</p>}
        <ul className="space-y-2">
          {bindings.map((b) => (
            <li key={b.id} className="flex items-center justify-between rounded border border-slate-200 px-3 py-2 text-xs dark:border-slate-700">
              <div>
                <span className="font-mono">{b.telegramUserId}</span> → chat <span className="font-mono">{b.telegramChatId}</span>
                {b.label ? <span className="text-slate-500"> • {b.label}</span> : null}
                <span className={b.revokedAt ? "text-red-500" : "text-emerald-600"}> • {b.revokedAt ? "dicabut" : "aktif"}</span>
              </div>
              {!b.revokedAt && (
                <form action={revokeAction}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className="rounded border border-red-300 px-2 py-1 font-semibold text-red-600 hover:bg-red-50 dark:border-red-800">
                    Cabut
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
