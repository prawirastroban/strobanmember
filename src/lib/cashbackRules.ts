import { supabase } from "@/integrations/supabase/client";

export const CASHBACK_RULES_KEY = "cashback.usage_rules";

export type CashbackRuleMode = "all" | "categories" | "services";

export interface CashbackUsageRules {
  enabled: boolean;
  mode: CashbackRuleMode;
  allowed_categories: string[];
  allowed_service_ids: string[];
  /** Blokir jika ada item dari kategori berjenis "product" (ban/oli/sparepart). */
  exclude_products: boolean;
  /** Minimal total transaksi (Rp) agar saldo boleh dipakai. 0 = tanpa minimal. */
  min_transaction: number;
  /** Maksimal potongan per transaksi (Rp). 0 = tanpa batas. */
  max_amount: number;
  /** Maksimal potongan sebagai persentase total. 100 = tanpa batas. */
  max_percent: number;
  denied_message: string;
}

export const DEFAULT_CASHBACK_RULES: CashbackUsageRules = {
  enabled: true,
  mode: "all",
  allowed_categories: [],
  allowed_service_ids: [],
  exclude_products: false,
  min_transaction: 0,
  max_amount: 0,
  max_percent: 100,
  denied_message: "Saldo cashback belum bisa dipakai untuk layanan yang dipilih.",
};

const toStrArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];

const toNum = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export function normalizeCashbackRules(raw: unknown): CashbackUsageRules {
  if (!raw || typeof raw !== "object") return DEFAULT_CASHBACK_RULES;
  const r = raw as Record<string, unknown>;
  const mode = r.mode === "categories" || r.mode === "services" ? r.mode : "all";
  return {
    enabled: r.enabled === undefined ? true : Boolean(r.enabled),
    mode,
    allowed_categories: toStrArray(r.allowed_categories),
    allowed_service_ids: toStrArray(r.allowed_service_ids),
    exclude_products: Boolean(r.exclude_products),
    min_transaction: Math.max(0, toNum(r.min_transaction, 0)),
    max_amount: Math.max(0, toNum(r.max_amount, 0)),
    max_percent: Math.min(100, Math.max(0, toNum(r.max_percent, 100))),
    denied_message:
      typeof r.denied_message === "string" && r.denied_message.trim()
        ? r.denied_message
        : DEFAULT_CASHBACK_RULES.denied_message,
  };
}

/** Fallback aman: dipakai bila aturan gagal dibaca (jangan pernah permisif). */
export const DENIED_CASHBACK_RULES: CashbackUsageRules = {
  ...DEFAULT_CASHBACK_RULES,
  enabled: false,
};

let cache: { at: number; rules: CashbackUsageRules } | null = null;
const TTL_MS = 15_000;

export async function fetchCashbackRules(force = false): Promise<CashbackUsageRules> {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.rules;
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", CASHBACK_RULES_KEY)
    .maybeSingle();
  // Gagal baca / baris tidak ada → tutup pemakaian saldo (fail-safe).
  if (error || !data) return DENIED_CASHBACK_RULES;
  const rules = normalizeCashbackRules((data as any)?.value);
  cache = { at: Date.now(), rules };
  return rules;
}

export function invalidateCashbackRules() {
  cache = null;
}


export interface EvalService {
  id: string;
  category?: string | null;
  /** true jika kategori layanan ini berjenis barang (product). */
  isProduct?: boolean;
}

export interface CashbackEvaluation {
  eligible: boolean;
  /** Alasan singkat berbahasa Indonesia jika tidak eligible. */
  reason: string | null;
  /** Batas maksimal saldo yang boleh dipakai (Rp, sudah dibulatkan ke bawah). */
  maxUsable: number;
  /** Kekurangan agar mencapai minimal transaksi (Rp). */
  shortfall: number;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/**
 * Aturan pemakaian saldo cashback — satu sumber kebenaran untuk semua checkout.
 * Mirror dari validasi server pada RPC `apply_cashback_to_booking`.
 */
export function evaluateCashbackUsage(params: {
  rules: CashbackUsageRules;
  services: EvalService[];
  /** Total tagihan setelah diskon lain, sebelum saldo cashback. */
  total: number;
  /** Saldo cashback user. */
  balance: number;
}): CashbackEvaluation {
  const { rules, services, total, balance } = params;
  const none: CashbackEvaluation = { eligible: false, reason: null, maxUsable: 0, shortfall: 0 };

  if (!rules.enabled) {
    return { ...none, reason: "Pemakaian saldo cashback sedang dinonaktifkan." };
  }

  if (rules.mode === "services") {
    const ok = services.some((s) => rules.allowed_service_ids.includes(s.id));
    if (!ok) return { ...none, reason: rules.denied_message };
  } else if (rules.mode === "categories") {
    const ok = services.some((s) => s.category && rules.allowed_categories.includes(s.category));
    if (!ok) return { ...none, reason: rules.denied_message };
  }

  if (rules.exclude_products && services.some((s) => s.isProduct)) {
    return { ...none, reason: "Saldo cashback tidak berlaku untuk pembelian barang." };
  }

  if (rules.min_transaction > 0 && total < rules.min_transaction) {
    return {
      ...none,
      reason: `Minimal transaksi ${formatIDR(rules.min_transaction)}. Kurang ${formatIDR(
        rules.min_transaction - total,
      )} lagi.`,
      shortfall: rules.min_transaction - total,
    };
  }

  let cap = Math.floor(Math.max(0, total));
  if (rules.max_percent > 0 && rules.max_percent < 100) {
    cap = Math.min(cap, Math.floor((total * rules.max_percent) / 100));
  }
  if (rules.max_amount > 0) cap = Math.min(cap, rules.max_amount);

  const maxUsable = Math.max(0, Math.min(cap, Math.floor(balance)));
  if (maxUsable <= 0) return { ...none, reason: null };

  return { eligible: true, reason: null, maxUsable, shortfall: 0 };
}
