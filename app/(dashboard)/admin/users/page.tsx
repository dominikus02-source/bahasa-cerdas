"use client";

import { useState, useEffect } from "react";
import { Mail, Shield, Crown, Search, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/users")
      .then(r => r.ok ? r.json() : [])
      .then(d => setUsers(d.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pengguna</h1>
        <p className="text-sm text-gray-500 mt-1">Daftar semua pengguna BahasaCerdas</p>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Memuat...</div> : users.length === 0 ? (
        <div className="text-center py-16">
          <Users size={48} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500">Belum ada pengguna</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-3 font-medium">Nama</th>
                <th className="pb-3 font-medium">Email</th>
                <th className="pb-3 font-medium">Role</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">XP</th>
                <th className="pb-3 font-medium">Bergabung</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xs font-bold">
                      {(u.fullName || "?").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium">{u.fullName}</span>
                    {u.isFounder && <Crown size={14} className="text-amber-500" />}
                  </td>
                  <td className="py-3 text-gray-500">{u.email}</td>
                  <td className="py-3">
                    <Badge variant={u.role === "GURU" ? "success" : "secondary"} className="text-[10px]">{u.role}</Badge>
                  </td>
                  <td className="py-3">
                    {u.isFounder ? <span className="text-amber-600 font-medium text-xs">Founder</span> :
                     u.isPremium ? <span className="text-blue-600 font-medium text-xs">Premium</span> :
                     <span className="text-gray-400 text-xs">Free</span>}
                  </td>
                  <td className="py-3 text-gray-500">{u.xp}</td>
                  <td className="py-3 text-gray-500 text-xs">{new Date(u.createdAt).toLocaleDateString("id")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
