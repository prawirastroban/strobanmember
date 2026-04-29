import * as LucideIcons from "lucide-react";
import { Wrench } from "lucide-react";

/**
 * Service icon value formats:
 *   - "Wrench"          → Lucide icon by name (legacy / default)
 *   - "lucide:Wrench"   → explicit Lucide icon
 *   - "emoji:🔧"        → emoji character
 *   - "image:https://…" → custom uploaded image URL
 */
export const parseIconValue = (raw?: string | null) => {
  const v = (raw || "").trim();
  if (!v) return { kind: "lucide" as const, value: "Wrench" };
  if (v.startsWith("lucide:")) return { kind: "lucide" as const, value: v.slice(7) };
  if (v.startsWith("emoji:")) return { kind: "emoji" as const, value: v.slice(6) };
  if (v.startsWith("image:")) return { kind: "image" as const, value: v.slice(6) };
  return { kind: "lucide" as const, value: v };
};

interface Props {
  icon?: string | null;
  className?: string;
  /** Pixel size for emoji/image rendering. Defaults to 20. */
  size?: number;
}

const ServiceIcon = ({ icon, className = "h-5 w-5", size = 20 }: Props) => {
  const parsed = parseIconValue(icon);

  if (parsed.kind === "image") {
    return (
      <img
        src={parsed.value}
        alt=""
        style={{ width: size, height: size, objectFit: "contain" }}
        className="inline-block"
      />
    );
  }

  if (parsed.kind === "emoji") {
    return (
      <span
        style={{ fontSize: size, lineHeight: 1 }}
        className="inline-flex items-center justify-center"
        aria-hidden
      >
        {parsed.value}
      </span>
    );
  }

  const Lucide =
    (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[parsed.value] || Wrench;
  return <Lucide className={className} />;
};

export default ServiceIcon;