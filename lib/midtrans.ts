import type { Snap } from "midtrans-client";

let midtransClient: Snap;

export async function createTransaction(params: {
  userId: string;
  email: string;
  fullName: string;
  plan: "monthly" | "yearly";
}) {
  const Midtrans = require("midtrans-client");
  
  midtransClient = new Midtrans.Snap({
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    isProduction: process.env.NODE_ENV === "production",
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
      finish: `${process.env.NEXT_PUBLIC_SITE_URL}/guru/pengaturan/premium?status=success&order_id=${orderId}`,
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
  const Midtrans = require("midtrans-client");
  
  const client = new Midtrans.Snap({
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY,
    isProduction: process.env.NODE_ENV === "production",
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
      finish: `${process.env.NEXT_PUBLIC_SITE_URL}/marketplace?status=success&order_id=${params.orderId}`,
    },
  };

  const transaction = await client.createTransaction(parameter);
  return { transactionToken: transaction.token, redirectUrl: transaction.redirect_url, orderId: params.orderId };
}

export { midtransClient };
