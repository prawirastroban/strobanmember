// Central normalizer for SPK `data` blob so PDF & Customer view stay in sync
// with what the Canvas cards actually persist. Canvas keys win; legacy keys
// used by older templates are kept as fallback so historical SPKs still show.

export type StatusToken = "ok" | "not" | "na" | "empty";

export interface DisplayItem {
  label: string;
  status: StatusToken;
  raw: unknown;
  extra?: string;
}

export interface DisplayGroup {
  title: string;
  items: DisplayItem[];
  note?: string;
}

export interface KVItem { label: string; value: string; }
export interface KVGroup { title: string; items: KVItem[]; note?: string; }

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
  signatures: { admin?: string; customer?: string; qc?: string };
  revision: { note?: string; requested_at?: string; resolved_at?: string };
}

const val = (d: Record<string, any>, ...keys: string[]) => {
  for (const k of keys) {
    const v = d?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
};

function tokenize(v: unknown): StatusToken {
  if (v === true || v === "ok" || v === "good" || v === "OK") return "ok";
  if (v === false || v === "bad" || v === "not" || v === "NOT") return "not";
  if (v === "na" || v === "n/a" || v === "N/A") return "na";
  if (v === undefined || v === null || v === "") return "empty";
  return "empty";
}

const F = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));

function inspection(d: Record<string, any>, code: string, label: string): DisplayItem {
  const raw = d?.[code];
  const sc = d?.[`${code}__sc`];
  return { label, raw, status: tokenize(raw), extra: sc ? "SC" : undefined };
}

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
      inspection(d, "engine_oil", "Engine Oil"),
      inspection(d, "brake_fluid", "Brake Fluid"),
      inspection(d, "spark_plug", "Spark Plug"),
      inspection(d, "packing_seal", "Packing Seal"),
      inspection(d, "power_steering_fluid", "Power Steering Fluid"),
      inspection(d, "coolant", "Coolant"),
      inspection(d, "transmission_fluid", "Transmission Fluid"),
      inspection(d, "matic_transmission", "Matic Transmission"),
      inspection(d, "diff_gear_oil", "Differential Gear Oil"),
      inspection(d, "brake_pad_front", "Brake Pad — Front"),
      inspection(d, "brake_pad_rear", "Brake Pad — Rear"),
      inspection(d, "v_belt", "V-Belt"),
      inspection(d, "brake_cylinder", "Brake Cylinder"),
      inspection(d, "brake_calipers", "Brake Calipers"),
    ],
    note: F(val(d, "engine_service_lainnya")),
  };

  const lamps: DisplayGroup = {
    title: "Lamps",
    items: [
      inspection(d, "lamp_head", "Head"),
      inspection(d, "lamp_fog", "Fog"),
      inspection(d, "lamp_side", "Side"),
      inspection(d, "lamp_rear", "Rear"),
      inspection(d, "lamp_brake", "Brake"),
    ],
  };

  const electrical: DisplayGroup = {
    title: "Electrical & Wiper",
    items: [
      inspection(d, "wiper_blades", "Wiper Blades"),
      inspection(d, "wiper_fluid", "Wiper Fluid"),
      inspection(d, "battery", "Battery"),
      inspection(d, "alternator", "Alternator"),
    ],
  };

  const ac: DisplayGroup = {
    title: "AC Check",
    items: [
      inspection(d, "ac_compressor", "Compressor"),
      inspection(d, "ac_magnetic_clutch", "Magnetic Clutch"),
      inspection(d, "ac_condensor", "Condensor"),
      inspection(d, "ac_pipe", "Pipe"),
      inspection(d, "ac_switch", "Switch"),
      inspection(d, "ac_compressor_oil", "Compressor Oil"),
      inspection(d, "ac_evaporator", "Evaporator"),
      inspection(d, "ac_motor_fan", "Motor Fan"),
      inspection(d, "ac_blower", "Blower"),
      inspection(d, "ac_automatic", "Automatic"),
      inspection(d, "ac_cabin_air_filter", "Cabin Air Filter"),
      inspection(d, "ac_high_pressure", "High Pressure"),
      inspection(d, "ac_low_pressure", "Low Pressure"),
    ],
    note: F(val(d, "ac_remarks")),
  };

  const wheelChecks: DisplayItem[] = [
    inspection(d, "tyre_fl_status", "Depan Kiri (FL)"),
    inspection(d, "tyre_fr_status", "Depan Kanan (FR)"),
    inspection(d, "tyre_rl_status", "Belakang Kiri (RL)"),
    inspection(d, "tyre_rr_status", "Belakang Kanan (RR)"),
  ];

  const tyre = {
    title: "Tyre Check",
    items: [
      { label: "Merek", value: F(val(d, "tyre_brand")) },
      { label: "Pattern", value: F(val(d, "tyre_pattern")) },
      { label: "Ukuran", value: F(val(d, "tyre_size")) },
      { label: "Ban Bekas", value: F(val(d, "tyre_ban_bekas")) },
      { label: "Depth FL/FR", value: `${F(val(d, "tyre_fl_depth"))} / ${F(val(d, "tyre_fr_depth"))} mm` },
      { label: "Depth RL/RR", value: `${F(val(d, "tyre_rl_depth"))} / ${F(val(d, "tyre_rr_depth"))} mm` },
    ],
    checks: wheelChecks,
  };

  const suspension: DisplayGroup = {
    title: "Suspension & Brake",
    items: [
      inspection(d, "insp_suspension_wheel_bearing", "Wheel Bearing"),
      inspection(d, "insp_suspension_control_arm", "Control Arm"),
      inspection(d, "insp_suspension_ball_joint", "Ball Joint"),
      inspection(d, "insp_suspension_shock_absorber", "Shock Absorber"),
    ],
    note: F(val(d, "insp_suspension_part_replacement")),
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
    revision: {
      note: d.customer_revision_note,
      requested_at: d.customer_revision_requested_at,
      resolved_at: d.customer_revision_resolved_at,
    },
  };
}

export const STATUS_PALETTE: Record<StatusToken, { bg: string; fg: string; border: string; label: string }> = {
  ok:    { bg: "#DCFCE7", fg: "#166534", border: "#86EFAC", label: "OK" },
  not:   { bg: "#FEE2E2", fg: "#991B1B", border: "#FCA5A5", label: "Perlu Perhatian" },
  na:    { bg: "#F1F5F9", fg: "#475569", border: "#CBD5E1", label: "N/A" },
  empty: { bg: "#FFFFFF", fg: "#94A3B8", border: "#E2E8F0", label: "—" },
};
