/**
 * Client helper: ask the server to verify a Midtrans order and activate it.
 * The server queries Midtrans itself; the browser only sends the order id.
 */
export type ReconcileClientStatus =
  | "SUCCESS"
  | "PENDING"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "NOT_FOUND"
  | "REFUNDED"
  | "ERROR";

export async function reconcilePayment(orderId: string | null | undefined): Promise<ReconcileClientStatus> {
  if (!orderId) return "ERROR";
  try {
    const res = await fetch("/api/billing/reconcile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) return "ERROR";
    return (data.status as ReconcileClientStatus) || "ERROR";
  } catch {
    return "ERROR";
  }
}

/** Retry with backoff until a terminal status (settlement can lag a few seconds). */
export async function reconcilePaymentUntilFinal(
  orderId: string | null | undefined,
  { attempts = 6, delayMs = 2500 }: { attempts?: number; delayMs?: number } = {}
): Promise<ReconcileClientStatus> {
  let last: ReconcileClientStatus = "ERROR";
  for (let i = 0; i < attempts; i++) {
    last = await reconcilePayment(orderId);
    if (last !== "PENDING" && last !== "ERROR" && last !== "NOT_FOUND") return last;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return last;
}
