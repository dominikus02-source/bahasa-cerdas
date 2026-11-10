"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import FinanceSummary from "@/components/admin/finance/FinanceSummary";
import LedgerBook from "@/components/admin/finance/LedgerBook";
import { FINANCE_TABS, financeTabFromLocation, type FinanceTabId } from "@/lib/finance/nav";

const PaymentsView = dynamic(() => import("@/app/(dashboard)/admin/payments/payments-view"), { ssr: false });
const PremiumView = dynamic(() => import("@/app/(dashboard)/admin/premium/premium-view"), { ssr: false });
const WithdrawalsView = dynamic(() => import("@/app/(dashboard)/admin/withdrawals/withdrawals-view"), { ssr: false });
const TeacherPayoutsView = dynamic(() => import("@/app/(dashboard)/admin/teacher-payouts/teacher-payouts-view"), { ssr: false });

function Panel({ tab }: { tab: FinanceTabId }) {
  if (tab === "pembayaran") return <PaymentsView />;
  if (tab === "premium") return <PremiumView />;
  if (tab === "penarikan") return <WithdrawalsView />;
  if (tab === "payout") return <TeacherPayoutsView />;
  if (tab === "buku-kas") return <LedgerBook />;
  return <FinanceSummary />;
}

function FinanceHubInner({ initialTab }: { initialTab?: FinanceTabId }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const tab = initialTab || financeTabFromLocation(pathname, search.get("tab"));

  return (
    <div className="min-w-0 space-y-4 pb-4">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Keuangan</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">Pusat keuangan admin BahasaCerdas</p>
      </div>
      <div className="min-w-0 overflow-x-auto -mx-1 px-1">
        <nav className="flex w-max min-w-full gap-1" aria-label="Bagian keuangan">
          {FINANCE_TABS.map((item) => {
            const active = item.id === tab;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
      <Panel tab={tab} />
    </div>
  );
}

export default function FinanceHub({ initialTab }: { initialTab?: FinanceTabId }) {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-slate-500 dark:text-slate-400">Memuat keuangan…</div>}>
      <FinanceHubInner initialTab={initialTab} />
    </Suspense>
  );
}
