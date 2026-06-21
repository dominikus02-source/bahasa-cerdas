export function getIsProduction(): boolean {
  // Server-side env has highest priority
  if (typeof process !== "undefined" && process.env.MIDTRANS_IS_PRODUCTION != null) {
    return process.env.MIDTRANS_IS_PRODUCTION === "true";
  }
  // Client-side env as fallback
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION != null) {
    return process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
  }
  // Production by default
  return true;
}

function getApiBase(): string {
  return getIsProduction()
    ? "https://app.midtrans.com"
    : "https://app.sandbox.midtrans.com";
}

function validateConfig() {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  const clientKey = (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").trim();
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY tidak dikonfigurasi");
  if (!clientKey) throw new Error("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak dikonfigurasi");
}

export function getSnapScriptUrl(): string {
  return getIsProduction()
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export function getMidtransApiUrl(): string {
  return getApiBase();
}

interface SnapResult {
  transactionToken: string;
  redirectUrl: string;
  orderId: string;
}

async function createSnap(params: {
  orderId: string;
  amount: number;
  fullName: string;
  email: string;
}): Promise<{ token: string; redirectUrl: string }> {
  const baseUrl = getApiBase();
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  const auth = Buffer.from(`${serverKey}:`).toString("base64");

  const body = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: params.fullName,
      email: params.email,
    },
  };

  const res = await fetch(`${baseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    const errMsg = Array.isArray(json?.error_messages)
      ? json.error_messages.join(", ")
      : json?.error_messages || `HTTP ${res.status}`;
    const error: any = new Error(errMsg);
    error.httpStatusCode = res.status;
    error.apiResponse = json;
    throw error;
  }

  return { token: json.token, redirectUrl: json.redirect_url };
}

export async function createTransaction(params: {
  userId: string;
  email: string;
  fullName: string;
  plan: "monthly" | "yearly";
}): Promise<SnapResult> {
  validateConfig();
  const amount = params.plan === "monthly" ? 49000 : 399000;
  const orderId = `PM-${Date.now().toString(36).slice(-6).toUpperCase()}-${params.userId.slice(0, 8)}`;

  const result = await createSnap({
    orderId,
    amount,
    fullName: params.fullName,
    email: params.email,
  });

  return { transactionToken: result.token, redirectUrl: result.redirectUrl, orderId };
}

export async function createKaryaTransaction(params: {
  orderId: string;
  amount: number;
  email: string;
  fullName: string;
  itemId: string;
  itemTitle: string;
}): Promise<SnapResult> {
  validateConfig();

  try {
    const result = await createSnap({
      orderId: params.orderId,
      amount: params.amount,
      fullName: params.fullName,
      email: params.email,
    });
    return { transactionToken: result.token, redirectUrl: result.redirectUrl, orderId: params.orderId };
  } catch (err: any) {
    console.error("Midtrans createKaryaTransaction error:", {
      status: err?.httpStatusCode,
      message: err?.message,
      apiResponse: err?.apiResponse,
    });
    throw err;
  }
}
