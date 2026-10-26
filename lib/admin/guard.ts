import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getUser } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin/audit";
import { ADMIN_CONFIRM_HEADER, ADMIN_CONFIRM_PHRASE, requiresTypedConfirm } from "@/lib/admin/confirm";

/**
 * withAdmin — pembungkus WAJIB untuk setiap route di app/api/admin/**.
 *
 * 1. Otorisasi: hanya founder (User.isFounder) atau role ADMIN. Cek lama di
 *    dalam handler tetap ada (defense in depth).
 * 2. Konfirmasi ketik: route uang & massal (lib/admin/confirm.ts) wajib header
 *    `x-admin-confirm: KONFIRMASI`, jika tidak → 428 CONFIRM_REQUIRED.
 * 3. Audit: setiap POST/PUT/PATCH/DELETE dicatat ke AdminAuditLog (pelaku,
 *    path, status, params, ringkasan body yang sudah disaring — lihat
 *    sanitizeForAudit). GET tidak dicatat.
 *
 * `bearerEnv`: route yang juga dipanggil mesin (mis. agent/health) boleh lolos
 * dengan `Authorization: Bearer <env>` — tidak dicatat sebagai aksi admin.
 */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type AnyHandler = (...args: any[]) => Response | Promise<Response>;

export interface WithAdminOptions {
  /** Path route (dipakai bila handler tidak menerima Request). */
  route?: string;
  /** Metode HTTP export ini (GET/POST/…). */
  method?: string;
  /** Nama env berisi token bearer mesin yang boleh melewati cek sesi. */
  bearerEnv?: string;
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status });
}

async function readParams(ctx: unknown): Promise<Record<string, unknown> | undefined> {
  try {
    const p = (ctx as { params?: unknown } | undefined)?.params;
    if (!p) return undefined;
    return (await p) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

async function readBodySummary(req: Request): Promise<unknown> {
  const type = req.headers.get("content-type") || "";
  if (!type.includes("application/json")) {
    return type ? { _contentType: type.split(";")[0] } : undefined;
  }
  try {
    return await req.clone().json();
  } catch {
    return undefined;
  }
}

function pickTargetUserId(...sources: unknown[]): string | null {
  for (const s of sources) {
    if (s && typeof s === "object") {
      const o = s as Record<string, unknown>;
      for (const k of ["targetUserId", "userId", "teacherId"]) {
        if (typeof o[k] === "string" && o[k]) return o[k] as string;
      }
    }
  }
  return null;
}

export function withAdmin<H extends AnyHandler>(handler: H, opts: WithAdminOptions = {}): H {
  const wrapped = async (...args: Parameters<H>): Promise<Response> => {
    const req = args[0] instanceof Request ? (args[0] as Request) : null;
    const h = await headers();
    const method = (req?.method || opts.method || "GET").toUpperCase();
    let path = opts.route || "/api/admin";
    if (req) {
      try {
        path = new URL(req.url).pathname;
      } catch {
        /* biarkan default */
      }
    }

    if (opts.bearerEnv) {
      const expected = process.env[opts.bearerEnv];
      const auth = h.get("authorization") || "";
      const a = Buffer.from(auth);
      const b = Buffer.from(`Bearer ${expected || ""}`);
      if (expected && a.length === b.length && timingSafeEqual(a, b)) return handler(...args);
    }

    const user = await getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);
    if (!user.isFounder && user.role !== "ADMIN") return json({ error: "Forbidden" }, 403);

    if (!MUTATING.has(method)) return handler(...args);

    if (requiresTypedConfirm(method, path) && h.get(ADMIN_CONFIRM_HEADER) !== ADMIN_CONFIRM_PHRASE) {
      return json(
        {
          error: `Aksi ini perlu konfirmasi. Ketik ${ADMIN_CONFIRM_PHRASE} untuk melanjutkan.`,
          code: "CONFIRM_REQUIRED",
          phrase: ADMIN_CONFIRM_PHRASE,
        },
        428,
      );
    }

    const [params, body] = await Promise.all([readParams(args[1]), req ? readBodySummary(req) : undefined]);
    const query = req ? Object.fromEntries(new URL(req.url).searchParams) : undefined;
    const base = {
      actorId: user.id,
      actorEmail: user.email,
      method,
      path,
      targetUserId: pickTargetUserId(body, params, query),
      ip: (h.get("x-forwarded-for") || "").split(",")[0].trim() || h.get("x-real-ip"),
      userAgent: h.get("user-agent"),
    };
    // Kunci "input" (bukan "body") agar tidak ikut tersaring oleh pola kunci sensitif.
    const metadata = { params, query, input: body };

    try {
      const res = await handler(...args);
      await logAdminAction({ ...base, status: res.status, metadata });
      return res;
    } catch (error) {
      await logAdminAction({ ...base, status: 500, metadata: { ...metadata, thrown: true } });
      throw error;
    }
  };
  return wrapped as unknown as H;
}
