export type SpkType = "service" | "ban";

export const SPK_TYPE_LABEL: Record<SpkType, string> = {
  service: "Service",
  ban: "Ban",
};

export function parseSpkType(v: unknown): SpkType {
  return v === "ban" ? "ban" : "service";
}
