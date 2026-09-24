"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store";

export function useUser() {
  const store = useUserStore();

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let lastFetchAt = 0;

    const syncApplicationUser = async () => {
      // Auth state is already known by the browser Supabase client. Do not call
      // auth.getUser() here: that is a network request and can compete with
      // the browser's token refresh loop.
      const now = Date.now();
      if (now - lastFetchAt < 1500) return;
      lastFetchAt = now;

      try {
        const res = await fetch("/api/user/me", {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || disposed) return;

        const { user: dbUser } = await res.json();
        if (dbUser && !disposed) {
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
      } catch {
        // Keep the existing client state during transient network failures.
      }
    };

    // INITIAL_SESSION is emitted by the singleton browser client during
    // startup, so it replaces the old getUser() bootstrap call without adding
    // a second auth network request.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        if (
          event === "INITIAL_SESSION" ||
          event === "SIGNED_IN" ||
          event === "USER_UPDATED"
        ) {
          void syncApplicationUser();
        }
      } else if (event === "SIGNED_OUT") {
        store.clearUser();
      }
    });

    return () => {
      disposed = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  return store;
}
