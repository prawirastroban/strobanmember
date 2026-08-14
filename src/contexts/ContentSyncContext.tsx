import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CONTENT_TOPICS,
  ContentTopic,
  emitAllContentChanged,
  emitContentChange,
} from "@/lib/contentSyncBus";

/** Tables that carry publicly visible, staff-editable content. */
const SYNCED_TABLES: ContentTopic[] = CONTENT_TOPICS;

const DEBOUNCE_MS = 800;
const TOAST_COOLDOWN_MS = 20000;

/**
 * Opens ONE realtime channel for every content table and broadcasts the
 * changes through the content sync bus. Bulk edits from the dashboard are
 * coalesced so listeners refetch once instead of per row.
 */
const ContentSyncProvider = ({ children }: { children: React.ReactNode }) => {
  const pending = useRef<Set<ContentTopic>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastToast = useRef(0);

  useEffect(() => {
    const flush = () => {
      timer.current = null;
      const topics = Array.from(pending.current);
      pending.current.clear();
      if (topics.length === 0) return;

      for (const t of topics) emitContentChange(t);

      const now = Date.now();
      if (document.visibilityState === "visible" && now - lastToast.current > TOAST_COOLDOWN_MS) {
        lastToast.current = now;
        toast("Konten diperbarui", {
          description: "Informasi terbaru sudah dimuat otomatis.",
          duration: 2600,
        });
      }
    };

    const queue = (topic: ContentTopic) => {
      pending.current.add(topic);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    };

    let channel = supabase.channel("content-sync");
    for (const table of SYNCED_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => queue(table),
      );
    }
    channel.subscribe();

    // Android/iOS: the webview is frozen in background — refresh on resume.
    const onResume = () => {
      if (document.visibilityState === "visible") emitAllContentChanged();
    };
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("online", onResume);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("online", onResume);
      supabase.removeChannel(channel);
    };
  }, []);

  return <>{children}</>;
};

export default ContentSyncProvider;