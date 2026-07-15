// Phase 5.5 — Live Operational UX layer for the Digital SPK Canvas.
// Pure presentation state: section status, current section tracking, save
// feedback, and "resume last position". No backend, no runtime changes.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useFormRuntimeSafe } from "@/hooks/spk/FormRuntimeProvider";

export type SectionStatus = "complete" | "in_progress" | "waiting";
export type SaveStatus = "saved" | "pending";

export interface SectionMeta {
  id: string;
  label: string;
  index: number;
  role: "sa" | "mechanic" | "qc" | "system";
  /** Field codes that must all be filled for the section to be "complete". */
  requires: string[];
}

interface SPKUXValue {
  spkId: string;
  sections: SectionMeta[];
  statuses: Record<string, SectionStatus>;
  completedCount: number;
  totalCount: number;
  currentSectionId: string | null;
  resumeSectionId: string | null;
  saveStatus: SaveStatus;
  isCollapsed: (id: string) => boolean;
  toggleCollapsed: (id: string) => void;
  registerSectionRef: (id: string, el: HTMLElement | null) => void;
  jumpTo: (id: string) => void;
  dismissResume: () => void;
  ackSection: (id: string) => void;
  unackSection: (id: string) => void;
  isAcked: (id: string) => boolean;
}

const Ctx = createContext<SPKUXValue | null>(null);

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "boolean") return v === true;
  if (typeof v === "number") return !Number.isNaN(v);
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v as object).length > 0;
  return Boolean(v);
}

interface ProviderProps {
  spkId: string;
  sections: SectionMeta[];
  children: ReactNode;
}

export function SPKUXProvider({ spkId, sections, children }: ProviderProps) {
  const rt = useFormRuntimeSafe();
  const values = rt?.values ?? {};

  // ---- Ack (Lanjut) — sticky per-section completion override ----------------
  const ackKey = `spk-ack-sections:${spkId}`;
  const [ackIds, setAckIds] = useState<Set<string>>(() => {
    try {
      const raw = window.localStorage.getItem(ackKey);
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : []);
    } catch {
      return new Set();
    }
  });
  const persistAcks = useCallback(
    (next: Set<string>) => {
      try {
        window.localStorage.setItem(ackKey, JSON.stringify(Array.from(next)));
      } catch {
        /* noop */
      }
    },
    [ackKey],
  );
  const ackSection = useCallback(
    (id: string) =>
      setAckIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        persistAcks(next);
        return next;
      }),
    [persistAcks],
  );
  const unackSection = useCallback(
    (id: string) =>
      setAckIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        persistAcks(next);
        return next;
      }),
    [persistAcks],
  );
  const isAcked = useCallback((id: string) => ackIds.has(id), [ackIds]);

  // ---- Section status derivation --------------------------------------------
  const statuses = useMemo<Record<string, SectionStatus>>(() => {
    const out: Record<string, SectionStatus> = {};
    for (const s of sections) {
      if (ackIds.has(s.id)) {
        out[s.id] = "complete";
        continue;
      }
      if (s.requires.length === 0) {
        out[s.id] = "waiting";
        continue;
      }
      let filled = 0;
      for (const code of s.requires) if (isFilled(values[code])) filled += 1;
      out[s.id] =
        filled === s.requires.length
          ? "complete"
          : filled > 0
            ? "in_progress"
            : "waiting";
    }
    return out;
  }, [sections, values, ackIds]);

  const completedCount = useMemo(
    () => Object.values(statuses).filter((s) => s === "complete").length,
    [statuses],
  );

  // ---- Auto-collapse on completion ------------------------------------------
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [userOverride, setUserOverride] = useState<Record<string, boolean>>({});
  const prevStatusRef = useRef<Record<string, SectionStatus>>({});
  // Track the last pointerdown inside each section so we can skip the
  // auto-collapse+auto-scroll pass for a short grace window. Prevents the
  // "toggle looks like it didn't register" bug where a section collapses on
  // the same render as the tap that completed it.
  const lastInteractionRef = useRef<{ id: string; ts: number } | null>(null);
  const INTERACTION_GRACE_MS = 600;

  useEffect(() => {
    const prev = prevStatusRef.current;
    let changed = false;
    const nextCollapsed = { ...collapsed };
    const skipped = new Set<string>();
    const isTypingInside = (id: string): boolean => {
      const root = refs.current[id];
      const ae = typeof document !== "undefined"
        ? (document.activeElement as HTMLElement | null)
        : null;
      if (!root) return false;
      // Recent tap inside this section (button / toggle / etc.) counts as
      // "still interacting" so the just-selected control isn't hidden.
      const last = lastInteractionRef.current;
      if (last && last.id === id && Date.now() - last.ts < INTERACTION_GRACE_MS) {
        return true;
      }
      if (!ae) return false;
      if (!root.contains(ae)) return false;
      const tag = ae.tagName;
      if (tag === "TEXTAREA") return true;
      if (tag === "INPUT") {
        const type = (ae as HTMLInputElement).type;
        // Treat text-like inputs as "still typing"; toggles/buttons don't count.
        return !["checkbox", "radio", "button", "submit", "range"].includes(type);
      }
      if ((ae as HTMLElement).isContentEditable) return true;
      return false;
    };
    for (const s of sections) {
      const p = prev[s.id];
      const n = statuses[s.id];
      if (p !== "complete" && n === "complete" && !userOverride[s.id]) {
        if (isTypingInside(s.id)) {
          skipped.add(s.id);
          continue;
        }
        if (!nextCollapsed[s.id]) {
          // Delay collapse ~250ms so the "Selesai" highlight is visible
          // before the panel folds.
          window.setTimeout(() => {
            setCollapsed((c) => (c[s.id] ? c : { ...c, [s.id]: true }));
          }, 250);
        }
      }
    }
    if (changed) setCollapsed(nextCollapsed);

    // Smart auto-scroll to next incomplete section on a completion transition.
    // Global guard: if the user is actively typing anywhere (textarea or
    // text-like input), suppress the whole auto-scroll pass. Prevents the
    // Canvas from yanking the viewport while the user is still writing a
    // note in another section.
    const gae = typeof document !== "undefined"
      ? (document.activeElement as HTMLElement | null)
      : null;
    const typingAnywhere = (() => {
      if (!gae) return false;
      const tag = gae.tagName;
      if (tag === "TEXTAREA") return true;
      if (tag === "INPUT") {
        const t = (gae as HTMLInputElement).type;
        return !["checkbox", "radio", "button", "submit", "range"].includes(t);
      }
      return (gae as HTMLElement).isContentEditable === true;
    })();
    if (!typingAnywhere)
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (
        prev[s.id] !== "complete" &&
        statuses[s.id] === "complete" &&
        !skipped.has(s.id)
      ) {
        const next = sections
          .slice(i + 1)
          .find((n) => statuses[n.id] !== "complete");
        if (next) {
          const el = document.getElementById(next.id);
          if (el) {
            window.setTimeout(
              () => el.scrollIntoView({ behavior: "smooth", block: "start" }),
              260,
            );
          }
        }
        break;
      }
    }
    // For skipped sections, keep their remembered prev status so the transition
    // can re-fire on the next value change once the field loses focus.
    const remembered: Record<string, SectionStatus> = { ...statuses };
    for (const id of skipped) {
      remembered[id] = prev[id] ?? "waiting";
    }
    prevStatusRef.current = remembered;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statuses]);

  const toggleCollapsed = useCallback((id: string) => {
    setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));
    setUserOverride((prev) => ({ ...prev, [id]: true }));
  }, []);

  const isCollapsed = useCallback((id: string) => !!collapsed[id], [collapsed]);

  // ---- Current section tracking ---------------------------------------------
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(
    sections[0]?.id ?? null,
  );
  const observerRef = useRef<IntersectionObserver | null>(null);

  const registerSectionRef = useCallback((id: string, el: HTMLElement | null) => {
    const prev = refs.current[id];
    if (prev === el) return;
    if (prev && observerRef.current) observerRef.current.unobserve(prev);
    // Attach a pointerdown listener so we know when the user just tapped
    // something inside this section.
    if (prev) {
      const handler = (prev as any).__spkuxDown as EventListener | undefined;
      if (handler) prev.removeEventListener("pointerdown", handler);
    }
    refs.current[id] = el;
    if (el) {
      const handler: EventListener = () => {
        lastInteractionRef.current = { id, ts: Date.now() };
      };
      (el as any).__spkuxDown = handler;
      el.addEventListener("pointerdown", handler, { passive: true });
      if (observerRef.current) observerRef.current.observe(el);
    }
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          const id = visible[0].target.id;
          if (id) setCurrentSectionId(id);
        }
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: 0 },
    );
    observerRef.current = io;
    for (const el of Object.values(refs.current)) if (el) io.observe(el);
    return () => {
      io.disconnect();
      observerRef.current = null;
    };
  }, []);

  // ---- Persist / resume last section ----------------------------------------
  const storageKey = `spk-last-section:${spkId}`;
  useEffect(() => {
    if (!currentSectionId) return;
    try {
      window.localStorage.setItem(storageKey, currentSectionId);
    } catch {
      /* noop */
    }
  }, [currentSectionId, storageKey]);

  const [resumeSectionId, setResumeSectionId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored && stored !== sections[0]?.id) setResumeSectionId(stored);
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissResume = useCallback(() => setResumeSectionId(null), []);

  const jumpTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ---- Save feedback ---------------------------------------------------------
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const firstValuesRef = useRef(true);
  useEffect(() => {
    if (firstValuesRef.current) {
      firstValuesRef.current = false;
      return;
    }
    setSaveStatus("pending");
    const t = window.setTimeout(() => setSaveStatus("saved"), 900);
    return () => window.clearTimeout(t);
  }, [values]);

  const value: SPKUXValue = {
    spkId,
    sections,
    statuses,
    completedCount,
    totalCount: sections.length,
    currentSectionId,
    resumeSectionId,
    saveStatus,
    isCollapsed,
    toggleCollapsed,
    registerSectionRef,
    jumpTo,
    dismissResume,
    ackSection,
    unackSection,
    isAcked,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSPKUX(): SPKUXValue {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSPKUX must be used inside <SPKUXProvider>");
  return v;
}

export function useSPKUXSafe(): SPKUXValue | null {
  return useContext(Ctx);
}

export function useSectionStatus(id: string | undefined): SectionStatus | null {
  const ux = useSPKUXSafe();
  if (!ux || !id) return null;
  return ux.statuses[id] ?? null;
}
