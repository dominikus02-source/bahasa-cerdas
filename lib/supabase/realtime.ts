import { createClient } from "./client";

type NotifCallback = (notification: {
  id: string;
  title: string;
  body: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}) => void;

let channelSeq = 0;

export function subscribeNotifications(userId: string, onNew: NotifCallback) {
  const supabase = createClient();

  // The channel name must be unique per subscription. It used to be the fixed
  // string "notifikasi_realtime", and the bell renders twice on student pages —
  // once in the desktop sidebar, once in the mobile top bar. The second mount
  // got handed the same already-subscribed channel and threw
  //   cannot add `postgres_changes` callbacks for realtime:notifikasi_realtime
  //   after `subscribe()`
  // which killed live notifications for that mount.
  const channel = supabase
    .channel(`notifikasi_realtime:${userId}:${++channelSeq}`)
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
