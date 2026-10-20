// Tata letak cetak/PDF SPK Ban — meniru formulir kertas Bridgestone/TOMO.
import {
  BAN_CONDITION_ROWS,
  BAN_FREE_NOTE,
  BAN_POSITIONS,
  BAN_SERVICES,
  normalizeBanData,
  type BanCondition,
  type BanPosKey,
  type BanTyre,
} from "@/lib/spk/banForm";

const BRAND = "#E53935";
const LINE = "#e4e7ed";
const TEAL = "#0f766e";
const BLUE = "#1d6fc7";
const t = (v: unknown) => (v === null || v === undefined || v === "" ? "" : String(v));
const fmtTime = (v: unknown) => {
  const s = t(v);
  if (!s) return "";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? s : d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false });
};

function Radio({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 italic">
      <span
        className="inline-block h-3 w-3 rounded-full"
        style={{ border: `1.5px solid ${on ? BRAND : "#9299aa"}`, background: on ? BRAND : "transparent" }}
      />
      {label}
    </span>
  );
}

function CondTable({ label, v }: { label: string; v: BanCondition }) {
  return (
    <div className="flex" style={{ borderBottom: `1px solid ${LINE}` }}>
      <div className="flex w-6 items-center justify-center text-[9px] font-bold text-white" style={{ background: TEAL, writingMode: "vertical-rl", transform: "rotate(180deg)" }}>
        {label}
      </div>
      <div className="flex-1">
        {BAN_CONDITION_ROWS.map((row, i) => (
          <div key={row.key} className="flex items-center justify-between px-2 py-1 text-[12px]" style={{ borderTop: i ? `1px solid ${LINE}` : undefined }}>
            <span className="font-medium">{row.label}</span>
            <span className="flex gap-3 text-[11px]">
              {row.options.map((o) => (
                <Radio key={o.v} on={v[row.key] === o.v} label={o.l} />
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TyreBox({ tyre }: { tyre: BanTyre }) {
  return (
    <div className="text-center">
      <p className="text-[9px] italic">{tyre.ganti ? <b style={{ color: BRAND }}>GANTI</b> : "ok/ganti"}</p>
      <div className="flex h-8 w-16 items-end justify-end px-1 text-[11px]" style={{ border: `1.5px solid ${tyre.ganti ? BRAND : TEAL}`, background: tyre.ganti ? "#fef2f2" : "#f0fdfa", borderRadius: 4 }}>
        <span className="mr-auto self-center font-bold">{tyre.mm}</span>
        <i className="text-[9px]">mm</i>
      </div>
      <p className="mt-0.5 text-[10px] italic">{tyre.psi || "......."}psi</p>
    </div>
  );
}

function Axle({ title, tyres }: { title: string; tyres: Record<BanPosKey, BanTyre> }) {
  const [fl, fr, rl, rr] = BAN_POSITIONS.map((p) => tyres[p.key]);
  return (
    <div className="flex flex-col items-center">
      <div className="relative grid grid-cols-2 gap-x-6 gap-y-3 pl-5">
        <span className="absolute left-0 top-[22%] text-[13px] font-extrabold" style={{ color: BRAND }}>D</span>
        <span className="absolute left-0 top-[68%] text-[13px] font-extrabold" style={{ color: BRAND }}>B</span>
        <span className="absolute top-[12%] bottom-[12%] w-[2px]" style={{ left: "calc(50% + 10px - 1px)", background: BRAND }} />
        <span className="absolute h-[2px]" style={{ top: "50%", left: "calc(50% + 10px - 14px)", width: 28, background: BRAND }} />
        <TyreBox tyre={fl} />
        <TyreBox tyre={fr} />
        <TyreBox tyre={rl} />
        <TyreBox tyre={rr} />
      </div>
      <p className="mt-2 text-[11px] font-bold">{title}</p>
    </div>
  );
}

export function BanPrintSheet({ spk, branch }: { spk: any; branch: any }) {
  const d = (spk?.data ?? {}) as Record<string, unknown>;
  const ban = normalizeBanData(d.ban);
  const date = new Date(spk.opened_at || spk.created_at);
  const kv = (k: string, v: string) => (
    <div className="flex gap-1 px-2 py-0.5 text-[12px]" style={{ borderBottom: `1px solid ${LINE}` }}>
      <span className="shrink-0">{k} :</span>
      <span className="min-w-0 break-words font-semibold">{v}</span>
    </div>
  );
  const mechanic = t(d.mechanic_name);
  const admin = t(d.admin_approved_by);
  const customer = t(d.customer_name);

  return (
    <div className="space-y-2 p-5" style={{ fontFamily: "Inter, system-ui, sans-serif", color: "#0f1117" }}>
      <div data-pdf-block className="flex items-start justify-between gap-3 pb-2.5" style={{ borderBottom: `3px solid ${BRAND}` }}>
        <div>
          <h2 style={{ color: BRAND, fontSize: 22, fontWeight: 800, letterSpacing: "-.5px", lineHeight: 1 }}>STROBAN</h2>
          <p style={{ fontSize: 9, fontWeight: 600, color: "#9299aa", textTransform: "uppercase", letterSpacing: ".12em", marginTop: 1 }}>First Class Service</p>
          <p style={{ fontSize: 10.5, color: "#52596a", marginTop: 3 }}>Surat Perintah Kerja / SPK Ban{branch ? ` · ${branch.name}` : ""}</p>
        </div>
        <div className="text-right whitespace-nowrap">
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#9299aa" }}>Work Order Ban</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600 }}>{spk.spk_number}</p>
          <p style={{ fontSize: 10.5, color: "#52596a" }}>{ban.tanggal ? new Date(ban.tanggal).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}</p>
          <span className="inline-block mt-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded" style={{ background: "#fee2e2", color: "#b71c1c" }}>{spk.status}</span>
        </div>
      </div>

      <div data-pdf-block className="overflow-hidden rounded-[5px]" style={{ border: `1px solid ${LINE}`, background: "#f9fafb" }}>
        <p className="py-1 px-2.5 text-[10px] font-bold uppercase tracking-[.08em] text-white" style={{ background: "#0f1117" }}>Form Pelanggan Ban</p>
      <div className="grid grid-cols-2">
        <div style={{ borderRight: `1px solid ${LINE}` }}>
          {kv("Nama", t(d.customer_name))}
          {kv("No. HP", t(d.customer_phone))}
          {kv("Alamat", ban.alamat)}
          {kv("No Plat", t(d.vehicle_plate))}
        </div>
        <div>
          {kv("Merk/Tipe Mobil", [t(d.vehicle_merk), t(d.vehicle_tipe)].filter(Boolean).join(" "))}
          {kv("Tahun Mobil", t(d.vehicle_tahun))}
          {kv("Ukuran Ban", ban.ukuran_ban)}
          {kv("Merk Ban", ban.merk_ban)}
        </div>
      </div>
      </div>

      <div data-pdf-block className="grid grid-cols-4 gap-2 rounded-[5px] p-2 text-[11px]" style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
        <p>Waktu Masuk: <b>{ban.waktu_masuk || fmtTime(spk.opened_at || spk.created_at)}</b></p>
        <p>Waktu Mulai: <b>{ban.waktu_mulai || fmtTime(d.started_at || d.mechanic_assigned_at)}</b></p>
        <p>Waktu Selesai: <b>{ban.waktu_selesai || fmtTime(spk.closed_at || d.closed_at)}</b></p>
        <p>Waktu Jeda: <b>{ban.waktu_jeda}</b> {ban.waktu_jeda_ket && `Ket. ${ban.waktu_jeda_ket}`}</p>
      </div>

      <div data-pdf-block className="overflow-hidden rounded-[5px]" style={{ border: `1px solid ${LINE}` }}>
        <p className="py-1 px-2.5 text-[10px] font-bold uppercase tracking-[.08em] text-white" style={{ background: BRAND }}>Services</p>
        <div className="flex flex-wrap justify-around gap-2 px-2 py-1.5 text-[12px]" style={{ borderBottom: `1px solid ${LINE}` }}>
          {BAN_SERVICES.map((s) => <Radio key={s} on={ban.services.includes(s)} label={s} />)}
        </div>
        <div className="grid grid-cols-2">
          <div style={{ borderRight: `1px solid ${LINE}` }}><CondTable label="Sebelum" v={ban.sebelum} /></div>
          <div><CondTable label="Sesudah" v={ban.sesudah} /></div>
        </div>
        <div className="grid grid-cols-[2fr_1fr]">
          <div className="grid grid-cols-2 gap-2 p-3" style={{ borderRight: `1px solid ${LINE}` }}>
            <Axle title="Sebelum" tyres={ban.tyres_sebelum} />
            <Axle title="Sesudah" tyres={ban.tyres_sesudah} />
          </div>
          <div className="text-[11px]">
            <div className="grid grid-cols-2 text-center font-bold text-white" style={{ background: BLUE }}>
              <span>Balancing</span><span>Rotasi</span>
            </div>
            <div className="grid grid-cols-2 py-3 text-center">
              <span>Jumlah: <b>{ban.balancing_qty || "....."}</b> pcs</span>
              <span>Jumlah: <b>{ban.rotasi_qty || "....."}</b> pcs</span>
            </div>
            <div className="min-h-[70px] px-2 pt-1" style={{ borderTop: `1px solid ${LINE}` }}>
              <p className="italic">Catatan:</p>
              <p className="whitespace-pre-wrap break-words">{ban.catatan}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 py-1 text-[12px]" style={{ borderTop: `1px solid ${LINE}` }}>
          <b>Ban Bekas</b>
          <Radio on={ban.ban_bekas === "bawa"} label="Bawa" />
          <Radio on={ban.ban_bekas === "tinggal"} label="Tinggal" />
        </div>
        <p className="py-1 px-2.5 text-[10px] font-bold uppercase tracking-[.08em] text-white" style={{ background: BLUE }}>History</p>
        <div className="grid grid-cols-2 text-[12px]">
          <p className="px-2 py-1" style={{ borderRight: `1px solid ${LINE}` }}>Merk/Tipe Lama: <b>{ban.history_merk}</b></p>
          <p className="px-2 py-1">Ukuran Lama: <b>{ban.history_ukuran}</b></p>
        </div>
      </div>

      <p data-pdf-block className="rounded-[5px] py-1.5 text-center text-[12px] font-bold" style={{ background: "#f0faf3", color: "#15803d", border: "1px solid #bbf7d0" }}>
        {BAN_FREE_NOTE.replace(":", ": ✔")}
      </p>

      <div data-pdf-block className="grid grid-cols-3 gap-4 pt-4 text-center text-[12px]">
        {[
          { l: "Admin", v: admin },
          { l: "Teknisi", v: mechanic },
          { l: "Customer", v: customer },
        ].map((s) => (
          <div key={s.l} className="rounded-[5px] py-2" style={{ border: `1px solid ${LINE}`, background: s.v ? "#f0faf3" : "#f9fafb" }}>
            <p className="text-[9.5px] font-bold uppercase tracking-[.07em]" style={{ color: "#9299aa" }}>{s.l}</p>
            {s.v && <p className="text-[10px] font-extrabold tracking-[.1em]" style={{ color: "#15803d" }}>✓ DISETUJUI</p>}
            <p className="mt-2 min-h-[1em] font-semibold">{s.v}</p>
            <div className="mx-auto mt-1 w-3/4" style={{ borderTop: `1px solid ${LINE}` }} />
          </div>
        ))}
      </div>
      <div style={{ height: 4, background: BRAND }} />
    </div>
  );
}
