// Central normalizer for SPK `data` blob so PDF & Customer view stay in sync
// with what the Canvas cards actually persist. Canvas keys win; legacy keys
// used by older templates are kept as fallback so historical SPKs still show.

export type StatusToken = "ok" | "warn" | "not" | "na" | "empty";

export interface DisplayItem {
  label: string;
  status: StatusToken;
  raw: unknown;
  extra?: string;
  note?: string;
}

export interface DisplayGroup {
  title: string;
  items: DisplayItem[];
  note?: string;
}

export interface KVItem { label: string; value: string; }
export interface KVGroup { title: string; items: KVItem[]; note?: string; }

export interface EstimasiRow {
  nama: string;
  qty: number;
  harga: number;
  subtotal: number;
  urgensi: "ok" | "bad" | "—";
  persetujuan: "yes" | "no" | "—";
}

export interface EstimasiDisplay {
  items: EstimasiRow[];
  totalItems: number;
  subtotal: number;
  diskonJasa: number;
  diskonSparepart: number;
  total: number;
}

export interface SpkDisplay {
  customer: KVItem[];
  vehicle: KVItem[];
  complaint: { note: string; estimasi?: string; konfirmasi?: string };
  serviceOrder: KVGroup;
  engine: DisplayGroup;
  lamps: DisplayGroup;
  electrical: DisplayGroup;
  ac: DisplayGroup;
  tyre: KVGroup & { checks: DisplayItem[] };
  suspension: DisplayGroup;
  workTimes: KVGroup;
  mechanicNote: string;
  signatures: { admin?: string; customer?: string; mekanik?: string };
  approvals: {
    admin: { approved: boolean; by?: string; at?: string };
    customer: { approved: boolean; by?: string; at?: string };
    mekanik: { approved: boolean; by?: string; at?: string };
  };
  revision: { note?: string; requested_at?: string; resolved_at?: string };
  estimasi: EstimasiDisplay;
}

const val = (d: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) {
    const v = d?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

function tokenize(v: unknown): StatusToken {
  if (v === true || v === "good" || v === "GOOD") return "ok";
  if (v === "ok" || v === "OK") return "warn"; // v2 middle tier
  if (v === false || v === "bad" || v === "BAD" || v === "not" || v === "NOT") return "not";
  if (v === "na" || v === "n/a" || v === "N/A") return "na";
  if (v === undefined || v === null || v === "") return "empty";
  return "empty";
}

const F = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));

function inspection(
  d: Record<string, any>,
  codes: string | string[],
  label: string,
): DisplayItem {
  const list = Array.isArray(codes) ? codes : [codes];
  let raw: unknown = undefined;
  let note: string | undefined;
  let sc = false;
  for (const c of list) {
    if (raw === undefined || raw === null || raw === "") {
      const v = d?.[c];
      if (v !== undefined && v !== null && v !== "") raw = v;
    }
    if (!note) {
      const nk = c.endsWith("_cond") ? c.replace(/_cond$/, "_note") : `${c}_note`;
      const nv = d?.[nk];
      if (typeof nv === "string" && nv.trim()) note = nv.trim();
    }
    if (!sc && d?.[`${c}__sc`]) sc = true;
  }
  return { label, raw, status: tokenize(raw), extra: sc ? "SC" : undefined, note };
}

// Helper: pair-check reading v2 (chk_*_cond) with legacy fallback.
const pair = (v2: string, legacy: string) => [`${v2}_cond`, legacy];

export function buildSpkDisplay(dataObj: any): SpkDisplay {
  const d = (dataObj ?? {}) as Record<string, any>;

  const customer: KVItem[] = [
    { label: "Nama", value: F(val(d, "customer_name")) },
    { label: "No. HP", value: F(val(d, "customer_phone")) },
    { label: "Platform", value: F(val(d, "customer_platform")) },
  ];

  const vehicle: KVItem[] = [
    {
      label: "Kendaraan",
      value: [val(d, "vehicle_merk"), val(d, "vehicle_tipe"), val(d, "vehicle_tahun") ? `· ${d.vehicle_tahun}` : ""]
        .filter(Boolean).join(" ") || "—",
    },
    { label: "Plat Nomor", value: F(val(d, "vehicle_plate")) },
    {
      label: "Odometer",
      value: `${F(val(d, "vehicle_mileage_now"))} km · Next: ${F(val(d, "vehicle_mileage_next"))} km`,
    },
  ];

  const petrol = val(d, "service_pkg_petrol");
  const diesel = val(d, "service_pkg_diesel");
  const acPkg = val(d, "service_pkg_ac");
  const tuneUp = val(d, "service_tune_up");
  const paketService = [
    petrol ? `Petrol: ${petrol}` : null,
    diesel ? `Diesel: ${diesel}` : null,
    acPkg ? `AC: ${acPkg}` : null,
    tuneUp ? `Tune-up: ${tuneUp}` : null,
    val(d, "service_package"),
  ].filter(Boolean).join(" · ") || "—";

  const serviceOrder: KVGroup = {
    title: "Order Sales Advisor",
    items: [
      { label: "Oli Merek", value: F(val(d, "service_oil_brand")) },
      { label: "Oli Qty (L)", value: F(val(d, "service_oil_qty")) },
      { label: "Paket Service", value: paketService },
      { label: "Order Lainnya", value: F(val(d, "service_others", "service_extra")) },
      { label: "Bonus", value: F(val(d, "service_bonus")) },
    ],
  };

  const engine: DisplayGroup = {
    title: "Diagnostic — Engine / Brake / Fluid",
    items: [
      inspection(d, pair("chk_engine_oil", "engine_oil"), "Engine Oil"),
      inspection(d, pair("chk_brake_fluid", "brake_fluid"), "Brake Fluid"),
      inspection(d, pair("chk_spark_plug", "spark_plug"), "Spark Plug"),
      inspection(d, pair("chk_packing_seal", "packing_seal"), "Packing Seal"),
      inspection(d, pair("chk_power_steering", "power_steering_fluid"), "Power Steering Fluid"),
      inspection(d, pair("chk_coolant", "coolant"), "Coolant"),
      inspection(d, pair("chk_transmission_fluid", "transmission_fluid"), "Transmission Fluid"),
      inspection(d, pair("chk_air_filter", "air_filter"), "Air Filter"),
      inspection(d, pair("chk_fuel_filter", "fuel_filter"), "Fuel Filter"),
      inspection(d, "matic_transmission", "Matic Transmission"),
      inspection(d, pair("chk_diff_gear_oil", "diff_gear_oil"), "Differential Gear Oil"),
      inspection(d, pair("chk_brake_pad_front", "brake_pad_front"), "Brake Pad — Front"),
      inspection(d, pair("chk_brake_pad_rear", "brake_pad_rear"), "Brake Pad — Rear"),
      inspection(d, pair("chk_v_belt", "v_belt"), "V-Belt"),
      inspection(d, pair("chk_brake_cylinder", "brake_cylinder"), "Brake Cylinder"),
      inspection(d, pair("chk_brake_calipers", "brake_calipers"), "Brake Calipers"),
    ].filter((it) => it.status !== "empty"),
    note: F(val(d, "engine_service_lainnya")),
  };

  // Lamps: v2 stores `lamps_flags` map + one shared cond/note.
  const lampsFlags = (d.lamps_flags && typeof d.lamps_flags === "object") ? d.lamps_flags : null;
  const lampsCondRaw = val(d, "lamps_cond");
  const lampsItems: DisplayItem[] = lampsFlags
    ? (["HEAD", "FOG", "TURN", "REVERSE", "REAR", "BRAKE"] as const).map((k) => ({
        label: k.charAt(0) + k.slice(1).toLowerCase(),
        raw: lampsFlags[k],
        status: lampsFlags[k] ? "ok" : "empty",
      }))
    : [
        inspection(d, "lamp_head", "Head"),
        inspection(d, "lamp_fog", "Fog"),
        inspection(d, "lamp_side", "Side"),
        inspection(d, "lamp_rear", "Rear"),
        inspection(d, "lamp_brake", "Brake"),
      ];
  // Overlay shared v2 condition to any active lamp when no per-lamp status exists.
  if (lampsFlags && lampsCondRaw) {
    const sharedTok = tokenize(lampsCondRaw);
    lampsItems.forEach((it) => {
      if (it.raw === true) it.status = sharedTok;
    });
  }
  const lampsNote = typeof d.lamps_note === "string" && d.lamps_note.trim() ? d.lamps_note.trim() : undefined;
  const lamps: DisplayGroup = {
    title: "Lamps",
    items: lampsItems,
    note: lampsNote,
  };

  const electrical: DisplayGroup = {
    title: "Electrical & Wiper",
    items: [
      inspection(d, pair("chk_wiper_blades", "wiper_blades"), "Wiper Blades"),
      inspection(d, pair("chk_wiper_fluid", "wiper_fluid"), "Wiper Fluid"),
      inspection(d, pair("chk_battery", "battery"), "Battery"),
      inspection(d, pair("chk_alternator", "alternator"), "Alternator"),
    ].filter((it) => it.status !== "empty" || it.note),
  };

  const ac: DisplayGroup = {
    title: "AC Check",
    items: [
      inspection(d, pair("chk_ac_compressor", "ac_compressor"), "Compressor"),
      inspection(d, pair("chk_ac_magnetic_clutch", "ac_magnetic_clutch"), "Magnetic Clutch"),
      inspection(d, pair("chk_ac_condensor", "ac_condensor"), "Condensor"),
      inspection(d, pair("chk_ac_pipe", "ac_pipe"), "Pipe"),
      inspection(d, pair("chk_ac_switch", "ac_switch"), "Switch"),
      inspection(d, pair("chk_ac_compressor_oil", "ac_compressor_oil"), "Compressor Oil"),
      inspection(d, pair("chk_ac_evaporator", "ac_evaporator"), "Evaporator"),
      inspection(d, pair("chk_ac_motor_fan", "ac_motor_fan"), "Motor Fan"),
      inspection(d, pair("chk_ac_blower", "ac_blower"), "Blower"),
      inspection(d, pair("chk_ac_automatic", "ac_automatic"), "Automatic"),
      inspection(d, pair("chk_ac_cabin_air_filter", "ac_cabin_air_filter"), "Cabin Air Filter"),
      inspection(d, pair("chk_ac_high_pressure", "ac_high_pressure"), "High Pressure"),
      inspection(d, pair("chk_ac_low_pressure", "ac_low_pressure"), "Low Pressure"),
    ].filter((it) => it.status !== "empty" || it.note),
    note: F(val(d, "ac_other_remarks", "ac_remarks")),
  };

  const wheelChecks: DisplayItem[] = [
    inspection(d, ["tyre_fl_cond", "tyre_fl_status"], "Depan Kiri (FL)"),
    inspection(d, ["tyre_fr_cond", "tyre_fr_status"], "Depan Kanan (FR)"),
    inspection(d, ["tyre_rl_cond", "tyre_rl_status"], "Belakang Kiri (RL)"),
    inspection(d, ["tyre_rr_cond", "tyre_rr_status"], "Belakang Kanan (RR)"),
  ];

  const banBekasRaw = val(d, "tyre_ban_bekas");
  const banBekasLabel =
    banBekasRaw === "bawa" ? "Bawa pulang"
    : banBekasRaw === "tinggal" ? "Ditinggal di bengkel"
    : F(banBekasRaw);

  const tyre = {
    title: "Tyre Check",
    items: [
      { label: "Merek", value: F(val(d, "tyre_brand")) },
      { label: "Pattern", value: F(val(d, "tyre_pattern")) },
      { label: "Ukuran", value: F(val(d, "tyre_size")) },
      { label: "Ban Bekas", value: banBekasLabel },
      { label: "Depth FL/FR", value: `${F(val(d, "tyre_fl_depth"))} / ${F(val(d, "tyre_fr_depth"))} mm` },
      { label: "Depth RL/RR", value: `${F(val(d, "tyre_rl_depth"))} / ${F(val(d, "tyre_rr_depth"))} mm` },
    ],
    checks: wheelChecks,
  };

  const suspension: DisplayGroup = {
    title: "Suspension & Brake",
    items: [
      inspection(d, ["chk_suspension_wheel_bearing_cond", "insp_suspension_wheel_bearing"], "Wheel Bearing"),
      inspection(d, ["chk_suspension_control_arm_cond", "insp_suspension_control_arm"], "Control Arm"),
      inspection(d, ["chk_suspension_ball_joint_cond", "insp_suspension_ball_joint"], "Ball Joint"),
      inspection(d, ["chk_suspension_shock_absorber_cond", "insp_suspension_shock_absorber"], "Shock Absorber"),
    ],
    note: F(val(d, "suspension_part_replacement", "insp_suspension_part_replacement")),
  };

  // Estimasi (v2)
  const rawEst = Array.isArray(d.estimasi_items) ? d.estimasi_items : [];
  const estRows: EstimasiRow[] = rawEst
    .map((it: any) => {
      const qty = Number(it?.qty) || 0;
      const harga = Number(it?.harga) || 0;
      return {
        nama: typeof it?.nama === "string" ? it.nama.trim() : "",
        qty,
        harga,
        subtotal: qty * harga,
        urgensi: (it?.urgensi === "ok" || it?.urgensi === "bad") ? it.urgensi : "—",
        persetujuan: (it?.approval === "yes" || it?.approval === "no") ? it.approval : "—",
      } as EstimasiRow;
    })
    .filter((r: EstimasiRow) => r.nama || r.qty > 0 || r.harga > 0);
  const estSubtotal = estRows.reduce((s, r) => s + r.subtotal, 0);
  const diskonJasa = Number(d.estimasi_diskon_jasa) || 0;
  const diskonSp = Number(d.estimasi_diskon_sparepart) || 0;
  const estTotal = Math.max(0, estSubtotal - diskonJasa - diskonSp);
  const estimasi: EstimasiDisplay = {
    items: estRows,
    totalItems: estRows.reduce((s, r) => s + r.qty, 0),
    subtotal: estSubtotal,
    diskonJasa,
    diskonSparepart: diskonSp,
    total: estTotal,
  };

  const workTimes: KVGroup = {
    title: "Waktu Pengerjaan",
    items: [
      { label: "Tanggal Masuk", value: F(val(d, "date_in")) },
      { label: "Tanggal Keluar", value: F(val(d, "date_out")) },
      { label: "Waktu Masuk", value: F(val(d, "time_in")) },
      { label: "Waktu Keluar", value: F(val(d, "time_out")) },
      { label: "Mulai", value: F(val(d, "time_start")) },
      { label: "Selesai", value: F(val(d, "time_end")) },
      { label: "Durasi", value: F(val(d, "time_duration")) },
      { label: "Mekanik", value: F(val(d, "mechanic_name")) },
    ],
  };

  return {
    customer,
    vehicle,
    complaint: {
      note: F(val(d, "complaint_note", "customer_complaint", "keluhan_customer")),
      estimasi: F(val(d, "complaint_estimasi")),
      konfirmasi: F(val(d, "complaint_konfirmasi")),
    },
    serviceOrder,
    engine,
    lamps,
    electrical,
    ac,
    tyre,
    suspension,
    workTimes,
    mechanicNote: F(val(d, "mechanic_note")),
    signatures: {
      admin: d.signature_admin,
      customer: d.signature_customer,
      mekanik: d.signature_mekanik,
    },
    approvals: {
      admin: {
        approved: !!(d.admin_approved || d.signature_admin),
        by: d.admin_approved_by || undefined,
        at: d.admin_approved_at || undefined,
      },
      customer: {
        approved: !!(d.customer_approved || d.signature_customer),
        at: d.customer_approved_at || d.signature_customer_signed_at || undefined,
      },
      mekanik: {
        approved: !!(d.mechanic_approved || d.signature_mekanik),
        by: d.mechanic_name || undefined,
        at: d.mechanic_approved_at || d.time_end || undefined,
      },
    },
    revision: {
      note: d.customer_revision_note,
      requested_at: d.customer_revision_requested_at,
      resolved_at: d.customer_revision_resolved_at,
    },
    estimasi,
  };
}

export const STATUS_PALETTE: Record<StatusToken, { bg: string; fg: string; border: string; label: string }> = {
  ok:    { bg: "#DCFCE7", fg: "#166534", border: "#86EFAC", label: "OK" },
  warn:  { bg: "#FEF3C7", fg: "#92400E", border: "#FCD34D", label: "Perhatian" },
  not:   { bg: "#FEE2E2", fg: "#991B1B", border: "#FCA5A5", label: "Perlu Perhatian" },
  na:    { bg: "#F1F5F9", fg: "#475569", border: "#CBD5E1", label: "N/A" },
  empty: { bg: "#FFFFFF", fg: "#94A3B8", border: "#E2E8F0", label: "—" },
};

// Ringkasan singkat paket & servis untuk kartu daftar SPK.
// Mengembalikan string atau null (kalau tidak ada isian).
export function buildServiceSummary(dataObj: any): string | null {
  const d = (dataObj ?? {}) as Record<string, any>;

  const pkgs: string[] = [];
  if (d.service_pkg_petrol) pkgs.push(String(d.service_pkg_petrol));
  if (d.service_pkg_diesel) pkgs.push(String(d.service_pkg_diesel));
  if (d.service_pkg_ac) pkgs.push(`AC ${d.service_pkg_ac}`);

  const umumLabels: Record<string, string> = {
    ganti_oli: "Ganti Oli",
    tune_up: "Tune Up",
    kaki_kaki: "Kaki-kaki",
    spooring: "Spooring",
    balancing: "Balancing",
    oil_filter: "Oil Filter",
    cuci_darah: "Cuci Darah",
    service_ac: "Service AC",
    brake_service: "Brake Service",
    safety_check: "Safety Check",
  };
  const checks = (d.service_umum && typeof d.service_umum === "object") ? d.service_umum : {};
  const umum: string[] = [];
  for (const k of Object.keys(umumLabels)) {
    if (checks[k]) {
      let l = umumLabels[k];
      if (k === "tune_up" && d.service_tune_up) l += ` (${d.service_tune_up})`;
      umum.push(l);
    }
  }

  const others = typeof d.service_others === "string" ? d.service_others.trim() : "";
  const bonus = typeof d.service_bonus === "string" ? d.service_bonus.trim() : "";

  const parts: string[] = [];
  if (pkgs.length) parts.push(`Paket: ${pkgs.join(" / ")}`);
  if (umum.length) parts.push(umum.join(", "));
  if (others) parts.push(`Lainnya: ${others.length > 40 ? others.slice(0, 40) + "…" : others}`);
  if (bonus) parts.push(`Bonus: ${bonus.length > 30 ? bonus.slice(0, 30) + "…" : bonus}`);

  return parts.length ? parts.join(" · ") : null;
}
