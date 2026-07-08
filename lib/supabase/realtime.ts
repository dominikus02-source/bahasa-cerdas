import { createClient } from "./client";

type NotifCallback = (notification: {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}) => void;

export function subscribeNotifications(userId: string, onNew: NotifCallback) {
  const supabase = createClient();

  const channel = supabase
    .channel("notifikasi_realtime")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Notifikasi",
        filter: `userId=eq.${userId}`,
      },
      (payload) => {
        const record = payload.new as Record<string, unknown>;
        onNew({
          id: record.id as string,
          title: record.title as string,
          body: record.body as string,
          type: record.type as string,
          isRead: record.isRead as boolean,
          createdAt: record.created_at as string || record.createdAt as string,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
