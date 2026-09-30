import { createClient } from "@/lib/supabase/client";

export type BrowserSessionUser = {
  role: string;
  isFounder: boolean;
};

export type BrowserPasswordLoginResult =
  | { ok: true; user: BrowserSessionUser }
  | { ok: false; error: string; retryAfterSeconds?: number };

type BrowserPasswordLoginFailure = {
  error: string;
  retryAfterSeconds?: number;
};

const AUTH_RATE_LIMIT_RETRY_SECONDS = 5 * 60;

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) return undefined;

  const { status } = error;
  return typeof status === "number" ? status : undefined;
}

function getErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object" || !("message" in error)) return "";

  const { message } = error;
  return typeof message === "string" ? message : "";
}

function isBrowserSessionUser(value: unknown): value is BrowserSessionUser {
  if (!value || typeof value !== "object") return false;

  const { role, isFounder } = value as Record<string, unknown>;
  return typeof role === "string" && typeof isFounder === "boolean";
}

function getLoginError(error: unknown): BrowserPasswordLoginFailure {
  const status = getErrorStatus(error);
  const message = getErrorMessage(error);

  if (status === 429) {
    return {
      error: "Terlalu banyak percobaan masuk. Tunggu 5 menit, lalu coba lagi.",
      retryAfterSeconds: AUTH_RATE_LIMIT_RETRY_SECONDS,
    };
  }

  if (message === "Invalid login credentials") {
    return { error: "Email atau kata sandi salah." };
  }

  if (message === "Email not confirmed") {
    return { error: "Email belum dikonfirmasi. Cek inbox atau folder spam kamu." };
  }

  return { error: "Login belum dapat diproses. Silakan coba lagi." };
}

/**
 * Signs in from the browser so Supabase receives the user's own source IP.
 *
 * Routing a password login through a Vercel Route Handler makes every user
 * share Vercel's egress IP, which can exhaust Supabase's per-IP Auth limit.
 * The role still comes from our server-side User record; browser metadata is
 * never trusted for authorization or routing.
 */
export async function loginWithBrowserPassword(input: {
  email: string;
  password: string;
}): Promise<BrowserPasswordLoginResult> {
  const supabase = createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: input.email.trim().toLowerCase(),
    password: input.password,
  });

  if (signInError) return { ok: false, ...getLoginError(signInError) };

  try {
    const response = await fetch("/api/user/me?fresh=1", {
      cache: "no-store",
      credentials: "same-origin",
    });
    const payload: unknown = await response.json().catch(() => null);

    if (!response.ok || !payload || typeof payload !== "object") {
      return { ok: false, error: "Sesi berhasil dibuat, tetapi data akun belum dapat dimuat. Coba lagi sebentar." };
    }

    const { user } = payload as { user?: unknown };
    if (!isBrowserSessionUser(user)) {
      return { ok: false, error: "Data akun belum lengkap. Silakan hubungi admin sekolah." };
    }

    return { ok: true, user };
  } catch {
    return { ok: false, error: "Sesi berhasil dibuat, tetapi koneksi ke aplikasi terputus. Coba lagi sebentar." };
  }
}
