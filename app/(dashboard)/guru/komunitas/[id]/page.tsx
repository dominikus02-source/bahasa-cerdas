"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { use } from "react";
import { ChevronLeft, Users, MapPin, Send, CheckCircle, Calendar, UserPlus, Crown, LogOut } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Community {
  id: string;
  name: string;
  description: string | null;
  type: string;
  region: string | null;
  province: string | null;
  city: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  isVerified: boolean;
  memberCount: number;
  postCount: number;
  creator: { fullName: string; avatar: string | null } | null;
}

interface Post {
  id: string;
  title: string | null;
  content: string;
  fileUrl: string | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  user: { fullName: string; avatar: string | null };
}

export default function CommunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [ketua, setKetua] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [isMember, setIsMember] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [res, meRes] = await Promise.all([
          fetch(`/api/komunitas/${resolvedParams.id}`),
          fetch("/api/user/me"),
        ]);
        const data = await res.json();
        const me = await meRes.json();
        if (data.community) {
          setCommunity(data.community);
          setPosts(data.posts || []);
          setMembers(data.members || []);
          setKetua(data.ketua || null);
        }
        if (me.user) {
          setCurrentUserId(me.user.id);
          setJoined(!!data.isMember);
          setIsMember(!!data.isMember);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [resolvedParams.id]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await fetch(`/api/komunitas/${resolvedParams.id}/join`, { method: "POST" });
      const data = await res.json();
      if (data.joined !== undefined) {
        setJoined(data.joined);
        setIsMember(data.joined);
        // Refetch community to get updated member count
        const refetch = await fetch(`/api/komunitas/${resolvedParams.id}`);
        const refetched = await refetch.json();
        if (refetched.community) {
          setCommunity(refetched.community);
          setMembers(refetched.members || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setJoining(false);
    }
  };

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const res = await fetch(`/api/komunitas/${resolvedParams.id}/claim`, { method: "POST" });
      const data = await res.json();
      if (data.claimed) {
        const refetch = await fetch(`/api/komunitas/${resolvedParams.id}`);
        const refetched = await refetch.json();
        if (refetched.community) {
          setMembers(refetched.members || []);
          setKetua(refetched.ketua || null);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch(`/api/komunitas/${resolvedParams.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPost }),
      });
      const data = await res.json();
      if (data.post) {
        setPosts([data.post, ...posts]);
        setNewPost("");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPosting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-bold text-xl">Komunitas tidak ditemukan</h2>
          <Link href="/guru/komunitas" className="mt-4 text-emerald-600 hover:underline">
            Kembali
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        {community.bannerUrl && (
          <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${community.bannerUrl})` }} />
        )}
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/guru/komunitas" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-4 text-sm">
            <ChevronLeft className="w-4 h-4" />
            Kembali ke Komunitas
          </Link>
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-2xl">
              {community.avatarUrl ? (
                <img src={community.avatarUrl} alt={community.name} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                community.name.charAt(0)
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold">{community.name}</h1>
                {community.isVerified && <CheckCircle className="w-5 h-5" />}
              </div>
              {community.description && <p className="text-white/80 text-sm mt-1">{community.description}</p>}
              {community.province && (
                <div className="flex items-center gap-1 text-white/70 text-xs mt-2">
                  <MapPin className="w-3 h-3" />
                  {community.city ? `${community.city}, ${community.province}` : community.province}
                </div>
              )}
            </div>
            <Button
              onClick={handleJoin}
              disabled={joining}
              className={`shrink-0 ${joined ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200" : "bg-emerald-800 hover:bg-emerald-900"}`}
            >
              {joined ? <LogOut className="w-4 h-4 mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              {joining ? "Memproses..." : joined ? "Keluar" : "Gabung"}
            </Button>
          </div>
          <div className="flex items-center gap-4 mt-4 text-sm text-white/80">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {community.memberCount} anggota
            </span>
            <span>{community.postCount} postingan</span>
          </div>
          {ketua ? (
            <div className="flex items-center gap-3 mt-4 bg-white/10 rounded-xl px-4 py-2.5">
              <Crown className="w-5 h-5 text-amber-300" />
              <span className="text-sm text-white/90">
                <strong className="text-white">{ketua.user.fullName}</strong> — Ketua
              </span>
              {currentUserId === ketua.userId && (
                <span className="text-xs bg-amber-400/20 text-amber-200 px-2 py-0.5 rounded-full ml-auto">Anda</span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-4">
              {currentUserId && (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="flex items-center gap-2 text-xs bg-white/15 hover:bg-white/25 text-white px-4 py-2 rounded-xl transition-colors disabled:opacity-50"
                >
                  <Crown className="w-4 h-4" />
                  {claiming ? "Mengklaim..." : "Klaim sebagai Ketua"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 border-0 shadow-lg rounded-2xl">
            <form onSubmit={handlePost}>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                placeholder="Bagikan sesuatu ke komunitas..."
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={posting || !newPost.trim()}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {posting ? "Mengirim..." : "Posting"}
                </button>
              </div>
            </form>
          </Card>

          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <p className="text-slate-500 text-sm">Belum ada postingan. Jadilah yang pertama!</p>
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="p-5 border-0 shadow-sm rounded-2xl">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                    {post.user.avatar ? (
                      <img src={post.user.avatar} alt={post.user.fullName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      post.user.fullName.charAt(0)
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-900">{post.user.fullName}</p>
                    <p className="text-xs text-slate-400">{new Date(post.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                </div>
                {post.title && <h4 className="font-bold text-slate-900 mb-2">{post.title}</h4>}
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{post.content}</p>
              </Card>
            ))
          )}
        </div>

        <div className="space-y-4">
          <Card className="p-5 border-0 shadow-sm rounded-2xl">
            <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              Anggota ({community.memberCount})
            </h3>
            <div className="space-y-3">
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 text-xs font-bold">
                    {m.user.avatar ? (
                      <img src={m.user.avatar} alt={m.user.fullName} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      m.user.fullName.charAt(0)
                    )}
                  </div>
                  <span className="text-sm text-slate-700">{m.user.fullName}</span>
                  {m.role === "ketua" && (
                    <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                      <Crown className="w-3 h-3" /> Ketua
                    </span>
                  )}
                  {m.role === "admin" && (
                    <span className="ml-auto text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Admin</span>
                  )}
                </div>
              ))}
              {members.length === 0 && (
                <p className="text-xs text-slate-400">Belum ada anggota</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}