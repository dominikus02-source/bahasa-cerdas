"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, Bell, Trash2, CheckCheck, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  data: any;
  createdAt: string;
}

export default function NotifikasiPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const url = filter === "unread" ? "/api/notifikasi?unread=true" : "/api/notifikasi";
      const res = await fetch(url);
      const data = await res.json();
      if (data.notifications) setNotifications(data.notifications);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const handleMarkAllRead = async () => {
    await fetch("/api/notifikasi", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    fetchNotifications();
  };

  const handleDeleteAll = async () => {
    await fetch("/api/notifikasi?all=true", { method: "DELETE" });
    setNotifications([]);
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/notifikasi?id=${id}`, { method: "DELETE" });
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "success": return "bg-green-100 text-green-600 border-green-200";
      case "warning": return "bg-amber-100 text-amber-600 border-amber-200";
      case "error": return "bg-red-100 text-red-600 border-red-200";
      default: return "bg-blue-100 text-blue-600 border-blue-200";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "success": return "✓";
      case "warning": return "⚠";
      case "error": return "✕";
      default: return "ℹ";
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/guru/beranda" className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-7 h-7 text-emerald-600" />
            Notifikasi
          </h1>
          <p className="text-sm text-slate-500">Pemberitahuan dan update dari BahasaCerdas</p>
        </div>
        {notifications.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1" /> Tandai Dibaca
            </Button>
            <Button size="sm" variant="outline" onClick={handleDeleteAll} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="w-4 h-4 mr-1" /> Hapus Semua
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === "all" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Semua
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${filter === "unread" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          Belum Dibaca
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Memuat notifikasi...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="font-bold text-slate-600 mb-2">Tidak ada notifikasi</h3>
          <p className="text-sm text-slate-400">Anda akan mendapat notifikasi saat ada update penting</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card key={n.id} className={`p-4 border transition-all ${!n.isRead ? "border-blue-200 bg-blue-50/30" : "border-slate-100"}`}>
              <div className="flex items-start gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 border ${getTypeColor(n.type)}`}>
                  {getTypeIcon(n.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm">{n.title}</h3>
                    {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{n.body}</p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(n.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-500" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
