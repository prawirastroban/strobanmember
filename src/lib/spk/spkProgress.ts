// Menghitung progres pengisian SPK dari `spk.data` dengan memakai
// `buildSpkDisplay` sebagai sumber kanonis daftar item pemeriksaan.
// Item dianggap "terisi" bila status ∈ {ok, warn, not, na}.
import { buildSpkDisplay } from "./spkDisplayMap";

export interface SpkFillProgress {
  total: number;
  filled: number;
  percent: number; // 0..100
}

export function computeSpkFillProgress(data: unknown): SpkFillProgress {
  const d = buildSpkDisplay((data ?? {}) as Record<string, any>);
  const groups = [d.engine, d.lamps, d.electrical, d.ac, d.suspension];
  const items = groups.flatMap((g) => g.items).concat(d.tyre.checks);
  const total = items.length;
  const filled = items.filter((it) => it.status !== "empty").length;
  const percent = total === 0 ? 0 : Math.round((filled / total) * 100);
  return { total, filled, percent };
}