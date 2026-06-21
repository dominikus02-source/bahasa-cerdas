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

  if (serverIsProduction !== clientIsProduction) {
    throw new MidtransError(
      "MIDTRANS_MODE_MISMATCH",
      "Mode production/sandbox tidak konsisten antara server dan client env",
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

  const res = await fetch(`${config.apiBaseUrl}/snap/v1/transactions`, {
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
