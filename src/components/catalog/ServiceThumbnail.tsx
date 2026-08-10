import { normalizeThumb, thumbImageStyle, ratioToNumber, type ThumbnailSettings } from "@/lib/serviceThumbnail";

interface Props extends ThumbnailSettings {
  alt?: string;
  className?: string;
  /** terapkan aspect-ratio dari setelan (dipakai di preview admin) */
  applyRatio?: boolean;
}

const ServiceThumbnail = ({ alt = "", className = "", applyRatio = false, ...settings }: Props) => {
  const t = normalizeThumb(settings);
  if (!t.url) return null;

  return (
    <div
      className={`relative w-full h-full overflow-hidden ${className}`}
      style={{
        backgroundColor: t.bg || undefined,
        aspectRatio: applyRatio ? String(ratioToNumber(t.ratio)) : undefined,
      }}
    >
      <img
        src={t.url}
        alt={alt}
        loading="lazy"
        className="w-full h-full"
        style={thumbImageStyle(settings)}
      />
    </div>
  );
};

export default ServiceThumbnail;
