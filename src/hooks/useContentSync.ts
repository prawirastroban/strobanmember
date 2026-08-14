import { useEffect, useRef } from "react";
import { ContentTopic, onContentChange } from "@/lib/contentSyncBus";

/**
 * Re-runs `handler` whenever one of the given content topics changes in the
 * backend (broadcast by ContentSyncProvider) — used to keep the installed
 * Android/PWA app in sync with dashboard edits without a restart.
 */
export function useContentSync(topics: ContentTopic[], handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;

  const key = topics.join(",");
  useEffect(() => {
    const list = key.split(",").filter(Boolean) as ContentTopic[];
    if (list.length === 0) return;
    return onContentChange(list, () => ref.current());
  }, [key]);
}