import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, User, Bell, Shield, CreditCard, Crown } from "lucide-react";

export default function GuruPengaturanPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola akun dan preferensi</p>
      </div>

      <div className="max-w-2xl space-y-4">
        <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <User className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Profil</h3>
            <p className="text-sm text-gray-500">Nama, email, avatar</p>
          </div>
          <span className="text-gray-400">›</span>
        </Card>

        <a href="/guru/pengaturan/premium">
          <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <Crown className="h-6 w-6 text-black" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Upgrade Premium</h3>
              <p className="text-sm text-gray-500">Akses unlimited AI & fitur PRO</p>
            </div>
            <span className="text-gray-400">›</span>
          </Card>
        </a>

        <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50">
          <div className="h-12 w-12 rounded-xl bg-emerald-50 flex items-center justify-center">
            <CreditCard className="h-6 w-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Saldo</h3>
            <p className="text-sm text-gray-500">Cairkan earnings dari toko karya</p>
          </div>
          <span className="text-gray-400">›</span>
        </Card>

        <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50">
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <Bell className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Notifikasi</h3>
            <p className="text-sm text-gray-500">Pengaturan notifikasi email & push</p>
          </div>
          <span className="text-gray-400">›</span>
        </Card>

        <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50">
          <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <Shield className="h-6 w-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Keamanan</h3>
            <p className="text-sm text-gray-500">Password & two-factor auth</p>
          </div>
          <span className="text-gray-400">›</span>
        </Card>
      </div>
    </div>
  );
}