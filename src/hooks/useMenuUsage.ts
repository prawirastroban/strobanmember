import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  findMenuByUrl,
  passesRole,
  type MenuItem,
  type RoleFlags,
} from "@/config/dashboardMenu";

// ── Storage ────────────────────────────────────────────────────────────────

type UsageMap = Record<string, { count: number; lastUsed: number }>;

const BASE_KEY = "dashboard:menuUsage:v1";
const DECAY_AFTER_MS = 60 * 24 * 60 * 60 * 1000; // 60 days

// In-memory fallback when localStorage is unavailable.
const memoryStore: Record<string, UsageMap> = {};

const storageKey = (userId?: string | null) =>
  `${BASE_KEY}:${userId || "anon"}`;

const safeRead = (key: string): UsageMap => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return memoryStore[key] || {};
    return JSON.parse(raw) as UsageMap;
  } catch {
    return memoryStore[key] || {};
  }
};

const safeWrite = (key: string, data: UsageMap) => {
  memoryStore[key] = data;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch {
    /* quota / disabled — keep in-memory copy */
  }
};

// Module-scope current user id; updated by the hook.
let currentUserId: string | null = null;

/**
 * Increment usage for a menu url. Safe to call from anywhere (sidebar,
 * tiles, attention buttons). Silently no-ops on SSR / storage failure.
 */
export function trackMenuClick(url: string) {
  if (!url) return;
  const key = storageKey(currentUserId);
  const data = safeRead(key);
  const now = Date.now();
  const prev = data[url];
  let count = (prev?.count || 0) + 1;
  // Lightweight decay: if the entry has been idle a long time, halve it
  // before incrementing so very-old habits don't dominate forever.
  if (prev && now - prev.lastUsed > DECAY_AFTER_MS) {
    count = Math.floor((prev.count || 0) / 2) + 1;
  }
  data[url] = { count, lastUsed: now };
  safeWrite(key, data);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dashboard:menuUsage"));
  }
}

// ── Hook ───────────────────────────────────────────────────────────────────

const DEFAULT_SEED: string[] = [
  "/dashboard/bookings",
  "/dashboard/customers",
  "/dashboard/crm",
  "/dashboard/reports",
  "/dashboard/keuangan",
];

export function useTopMenus(limit: number, flags: RoleFlags): MenuItem[] {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  currentUserId = userId;

  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const bump = () => setTick(t => t + 1);
    window.addEventListener("storage", bump);
    window.addEventListener("dashboard:menuUsage", bump as EventListener);
    return () => {
      window.removeEventListener("storage", bump);
      window.removeEventListener("dashboard:menuUsage", bump as EventListener);
    };
  }, []);

  // Re-read on every render (cheap — localStorage + small object).
  void tick;
  const usage = safeRead(storageKey(userId));

  const sortedUrls = Object.entries(usage)
    .sort((a, b) => b[1].count - a[1].count || b[1].lastUsed - a[1].lastUsed)
    .map(([url]) => url);

  const ordered: MenuItem[] = [];
  const seen = new Set<string>();

  const pushIfValid = (url: string) => {
    if (seen.has(url)) return;
    const item = findMenuByUrl(url);
    if (!item) return;
    if (!passesRole(item.requiredRole, flags)) return;
    if (item.hideInOverview) return;
    seen.add(url);
    ordered.push(item);
  };

  for (const url of sortedUrls) {
    if (ordered.length >= limit) break;
    pushIfValid(url);
  }
  for (const url of DEFAULT_SEED) {
    if (ordered.length >= limit) break;
    pushIfValid(url);
  }

  return ordered;
}

/** Exposed for callers that prefer a memoized handler. */
export function useTrackMenuClick() {
  return useCallback((url: string) => trackMenuClick(url), []);
}