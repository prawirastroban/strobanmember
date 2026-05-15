import { useEffect, useState, useSyncExternalStore } from "react";
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
    const state = channel.presenceState() as Record<string, unknown[]>;
    onlineSet = new Set(Object.keys(state));
  }
  notify();
};

const ensureChannel = () => {
  if (channel) return channel;
  const ch = supabase.channel(PRESENCE_CHANNEL, {
    config: { presence: { key: "" } }, // key set per-track call below
  });
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
