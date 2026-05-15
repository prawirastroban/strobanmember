import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useAuth } from "@/contexts/AuthContext";

const PRESENCE_CHANNEL = "online-users";

// ---- Singleton channel + observable online set ----
let channel: RealtimeChannel | null = null;
let trackedUserId: string | null = null;
let onlineSet: Set<string> = new Set();
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((l) => l());

const recomputeFromChannel = () => {
  if (!channel) {
    onlineSet = new Set();
  } else {
    const state = channel.presenceState() as Record<string, Array<{ user_id?: string }>>;
    const next = new Set<string>();
    Object.values(state).forEach((entries) => {
      entries.forEach((e) => {
        if (e?.user_id) next.add(e.user_id);
      });
    });
    onlineSet = next;
  }
  notify();
};

const ensureChannel = () => {
  if (channel) return channel;
  // No fixed presence key — each subscriber gets a unique presence_ref;
  // we identify users via the tracked payload (user_id field).
  const ch = supabase.channel(PRESENCE_CHANNEL);
  ch.on("presence", { event: "sync" }, recomputeFromChannel)
    .on("presence", { event: "join" }, recomputeFromChannel)
    .on("presence", { event: "leave" }, recomputeFromChannel)
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        if (trackedUserId) {
          await ch.track({ user_id: trackedUserId, online_at: new Date().toISOString() });
        }
        recomputeFromChannel();
      }
    });
  channel = ch;
  return ch;
};

const setTrackedUser = async (userId: string | null) => {
  // Always make sure the shared channel exists (so observers can read state).
  const ch = ensureChannel();
  if (trackedUserId === userId) return;

  // Untrack previous user
  if (trackedUserId && ch) {
    try { await ch.untrack(); } catch {}
  }
  trackedUserId = userId;

  // Track new user (channel may still be subscribing — track callback in subscribe handles initial)
  if (userId) {
    try {
      await ch.track({ user_id: userId, online_at: new Date().toISOString() });
    } catch {
      // If not yet SUBSCRIBED, the subscribe callback will retrack.
    }
  }
};

// ---- Public hooks ----

/**
 * Tracks the current logged-in user's presence in the shared channel.
 * Mount once at app root (inside AuthProvider).
 */
export const usePresenceTracker = () => {
  const { user } = useAuth();

  useEffect(() => {
    setTrackedUser(user?.id ?? null);
    // No teardown on unmount — singleton lives for app lifetime.
    // Sign-out flips user.id to null and we untrack.
  }, [user?.id]);
};

/** Returns a Set of user IDs currently online (presence-based, realtime). */
export const useOnlineUsers = (): Set<string> => {
  // Make sure the shared channel exists even if no tracker has mounted yet
  useEffect(() => {
    ensureChannel();
  }, []);

  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  };
  return useSyncExternalStore(subscribe, () => onlineSet, () => onlineSet);
};
