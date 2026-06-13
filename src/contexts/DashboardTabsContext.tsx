import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface DashboardTab {
  path: string;
  title: string;
}

interface Ctx {
  tabs: DashboardTab[];
  activePath: string;
  openTab: (tab: DashboardTab) => void;
  closeTab: (path: string) => void;
}

const DashboardTabsContext = createContext<Ctx | null>(null);
const STORAGE_KEY = "stroban.dashboard.tabs";

export const DashboardTabsProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [tabs, setTabs] = useState<DashboardTab[]>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as DashboardTab[];
    } catch {}
    return [{ path: "/dashboard", title: "Dashboard" }];
  });

  useEffect(() => {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(tabs)); } catch {}
  }, [tabs]);

  const openTab = useCallback((tab: DashboardTab) => {
    setTabs((prev) => {
      // Already open by exact path — do nothing
      if (prev.some((t) => t.path === tab.path)) return prev;
      // A tab with the same title exists (e.g. different sub-route, same page)
      // — reuse it by updating its path instead of appending a new chip.
      const sameTitleIdx = prev.findIndex((t) => t.title === tab.title);
      if (sameTitleIdx !== -1) {
        const next = [...prev];
        next[sameTitleIdx] = { ...next[sameTitleIdx], path: tab.path };
        return next;
      }
      return [...prev, tab];
    });
  }, []);

  const closeTab = useCallback((path: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev;
      const idx = prev.findIndex((t) => t.path === path);
      if (idx === -1) return prev;
      const next = prev.filter((t) => t.path !== path);
      if (pathname === path) {
        const fallback = next[Math.max(0, idx - 1)] || next[0];
        if (fallback) navigate(fallback.path);
      }
      return next;
    });
  }, [pathname, navigate]);

  const value = useMemo<Ctx>(() => ({
    tabs,
    activePath: pathname,
    openTab,
    closeTab,
  }), [tabs, pathname, openTab, closeTab]);

  return (
    <DashboardTabsContext.Provider value={value}>
      {children}
    </DashboardTabsContext.Provider>
  );
};

export function useDashboardTabs() {
  const ctx = useContext(DashboardTabsContext);
  if (!ctx) {
    return {
      tabs: [] as DashboardTab[],
      activePath: "",
      openTab: () => {},
      closeTab: () => {},
    } satisfies Ctx;
  }
  return ctx;
}