export interface MidtransConfig {
  serverKey: string;
  clientKey: string;
  isProduction: boolean;
  apiBaseUrl: string;
  snapScriptUrl: string;
}

export interface SnapTransactionResult {
  token: string;
  redirectUrl: string;
}

export type MidtransErrorCode =
  | "MIDTRANS_CONFIG_MISSING"
  | "MIDTRANS_MODE_MISMATCH"
  | "MIDTRANS_UNAUTHORIZED"
  | "MIDTRANS_CREATE_FAILED";

export class MidtransError extends Error {
  code: MidtransErrorCode;
  httpStatus: number;
  apiResponse?: any;

  constructor(code: MidtransErrorCode, message: string, httpStatus: number, apiResponse?: any) {
    super(message);
    this.name = "MidtransError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.apiResponse = apiResponse;
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      httpStatus: this.httpStatus,
    };
  }
}

function getIsProduction(): boolean {
  if (typeof process !== "undefined" && process.env.MIDTRANS_IS_PRODUCTION != null) {
    return process.env.MIDTRANS_IS_PRODUCTION === "true";
  }
  if (typeof process !== "undefined" && process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION != null) {
    return process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true";
  }
  return true;
}

export function getMidtransConfig(): MidtransConfig {
  const serverKey = (process.env.MIDTRANS_SERVER_KEY || "").trim();
  const clientKey = (process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "").trim();

  const isProduction = getIsProduction();

  return {
    serverKey,
    clientKey,
    isProduction,
    apiBaseUrl: isProduction
      ? "https://app.midtrans.com"
      : "https://app.sandbox.midtrans.com",
    snapScriptUrl: isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js",
  };
}

export function validateMidtransConfig(): void {
  const config = getMidtransConfig();
  if (!config.serverKey) {
    throw new MidtransError(
      "MIDTRANS_CONFIG_MISSING",
      "MIDTRANS_SERVER_KEY tidak dikonfigurasi",
      500
    );
  }
  if (!config.clientKey) {
    throw new MidtransError(
      "MIDTRANS_CONFIG_MISSING",
      "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak dikonfigurasi",
      500
    );
  }

  const serverIsProduction = (process.env.MIDTRANS_IS_PRODUCTION || "").trim() === "true";
  const clientIsProduction = (process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION || "").trim() === "true";

  const serverKeyIsSandbox = config.serverKey.startsWith("SB-");
  const clientKeyIsSandbox = config.clientKey.startsWith("SB-");

  const problems: string[] = [];
  if (serverIsProduction !== clientIsProduction) {
    problems.push(
      `flag mismatch: MIDTRANS_IS_PRODUCTION=${serverIsProduction} vs NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION=${clientIsProduction}`
    );
  }
  if (serverKeyIsSandbox !== !config.isProduction) {
    problems.push(
      `server key prefix mismatch: key ${serverKeyIsSandbox ? "starts with SB-" : "does not start with SB-"} but mode is ${config.isProduction ? "production" : "sandbox"}`
    );
  }
  if (clientKeyIsSandbox !== !config.isProduction) {
    problems.push(
      `client key prefix mismatch: key ${clientKeyIsSandbox ? "starts with SB-" : "does not start with SB-"} but mode is ${config.isProduction ? "production" : "sandbox"}`
    );
  }

  if (problems.length > 0) {
    throw new MidtransError(
      "MIDTRANS_MODE_MISMATCH",
      `Mode pembayaran tidak konsisten. Detail: ${problems.join(" | ")}`,
      500
    );
  }
}

export async function createMidtransSnapTransaction(params: {
  orderId: string;
  amount: number;
  fullName: string;
  email: string;
  phone?: string;
  items?: Array<{ id: string; name: string; price: number; quantity: number; category?: string }>;
}): Promise<SnapTransactionResult> {
  validateMidtransConfig();

  const config = getMidtransConfig();
  const auth = Buffer.from(`${config.serverKey}:`).toString("base64");

  const body: Record<string, any> = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: params.fullName,
      email: params.email,
    },
  };

  if (params.items && params.items.length > 0) {
    body.item_details = params.items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      category: item.category,
    }));
  }

  if (params.phone) {
    body.customer_details.phone = params.phone;
  }

  // Hardening: set finish callback and force notification URL so payment
  // activation does not depend solely on Midtrans dashboard configuration.
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://www.bahasacerdas.com").replace(/\/$/, "");
  body.callbacks = {
    finish: `${siteUrl}/payment/finish`,
  };

  const res = await fetch(`${config.apiBaseUrl}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      // Override notification so webhook always hits our endpoint
      "X-Override-Notification": `${siteUrl}/api/payment/webhook`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    const errMsg = Array.isArray(json?.error_messages)
      ? json.error_messages.join(", ")
      : json?.error_messages || `HTTP ${res.status}`;

    if (res.status === 401) {
      throw new MidtransError(
        "MIDTRANS_UNAUTHORIZED",
        "Kredensial pembayaran belum sesuai. Silakan hubungi admin.",
        401,
        json
      );
    }

    throw new MidtransError(
      "MIDTRANS_CREATE_FAILED",
      errMsg,
      res.status,
      json
    );
  }

  return { token: json.token, redirectUrl: json.redirect_url };
}

export function mapMidtransError(error: unknown): { error: string; message: string; httpStatus: number } {
  if (error instanceof MidtransError) {
    return { error: error.code, message: error.message, httpStatus: error.httpStatus };
  }
  return {
    error: "CHECKOUT_UNKNOWN_ERROR",
    message: "Terjadi kesalahan sistem. Silakan coba lagi atau hubungi admin.",
    httpStatus: 500,
  };
}
