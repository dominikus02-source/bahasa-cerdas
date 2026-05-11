import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, TrendingUp, Wallet, ArrowUpRight } from "lucide-react";

export default function SaldoPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Saldo</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola earnings dari penjualan karya</p>
      </div>

      <Card className="p-6 mb-6 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <p className="text-sm opacity-80">Saldo Tersedia</p>
        <p className="text-4xl font-bold mt-1">Rp 0</p>
        <p className="text-sm opacity-80 mt-2">Total Earned: Rp 0</p>
        <Button variant="secondary" className="mt-4 bg-white/20 border-0 text-white hover:bg-white/30">
          <CreditCard className="h-4 w-4" /> Cairkan Saldo
        </Button>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Tips Mendapatkan Saldo</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-medium">Jual Karya Berkualitas</p>
              <p className="text-xs text-gray-500">RPP, modul, dan soal yang dibuat dengan baik akan lebih laku</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg border">
            <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Wallet className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium">Upgrade ke PRO</p>
              <p className="text-xs text-gray-500">Akun PRO bisa设定 harga untuk karya berbayar</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}