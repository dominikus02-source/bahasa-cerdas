"use client";

import Link from "next/link";
import { BookOpen, Crown, DollarSign, ShieldCheck, Wallet, ShieldAlert, LineChart } from "lucide-react";

const LINKS = [
  { href: "/admin/payments", label: "Pembayaran", hint: "Transaksi Midtrans & aktivasi manual", icon: DollarSign },
  { href: "/admin/premium", label: "Premium", hint: "Laporan langganan murid & guru", icon: Crown },
  { href: "/admin/withdrawals", label: "Penarikan", hint: "Permintaan tarik saldo", icon: Wallet },
  { href: "/admin/teacher-payouts", label: "Payout Guru", hint: "Kontrol pencairan komisi", icon: ShieldCheck },
  { href: "/admin/keuangan/buku-kas", label: "Buku Kas", hint: "Catatan manual pemasukan & pengeluaran", icon: BookOpen },
];

export default function FinanceSummary() {
  return (
    <div className="min-w-0 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Ringkasan Keuangan</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Semua menu uang admin ada di halaman ini. Pilih bagian, atau buka Buku Kas untuk mencatat pemasukan dan pengeluaran secara manual.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="min-w-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 hover:border-violet-300 dark:hover:border-violet-500 transition-colors"
          >
            <div className="flex items-start gap-3 min-w-0">
              <item.icon className="w-5 h-5 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
              <div className="min-w-0">
                <p className="font-medium text-slate-900 dark:text-slate-100">{item.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 break-words">{item.hint}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 p-4 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 mb-2">Tautan terkait</p>
        <ul className="space-y-2 text-sm">
          <li>
            <Link href="/admin/executive" className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-300 min-w-0">
              <LineChart className="w-4 h-4 shrink-0" />
              <span className="break-words">Revenue Mix tetap di Control Tower</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/teacher-risk" className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-300 min-w-0">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span className="break-words">Risiko Guru (halaman tersendiri)</span>
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
