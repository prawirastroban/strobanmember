/**
 * Content Sync Bus.
 *
 * Lightweight pub/sub used to tell content hooks/components that a piece of
 * dynamic content (banner, layanan, promo, ban, pengaturan) changed in the
 * backend so they can refetch immediately — without prop drilling or extra
 * realtime channels per component.
 */
export type ContentTopic =
  | "home_banners"
  | "services"
  | "service_categories"
  | "service_icons"
  | "promos"
  | "tires"
  | "app_settings"
  | "app_branding";

export const CONTENT_TOPICS: ContentTopic[] = [
  "home_banners",
  "services",
  "service_categories",
  "service_icons",
  "promos",
  "tires",
  "app_settings",
  "app_branding",
];

type Listener = (topic: ContentTopic) => void;

const listeners = new Map<ContentTopic, Set<Listener>>();

export function onContentChange(topics: ContentTopic[], cb: Listener): () => void {
  for (const t of topics) {
    if (!listeners.has(t)) listeners.set(t, new Set());
    listeners.get(t)!.add(cb);
  }
  return () => {
    for (const t of topics) listeners.get(t)?.delete(cb);
  };
}

export function emitContentChange(topic: ContentTopic) {
  const set = listeners.get(topic);
  if (!set) return;
  for (const cb of Array.from(set)) {
    try {
      cb(topic);
    } catch {
      /* a broken listener must never block the others */
    }
  }
}

export function emitAllContentChanged() {
  for (const t of CONTENT_TOPICS) emitContentChange(t);
}