import type { Snap } from "midtrans-client";

let midtransClient: Snap;

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://bahasacerdas.com";
}

function getIsProduction(): boolean {
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
  const description =
    params.plan === "monthly"
      ? "BahasaCerdas PRO — 1 Bulan"
      : "BahasaCerdas PRO — 1 Tahun";

  const orderId = `PREMIUM-${params.userId}-${Date.now()}`;

  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: amount,
    },
    customer_details: {
      first_name: params.fullName,
      email: params.email,
    },
    item_details: [
      {
        id: params.plan,
        name: description,
        price: amount,
        quantity: 1,
      },
    ],
    credit_card: {
      save_card: false,
      collect_card_token: false,
    },
    callbacks: {
      finish: `${getSiteUrl()}/guru/pengaturan/premium?status=success&order_id=${orderId}`,
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
    item_details: [
      {
        id: params.itemId,
        name: params.itemTitle,
        price: params.amount,
        quantity: 1,
      },
    ],
    callbacks: {
      finish: `${getSiteUrl()}/marketplace?status=success&order_id=${params.orderId}`,
    },
  };

  const transaction = await client.createTransaction(parameter);
  return { transactionToken: transaction.token, redirectUrl: transaction.redirect_url, orderId: params.orderId };
}

export { midtransClient };
