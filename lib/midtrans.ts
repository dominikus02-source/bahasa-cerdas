import type { Snap } from "midtrans-client";

let midtransClient: Snap;

export function getIsProduction(): boolean {
  const env = process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION;
  if (env === "true") return true;
  return false;
}

function validateConfig() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY;
  if (!serverKey) throw new Error("MIDTRANS_SERVER_KEY tidak dikonfigurasi di environment Vercel");
  if (!clientKey) throw new Error("NEXT_PUBLIC_MIDTRANS_CLIENT_KEY tidak dikonfigurasi");
}

export function getSnapScriptUrl(): string {
  return getIsProduction()
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}

export async function createTransaction(params: {
  userId: string;
  email: string;
  fullName: string;
  plan: "monthly" | "yearly";
}) {
  validateConfig();
  const Midtrans = require("midtrans-client");
  
  midtransClient = new Midtrans.Snap({
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    isProduction: getIsProduction(),
  });

  const amount = params.plan === "monthly" ? 49000 : 399000;

  const orderId = `PM-${Date.now().toString(36).slice(-6).toUpperCase()}-${params.userId.slice(0,8)}`;

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: params.fullName,
      email: params.email,
    },
    credit_card: {
      save_card: false,
      collect_card_token: false,
    },
  };

  const transaction = await midtransClient.createTransaction(parameter);
  return { transactionToken: transaction.token, redirectUrl: transaction.redirect_url, orderId };
}

export async function createKaryaTransaction(params: {
  orderId: string;
  amount: number;
  email: string;
  fullName: string;
  itemId: string;
  itemTitle: string;
}) {
  validateConfig();
  const Midtrans = require("midtrans-client");
  
  const client = new Midtrans.Snap({
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    isProduction: getIsProduction(),
  });

  const parameter = {
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      first_name: params.fullName,
      email: params.email,
    },
  };

  try {
    const transaction = await client.createTransaction(parameter);
    return { transactionToken: transaction.token, redirectUrl: transaction.redirect_url, orderId: params.orderId };
  } catch (err: any) {
    console.error("Midtrans createKaryaTransaction error:", err);
    console.error("Midtrans HTTP error details:", err?.http_error_details || err?.ApiResponse || err?.message);
    throw err;
  }
}

export { midtransClient };
