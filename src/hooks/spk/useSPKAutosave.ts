// Real autosave for the Digital SPK Canvas. Persists runtime.values into
// spk_orders.data as a shallow merge, debounced. Only runs for staff-side
// roles that are allowed to edit the SPK (never for the customer viewer).
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { SpkActor } from "@/services/spk/types";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

const EDITOR_ROLES: SpkActor[] = [
  "reception",
  "mechanic",
  "qc",
  "cashier",
  "owner",
  "admin",
  "admin_cabang",
];

// Keys owned by other flows (customer-side approval, workflow signals) that
// must NEVER be overwritten by the Canvas autosave — otherwise a stale local
// snapshot could clobber the customer's signature or revision note.
const PROTECTED_KEYS = new Set([
  "customer_approved",
  "customer_approved_at",
  "customer_approval_source",
  "signature_customer",
  "signature_customer_source",
  "signature_customer_signed_at",
  "customer_revision_note",
  "customer_revision_requested_at",
  "customer_revision_resolved_at",
]);

export function useSPKAutosave(params: {
  spkId: string | null;
  role: SpkActor;
  values: Record<string, unknown>;
  /** When false, autosave stays completely inert (no baseline capture, no
   *  debounced flush, no pagehide flush). Used to gate the hook until the
   *  runtime has finished hydrating from the DB — otherwise empty
   *  `useBinding` defaults could be persisted over real fields. */
  enabled?: boolean;
  onSaved?: (nextData: Record<string, unknown>) => void;
}) {
  const { spkId, role, values, onSaved, enabled = true } = params;
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const lastSerializedRef = useRef<string>("");
  const firstRunRef = useRef(true);
  const timerRef = useRef<number | null>(null);
  const pendingRef = useRef<Record<string, unknown> | null>(null);

  const canEdit = !!spkId && EDITOR_ROLES.includes(role) && enabled;

  // When the gate flips from disabled → enabled, force the next effect run
  // to re-seed the baseline from the hydrated values instead of comparing
  // against a stale (pre-hydration) snapshot.
  useEffect(() => {
    if (!enabled) {
      firstRunRef.current = true;
      lastSerializedRef.current = "";
      pendingRef.current = null;
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setStatus("idle");
    }
  }, [enabled]);

  // Treat these as "empty defaults" that useBinding may seed before the user
  // has actually touched the field. We never let such values overwrite a
  // non-empty value already present in the DB.
  const isEmptyDefault = (v: unknown): boolean => {
    if (v === undefined || v === null) return true;
    if (typeof v === "string") return v.length === 0;
    if (typeof v === "boolean") return v === false;
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === "object") return Object.keys(v as Record<string, unknown>).length === 0;
    return false;
  };
  const isNonEmpty = (v: unknown): boolean => !isEmptyDefault(v);

  // Flush helper — persists whatever is currently pending immediately.
  const flushRef = useRef<() => Promise<void>>(async () => {});
  flushRef.current = async () => {
    if (!canEdit || !spkId || !pendingRef.current) return;
    const filtered = pendingRef.current;
    pendingRef.current = null;
    if (timerRef.current) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    setStatus("saving");
    try {
      const { data: current } = await supabase
        .from("spk_orders").select("data").eq("id", spkId).maybeSingle();
      const currentData = (current?.data as Record<string, unknown>) ?? {};
      // Non-destructive merge: an empty default from the runtime must NEVER
      // overwrite a non-empty value that already exists in the DB. This
      // protects against a stale local snapshot or a re-mounted component
      // whose useBinding seeded "" / false before the user touched the
      // field.
      const safeFiltered: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(filtered)) {
        if (isEmptyDefault(v) && isNonEmpty(currentData[k])) continue;
        safeFiltered[k] = v;
      }
      const merged = { ...currentData, ...safeFiltered };
      const { error } = await supabase.from("spk_orders").update({ data: merged as any }).eq("id", spkId);
      if (error) throw error;
      setStatus("saved");
      onSaved?.(merged);
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    if (!canEdit) return;
    // Filter out protected keys before comparing/persisting.
    const filtered: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(values)) {
      if (!PROTECTED_KEYS.has(k)) filtered[k] = v;
    }
    const serialized = JSON.stringify(filtered);

    if (firstRunRef.current) {
      firstRunRef.current = false;
      lastSerializedRef.current = serialized;
      return;
    }
    if (serialized === lastSerializedRef.current) return;
    lastSerializedRef.current = serialized;
    pendingRef.current = filtered;
    setStatus("pending");

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => { void flushRef.current(); }, 500);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [values, canEdit, spkId, role, onSaved]);

  // Flush before the page is hidden / unloaded so mobile back-swipes never
  // drop unsaved changes.
  useEffect(() => {
    if (!canEdit) return;
    const flush = () => { void flushRef.current(); };
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [canEdit, spkId]);

  return { status, enabled: canEdit };
}