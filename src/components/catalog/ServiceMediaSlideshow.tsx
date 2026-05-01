import { useEffect, useRef, useState } from "react";

export type MediaItem = {
  url: string;
  type?: "image" | "video";
};

interface Props {
  media: MediaItem[];
  fallbackImage?: string | null;
  alt?: string;
  className?: string;
  intervalMs?: number;
  /** auto play slideshow */
  autoPlay?: boolean;
  rounded?: string;
}

const isVideoUrl = (url: string) =>
  /\.(mp4|webm|mov|m4v|ogv)(\?|$)/i.test(url);

const normalize = (media: MediaItem[], fallback?: string | null): MediaItem[] => {
  const list = (media || []).filter((m) => !!m?.url);
  if (list.length > 0) {
    return list.map((m) => ({
      url: m.url,
      type: m.type ?? (isVideoUrl(m.url) ? "video" : "image"),
    }));
  }
  if (fallback) return [{ url: fallback, type: "image" }];
  return [];
};

const ServiceMediaSlideshow = ({
  media,
  fallbackImage,
  alt = "",
  className = "",
  intervalMs = 3500,
  autoPlay = true,
  rounded = "rounded-2xl",
}: Props) => {
  const items = normalize(media, fallbackImage);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    setIndex(0);
  }, [items.length, items[0]?.url]);

  useEffect(() => {
    if (!autoPlay || items.length <= 1) return;
    // For videos, let the video element drive — skip auto-rotate while a video is showing
    const current = items[index];
    if (current?.type === "video") return;
    timerRef.current = window.setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
    }, intervalMs);
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [index, items, autoPlay, intervalMs]);

  if (items.length === 0) {
    return (
      <div
        className={`relative w-full h-full bg-gradient-to-br from-muted to-muted/40 ${rounded} ${className}`}
        aria-hidden
      />
    );
  }

  return (
    <div className={`relative w-full h-full overflow-hidden ${rounded} ${className}`}>
      {items.map((item, i) => {
        const active = i === index;
        return (
          <div
            key={`${item.url}-${i}`}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              active ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={!active}
          >
            {item.type === "video" ? (
              <video
                src={item.url}
                className="w-full h-full object-cover"
                muted
                playsInline
                loop={items.length === 1}
                autoPlay={active}
                onEnded={() => {
                  if (items.length > 1) setIndex((i + 1) % items.length);
                }}
              />
            ) : (
              <img
                src={item.url}
                alt={alt}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            )}
          </div>
        );
      })}

      {/* Dots */}
      {items.length > 1 && (
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1 z-10">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIndex(i);
              }}
              aria-label={`Slide ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ServiceMediaSlideshow;