"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store";

export function useUser() {
  const store = useUserStore();

  useEffect(() => {
    async function fetchUser() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      try {
        const res = await fetch("/api/user/me");
        if (!res.ok) return;
        const { user: dbUser } = await res.json();
        if (dbUser) {
          store.setUser({
            id: dbUser.id,
            supabaseId: dbUser.supabaseId,
            email: dbUser.email,
            fullName: dbUser.fullName,
            role: dbUser.role?.toLowerCase(),
            avatar: dbUser.avatar,
            isPremium: dbUser.isPremium,
            isFounder: dbUser.isFounder,
            xp: dbUser.xp || 0,
            level: dbUser.level || 1,
            streak: dbUser.streak || 0,
            league: dbUser.league || "BRONZE",
          });
        }
      } catch {}
    }

    fetchUser();

    const supabase = createClient();
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        try {
          const res = await fetch("/api/user/me");
          if (!res.ok) return;
          const { user: dbUser } = await res.json();
          if (dbUser) {
            store.setUser({
              id: dbUser.id,
              supabaseId: dbUser.supabaseId,
              email: dbUser.email,
              fullName: dbUser.fullName,
              role: dbUser.role?.toLowerCase(),
              avatar: dbUser.avatar,
              isPremium: dbUser.isPremium,
              isFounder: dbUser.isFounder,
              xp: dbUser.xp || 0,
              level: dbUser.level || 1,
              streak: dbUser.streak || 0,
              league: dbUser.league || "BRONZE",
            });
          }
        } catch {}
      } else {
        store.clearUser();
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  return store;
}