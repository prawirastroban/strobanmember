// Model data SPK Ban — mengikuti formulir kertas "Form Pelangan Ban" (Bridgestone/TOMO).
export const BAN_SERVICES = [
  "Ganti Ban",
  "Spooring",
  "Balancing",
  "Nitrogen",
  "Rotasi",
  "Pengecekan",
] as const;

export const BAN_POSITIONS = [
  { key: "fl", label: "Depan Kiri" },
  { key: "fr", label: "Depan Kanan" },
  { key: "rl", label: "Belakang Kiri" },
  { key: "rr", label: "Belakang Kanan" },
] as const;

export type BanPosKey = (typeof BAN_POSITIONS)[number]["key"];

export interface BanTyre {
  ganti: boolean; // ok/ganti
  mm: string; // ketebalan alur
  psi: string; // tekanan
}

export interface BanCondition {
  tekanan: "" | "baik" | "kurang";
  keausan: "" | "baik" | "tidak_rata";
  velg: "" | "normal" | "bengkok";
}

export interface BanData {
  alamat: string;
  tanggal: string;
  waktu_masuk: string;
  waktu_mulai: string;
  waktu_selesai: string;
  ukuran_ban: string;
  merk_ban: string;
  services: string[];
  sebelum: BanCondition;
  sesudah: BanCondition;
  tyres_sebelum: Record<BanPosKey, BanTyre>;
  tyres_sesudah: Record<BanPosKey, BanTyre>;
  balancing_qty: string;
  rotasi_qty: string;
  ban_bekas: "" | "bawa" | "tinggal";
  catatan: string;
  history_merk: string;
  history_ukuran: string;
  waktu_jeda: string;
  waktu_jeda_ket: string;
}

const emptyTyres = (): Record<BanPosKey, BanTyre> => ({
  fl: { ganti: false, mm: "", psi: "" },
  fr: { ganti: false, mm: "", psi: "" },
  rl: { ganti: false, mm: "", psi: "" },
  rr: { ganti: false, mm: "", psi: "" },
});

export const emptyBanData = (): BanData => ({
  alamat: "",
  tanggal: "",
  waktu_masuk: "",
  waktu_mulai: "",
  waktu_selesai: "",
  ukuran_ban: "",
  merk_ban: "",
  services: [],
  sebelum: { tekanan: "", keausan: "", velg: "" },
  sesudah: { tekanan: "", keausan: "", velg: "" },
  tyres_sebelum: emptyTyres(),
  tyres_sesudah: emptyTyres(),
  balancing_qty: "",
  rotasi_qty: "",
  ban_bekas: "",
  catatan: "",
  history_merk: "",
  history_ukuran: "",
  waktu_jeda: "",
  waktu_jeda_ket: "",
});

/** Gabungkan data tersimpan (bisa parsial/lama) dengan default lengkap. */
export function normalizeBanData(raw: unknown): BanData {
  const base = emptyBanData();
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<BanData>;
  const tyres = (t: unknown) => {
    const out = emptyTyres();
    if (t && typeof t === "object") {
      for (const p of BAN_POSITIONS) {
        const v = (t as Record<string, Partial<BanTyre>>)[p.key];
        if (v) out[p.key] = { ...out[p.key], ...v };
      }
    }
    return out;
  };
  return {
    ...base,
    ...r,
    services: Array.isArray(r.services) ? r.services : [],
    sebelum: { ...base.sebelum, ...(r.sebelum ?? {}) },
    sesudah: { ...base.sesudah, ...(r.sesudah ?? {}) },
    tyres_sebelum: tyres(r.tyres_sebelum),
    tyres_sesudah: tyres(r.tyres_sesudah),
  };
}

export const BAN_CONDITION_ROWS = [
  { key: "tekanan", label: "Tekanan Ban", options: [{ v: "baik", l: "Baik" }, { v: "kurang", l: "Kurang" }] },
  { key: "keausan", label: "Keausan Ban", options: [{ v: "baik", l: "Baik" }, { v: "tidak_rata", l: "Tidak Rata" }] },
  { key: "velg", label: "Velg/Baut", options: [{ v: "normal", l: "Normal" }, { v: "bengkok", l: "Bengkok" }] },
] as const;

export const BAN_FREE_NOTE = "Ganti Ban di Stroban Sudah Pasti Gratis: Pasang, Balancing, Nitrogen, Pentil Baru";
