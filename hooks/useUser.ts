"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUserStore } from "@/store";

export function useUser() {
  const store = useUserStore();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        supabase
          .from("users")
          .select("*")
          .eq("supabase_id", data.user.id)
          .single()
          .then(({ data: dbUser }) => {
            if (dbUser) {
              store.setUser({
                id: dbUser.id,
                supabaseId: dbUser.supabase_id,
                email: dbUser.email,
                fullName: dbUser.full_name,
                role: dbUser.role?.toLowerCase(),
                avatar: dbUser.avatar,
                isPremium: dbUser.is_premium,
                isFounder: dbUser.is_founder,
                xp: dbUser.xp || 0,
                level: dbUser.level || 1,
                streak: dbUser.streak || 0,
                league: dbUser.league || "BRONZE",
              });
            }
          });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        supabase
          .from("users")
          .select("*")
          .eq("supabase_id", session.user.id)
          .single()
          .then(({ data: dbUser }) => {
            if (dbUser) {
              store.setUser({
                id: dbUser.id,
                supabaseId: dbUser.supabase_id,
                email: dbUser.email,
                fullName: dbUser.full_name,
                role: dbUser.role?.toLowerCase(),
                avatar: dbUser.avatar,
                isPremium: dbUser.is_premium,
                isFounder: dbUser.is_founder,
                xp: dbUser.xp || 0,
                level: dbUser.level || 1,
                streak: dbUser.streak || 0,
                league: dbUser.league || "BRONZE",
              });
            }
          });
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