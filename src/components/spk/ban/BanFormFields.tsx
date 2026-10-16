// Isian SPK Ban (dipakai di form intake & Canvas). Controlled: value + onChange.
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BAN_CONDITION_ROWS,
  BAN_FREE_NOTE,
  BAN_POSITIONS,
  BAN_SERVICES,
  type BanCondition,
  type BanData,
  type BanPosKey,
  type BanTyre,
} from "@/lib/spk/banForm";

type Props = {
  value: BanData;
  onChange: (next: BanData) => void;
  /** intake = data awal saja (tanpa kondisi sesudah). */
  mode?: "intake" | "full";
  disabled?: boolean;
};

const chip = (active: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-background/40 text-muted-foreground hover:border-primary/50"
  }`;

function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>;
}

function ConditionBlock({
  title,
  value,
  onChange,
  disabled,
}: {
  title: string;
  value: BanCondition;
  onChange: (v: BanCondition) => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <Label>{title}</Label>
      <div className="space-y-2">
        {BAN_CONDITION_ROWS.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm">{row.label}</span>
            <div className="flex gap-1.5">
              {row.options.map((o) => {
                const active = value[row.key] === o.v;
                return (
                  <button
                    key={o.v}
                    type="button"
                    disabled={disabled}
                    className={chip(active)}
                    onClick={() => onChange({ ...value, [row.key]: active ? "" : o.v } as BanCondition)}
                  >
                    {o.l}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TyreGrid({
  title,
  value,
  onChange,
  disabled,
}: {
  title: string;
  value: Record<BanPosKey, BanTyre>;
  onChange: (v: Record<BanPosKey, BanTyre>) => void;
  disabled?: boolean;
}) {
  const set = (k: BanPosKey, patch: Partial<BanTyre>) => onChange({ ...value, [k]: { ...value[k], ...patch } });
  return (
    <div className="rounded-xl border border-border/70 p-3">
      <Label>{title}</Label>
      <div className="grid grid-cols-2 gap-2">
        {BAN_POSITIONS.map((p) => {
          const t = value[p.key];
          return (
            <div key={p.key} className="rounded-lg border border-border/60 p-2">
              <div className="mb-1.5 flex items-center justify-between gap-1">
                <span className="text-[11px] font-semibold">{p.label}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => set(p.key, { ganti: !t.ganti })}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${t.ganti ? "border-primary bg-primary/15 text-primary" : "border-border text-muted-foreground"}`}
                >
                  {t.ganti ? "Ganti" : "OK"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <div className="relative">
                  <Input disabled={disabled} inputMode="decimal" value={t.mm} onChange={(e) => set(p.key, { mm: e.target.value.slice(0, 6) })} className="h-9 pr-8 text-sm" placeholder="0" aria-label={`${p.label} mm`} />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">mm</span>
                </div>
                <div className="relative">
                  <Input disabled={disabled} inputMode="decimal" value={t.psi} onChange={(e) => set(p.key, { psi: e.target.value.slice(0, 6) })} className="h-9 pr-8 text-sm" placeholder="0" aria-label={`${p.label} psi`} />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">psi</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BanFormFields({ value, onChange, mode = "full", disabled }: Props) {
  const set = <K extends keyof BanData>(k: K, v: BanData[K]) => onChange({ ...value, [k]: v });
  const toggleSvc = (s: string) =>
    set("services", value.services.includes(s) ? value.services.filter((x) => x !== s) : [...value.services, s]);

  return (
    <div className="space-y-4">
      {mode === "full" && <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Ukuran Ban</Label>
          <Input disabled={disabled} value={value.ukuran_ban} onChange={(e) => set("ukuran_ban", e.target.value.slice(0, 40))} placeholder="mis. 175/65 R14" className="h-11" />
        </div>
        <div>
          <Label>Merk Ban</Label>
          <Input disabled={disabled} value={value.merk_ban} onChange={(e) => set("merk_ban", e.target.value.slice(0, 60))} placeholder="mis. Bridgestone Ecopia" className="h-11" />
        </div>
      </div>}

      <div>
        <Label>Services</Label>
        <div className="flex flex-wrap gap-1.5">
          {BAN_SERVICES.map((s) => (
            <button key={s} type="button" disabled={disabled} className={chip(value.services.includes(s))} onClick={() => toggleSvc(s)}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className={`grid grid-cols-1 gap-3 ${mode === "full" ? "md:grid-cols-2" : ""}`}>
        <ConditionBlock title="Kondisi Sebelum" value={value.sebelum} onChange={(v) => set("sebelum", v)} disabled={disabled} />
        {mode === "full" && (
          <ConditionBlock title="Kondisi Sesudah" value={value.sesudah} onChange={(v) => set("sesudah", v)} disabled={disabled} />
        )}
      </div>

      <div className={`grid grid-cols-1 gap-3 ${mode === "full" ? "md:grid-cols-2" : ""}`}>
        <TyreGrid title="Ban Sebelum (mm / psi)" value={value.tyres_sebelum} onChange={(v) => set("tyres_sebelum", v)} disabled={disabled} />
        {mode === "full" && (
          <TyreGrid title="Ban Sesudah (mm / psi)" value={value.tyres_sesudah} onChange={(v) => set("tyres_sesudah", v)} disabled={disabled} />
        )}
      </div>

      {mode === "full" && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Balancing (pcs)</Label>
            <Input disabled={disabled} inputMode="numeric" value={value.balancing_qty} onChange={(e) => set("balancing_qty", e.target.value.replace(/\D/g, "").slice(0, 2))} className="h-11" />
          </div>
          <div>
            <Label>Rotasi (pcs)</Label>
            <Input disabled={disabled} inputMode="numeric" value={value.rotasi_qty} onChange={(e) => set("rotasi_qty", e.target.value.replace(/\D/g, "").slice(0, 2))} className="h-11" />
          </div>
          <div>
            <Label>Waktu Jeda</Label>
            <Input disabled={disabled} value={value.waktu_jeda} onChange={(e) => set("waktu_jeda", e.target.value.slice(0, 20))} placeholder="mis. 15 menit" className="h-11" />
          </div>
          <div>
            <Label>Ket. Jeda</Label>
            <Input disabled={disabled} value={value.waktu_jeda_ket} onChange={(e) => set("waktu_jeda_ket", e.target.value.slice(0, 80))} className="h-11" />
          </div>
        </div>
      )}

      <div>
        <Label>Ban Bekas</Label>
        <div className="flex gap-1.5">
          {[{ v: "bawa", l: "Bawa" }, { v: "tinggal", l: "Tinggal" }].map((o) => (
            <button key={o.v} type="button" disabled={disabled} className={chip(value.ban_bekas === o.v)} onClick={() => set("ban_bekas", value.ban_bekas === o.v ? "" : (o.v as BanData["ban_bekas"]))}>
              {o.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>History (ban lama)</Label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input disabled={disabled} value={value.history_merk} onChange={(e) => set("history_merk", e.target.value.slice(0, 60))} placeholder="Merk/Tipe lama" className="h-11" />
          <Input disabled={disabled} value={value.history_ukuran} onChange={(e) => set("history_ukuran", e.target.value.slice(0, 40))} placeholder="Ukuran lama" className="h-11" />
        </div>
      </div>

      {mode === "full" && (
        <div>
          <Label>Catatan</Label>
          <Textarea disabled={disabled} value={value.catatan} onChange={(e) => set("catatan", e.target.value.slice(0, 1000))} rows={3} className="resize-none" />
        </div>
      )}

      <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-foreground/80">{BAN_FREE_NOTE}</p>
    </div>
  );
}
