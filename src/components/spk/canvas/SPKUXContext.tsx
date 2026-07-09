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

  // ---- Section status derivation --------------------------------------------
  const statuses = useMemo<Record<string, SectionStatus>>(() => {
    const out: Record<string, SectionStatus> = {};
    for (const s of sections) {
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
  }, [sections, values]);

  const completedCount = useMemo(
    () => Object.values(statuses).filter((s) => s === "complete").length,
    [statuses],
  );

  // ---- Auto-collapse on completion ------------------------------------------
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [userOverride, setUserOverride] = useState<Record<string, boolean>>({});
  const prevStatusRef = useRef<Record<string, SectionStatus>>({});

  useEffect(() => {
    const prev = prevStatusRef.current;
    let changed = false;
    const nextCollapsed = { ...collapsed };
    for (const s of sections) {
      const p = prev[s.id];
      const n = statuses[s.id];
      if (p !== "complete" && n === "complete" && !userOverride[s.id]) {
        if (!nextCollapsed[s.id]) {
          nextCollapsed[s.id] = true;
          changed = true;
        }
      }
    }
    if (changed) setCollapsed(nextCollapsed);

    // Smart auto-scroll to next incomplete section on a completion transition.
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (prev[s.id] !== "complete" && statuses[s.id] === "complete") {
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
    prevStatusRef.current = statuses;
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
    refs.current[id] = el;
    if (el && observerRef.current) observerRef.current.observe(el);
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
