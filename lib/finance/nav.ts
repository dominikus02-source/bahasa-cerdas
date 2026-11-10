export const FINANCE_TAB_IDS = [
  "ringkasan",
  "pembayaran",
  "premium",
  "penarikan",
  "payout",
  "buku-kas",
] as const;

export type FinanceTabId = (typeof FINANCE_TAB_IDS)[number];

export const FINANCE_TABS: { id: FinanceTabId; label: string; href: string }[] = [
  { id: "ringkasan", label: "Ringkasan", href: "/admin/keuangan" },
  { id: "pembayaran", label: "Pembayaran", href: "/admin/payments" },
  { id: "premium", label: "Premium", href: "/admin/premium" },
  { id: "penarikan", label: "Penarikan", href: "/admin/withdrawals" },
  { id: "payout", label: "Payout Guru", href: "/admin/teacher-payouts" },
  { id: "buku-kas", label: "Buku Kas", href: "/admin/keuangan/buku-kas" },
];

export const FINANCE_HUB_PREFIXES = [
  "/admin/keuangan",
  "/admin/premium",
  "/admin/payments",
  "/admin/withdrawals",
  "/admin/teacher-payouts",
] as const;

export function isFinanceHubPath(pathname: string): boolean {
  return FINANCE_HUB_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function financeTabFromLocation(pathname: string, tabQuery?: string | null): FinanceTabId {
  if (pathname.startsWith("/admin/keuangan/buku-kas") || tabQuery === "buku-kas") return "buku-kas";
  if (pathname === "/admin/payments" || pathname.startsWith("/admin/payments/")) return "pembayaran";
  if (pathname === "/admin/premium" || pathname.startsWith("/admin/premium/")) return "premium";
  if (pathname === "/admin/withdrawals" || pathname.startsWith("/admin/withdrawals/")) return "penarikan";
  if (pathname === "/admin/teacher-payouts" || pathname.startsWith("/admin/teacher-payouts/")) return "payout";
  if (tabQuery && (FINANCE_TAB_IDS as readonly string[]).includes(tabQuery)) return tabQuery as FinanceTabId;
  return "ringkasan";
}
