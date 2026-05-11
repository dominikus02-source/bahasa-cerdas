import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from "lucide-react";

export default function MuridPengaturanPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
        <p className="mt-1 text-sm text-gray-600">Kelola akun dan preferensi</p>
      </div>

      <div className="max-w-2xl space-y-4">
        <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50">
          <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center">
            <Settings className="h-6 w-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Profil</h3>
            <p className="text-sm text-gray-500">Nama, avatar, sekolah</p>
          </div>
          <span className="text-gray-400">›</span>
        </Card>

        <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50">
          <div className="h-12 w-12 rounded-xl bg-purple-50 flex items-center justify-center">
            <Settings className="h-6 w-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Notifikasi</h3>
            <p className="text-sm text-gray-500">Pengaturan notifikasi push</p>
          </div>
          <span className="text-gray-400">›</span>
        </Card>

        <Card className="p-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50">
          <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center">
            <LogOut className="h-6 w-6 text-gray-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">Keluar</h3>
            <p className="text-sm text-gray-500">Log out dari akun</p>
          </div>
          <span className="text-gray-400">›</span>
        </Card>
      </div>

      <div className="mt-8 max-w-2xl">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <h3 className="font-semibold text-blue-700">💡 Untuk Guru</h3>
          <p className="text-sm text-gray-600 mt-1">Ingin membuat kuis dan RPP? Daftarkan akun sebagai Guru!</p>
          <Button className="mt-3" size="sm">Daftar sebagai Guru</Button>
        </Card>
      </div>
    </div>
  );
}