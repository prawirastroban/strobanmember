const KEY = "stroban_intended_route";

function isSafePath(p: string): boolean {
  return !!p && p.startsWith("/") && !p.startsWith("//") && !p.startsWith("/auth");
}

export function saveIntendedRoute(path?: string | null): void {
  try {
    const target =
      path && isSafePath(path)
        ? path
        : (() => {
            const here = window.location.pathname + window.location.search + window.location.hash;
            return isSafePath(here) ? here : "/";
          })();
    sessionStorage.setItem(KEY, target);
  } catch {
    /* ignore */
  }
}

export function popIntendedRoute(): string {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    if (v && isSafePath(v)) return v;
  } catch {
    /* ignore */
  }
  try {
    const last = sessionStorage.getItem("lastVisitedPath");
    if (last && isSafePath(last)) return last;
  } catch {
    /* ignore */
  }
  return "/";
}