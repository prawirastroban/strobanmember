// Recommended next-service interval (in days) per service category/keywords.
// Lightweight, client-side mapping — easy to extend later via DB if needed.

const RULES: { match: RegExp; days: number; label: string }[] = [
  { match: /oli|oil|engine oil|ganti oli/i, days: 90, label: "ganti oli berkala" },
  { match: /tune.?up|servis besar|major service/i, days: 180, label: "tune-up berkala" },
  { match: /rotasi|rotation|spooring|balancing/i, days: 180, label: "rotasi & balancing ban" },
  { match: /rem|brake|kampas/i, days: 180, label: "pemeriksaan rem" },
  { match: /aki|battery/i, days: 365, label: "pemeriksaan aki" },
  { match: /ac|air ?cond/i, days: 365, label: "servis AC" },
  { match: /ban|tire|tyre/i, days: 365, label: "pemeriksaan ban" },
];

const DEFAULT_DAYS = 90;
const DEFAULT_LABEL = "servis berkala";

export interface NextServiceRecommendation {
  days: number;
  label: string;
  date: string; // YYYY-MM-DD
  monthsApprox: number;
}

export const recommendNextService = (
  serviceName: string,
  fromDateISO: string,
): NextServiceRecommendation => {
  const rule = RULES.find((r) => r.match.test(serviceName));
  const days = rule?.days ?? DEFAULT_DAYS;
  const label = rule?.label ?? DEFAULT_LABEL;
  const base = new Date(fromDateISO);
  base.setDate(base.getDate() + days);
  const date = base.toISOString().split("T")[0];
  return { days, label, date, monthsApprox: Math.round(days / 30) };
};
