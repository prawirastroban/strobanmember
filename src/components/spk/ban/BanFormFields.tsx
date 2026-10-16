// Isian SPK Ban (dipakai di form intake & Canvas). Controlled: value + onChange.
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  BAN_CONDITION_ROWS,
  BAN_FREE_NOTE,
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
  /** Sembunyikan ukuran/merk ban & waktu jeda (sudah ada di Form Pelanggan Ban). */
  hideIdentity?: boolean;
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

const PAPER_SERVICES = ["Spooring", "Balancing", "Nitrogen", "Rotasi"] as const;

function CondRows({ side, value, onChange, disabled }: { side: string; value: BanCondition; onChange: (v: BanCondition) => void; disabled?: boolean }) {
  return (
    <div className="flex border-b border-border">
      <div className="flex w-6 shrink-0 items-center justify-center bg-muted">
        <span className="-rotate-90 whitespace-nowrap text-[10px] font-semibold text-muted-foreground">{side}</span>
      </div>
      <div className="flex-1 divide-y divide-border">
        {BAN_CONDITION_ROWS.map((row) => (
          <div key={row.key} className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5">
            <span className="text-sm">{row.label}</span>
            <div className="flex gap-1.5">
              {row.options.map((o) => {
                const active = value[row.key] === o.v;
                return (
                  <button key={o.v} type="button" disabled={disabled} className={chip(active)}
                    onClick={() => onChange({ ...value, [row.key]: active ? "" : o.v } as BanCondition)}>
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

function TyreDiagram({ title, value, onChange, disabled }: { title: string; value: Record<BanPosKey, BanTyre>; onChange: (v: Record<BanPosKey, BanTyre>) => void; disabled?: boolean }) {
  const set = (k: BanPosKey, mm: string) => onChange({ ...value, [k]: { ...value[k], mm } });
  const box = (k: BanPosKey, label: string) => (
    <div className="relative">
      <Input disabled={disabled} inputMode="decimal" value={value[k].mm}
        onChange={(e) => set(k, e.target.value.replace(/[^0-9.,]/g, "").slice(0, 6))}
        className="h-9 pr-8 text-sm" placeholder="0" aria-label={`${title} ${label} mm`} />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">mm</span>
    </div>
  );
  return (
    <div className="p-3">
      <p className="mb-1 text-center text-[10px] text-muted-foreground">dpn</p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        {box("fl", "Depan Kiri")}<span className="h-full w-px bg-border" />{box("fr", "Depan Kanan")}
        <span className="text-[10px] text-muted-foreground">kr</span><span className="h-6 w-px justify-self-center bg-border" /><span className="text-right text-[10px] text-muted-foreground">knn</span>
        {box("rl", "Belakang Kiri")}<span className="h-full w-px bg-border" />{box("rr", "Belakang Kanan")}
      </div>
      <p className="mt-1 text-center text-[10px] text-muted-foreground">blkg</p>
      <p className="mt-1 text-center text-xs font-semibold">{title}</p>
    </div>
  );
}

const Head = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-foreground px-3 py-1.5 text-center text-sm font-bold text-background">{children}</div>
);

export function BanFormFields({ value, onChange, mode = "full", disabled, hideIdentity }: Props) {
  const showIdentity = mode === "full" && !hideIdentity;
  const set = <K extends keyof BanData>(k: K, v: BanData[K]) => onChange({ ...value, [k]: v });
  const toggleSvc = (s: string) =>
    set("services", value.services.includes(s) ? value.services.filter((x) => x !== s) : [...value.services, s]);
  const qty = (k: "balancing_qty" | "rotasi_qty", label: string) => (
    <div className="flex flex-col items-center gap-2 p-3">
      <p className="text-xs font-semibold">{label}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Jumlah:
        <Input disabled={disabled} inputMode="numeric" value={value[k]}
          onChange={(e) => set(k, e.target.value.replace(/\D/g, "").slice(0, 2))}
          className="h-8 w-14 text-center text-sm" aria-label={`Jumlah ${label}`} />
        /pcs
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {showIdentity && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label>Ukuran Ban</Label>
            <Input disabled={disabled} value={value.ukuran_ban} onChange={(e) => set("ukuran_ban", e.target.value.slice(0, 40))} className="h-11" />
          </div>
          <div>
            <Label>Merk Ban</Label>
            <Input disabled={disabled} value={value.merk_ban} onChange={(e) => set("merk_ban", e.target.value.slice(0, 60))} className="h-11" />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <Head>Services</Head>
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="border-b border-border md:border-b-0 md:border-r">
            <div className="flex flex-wrap gap-1.5 border-b border-border px-3 py-2">
              {PAPER_SERVICES.map((s) => (
                <button key={s} type="button" disabled={disabled} className={chip(value.services.includes(s))} onClick={() => toggleSvc(s)}>{s}</button>
              ))}
            </div>
            <CondRows side="Sebelum" value={value.sebelum} onChange={(v) => set("sebelum", v)} disabled={disabled} />
            <CondRows side="Sesudah" value={value.sesudah} onChange={(v) => set("sesudah", v)} disabled={disabled} />
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
              <span className="text-sm">Ban Bekas</span>
              <div className="flex gap-1.5">
                {[{ v: "bawa", l: "Bawa" }, { v: "tinggal", l: "Tinggal" }].map((o) => (
                  <button key={o.v} type="button" disabled={disabled} className={chip(value.ban_bekas === o.v)}
                    onClick={() => set("ban_bekas", value.ban_bekas === o.v ? "" : (o.v as BanData["ban_bekas"]))}>{o.l}</button>
                ))}
              </div>
            </div>
            <div className="p-3">
              <p className="mb-1 text-xs italic text-muted-foreground">Catatan:</p>
              <Textarea disabled={disabled} value={value.catatan} onChange={(e) => set("catatan", e.target.value.slice(0, 1000))} rows={4} className="resize-none" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="grid grid-cols-1 border-b border-border sm:grid-cols-2 sm:divide-x sm:divide-border">
              <TyreDiagram title="Sebelum" value={value.tyres_sebelum} onChange={(v) => set("tyres_sebelum", v)} disabled={disabled} />
              <TyreDiagram title="Sesudah" value={value.tyres_sesudah} onChange={(v) => set("tyres_sesudah", v)} disabled={disabled} />
            </div>
            <div className="grid flex-1 grid-cols-2 divide-x divide-border">
              {qty("balancing_qty", "Balancing")}
              {qty("rotasi_qty", "Rotasi")}
            </div>
          </div>
        </div>
      </div>

      {showIdentity && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Waktu Jeda</Label>
            <Input disabled={disabled} value={value.waktu_jeda} onChange={(e) => set("waktu_jeda", e.target.value.slice(0, 20))} className="h-11" />
          </div>
          <div>
            <Label>Ket. Jeda</Label>
            <Input disabled={disabled} value={value.waktu_jeda_ket} onChange={(e) => set("waktu_jeda_ket", e.target.value.slice(0, 80))} className="h-11" />
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border">
        <Head>History</Head>
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:divide-x sm:divide-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="shrink-0 text-sm">Merk/Tipe Lama :</span>
            <Input disabled={disabled} value={value.history_merk} onChange={(e) => set("history_merk", e.target.value.slice(0, 60))} className="h-9" />
          </div>
          <div className="flex items-center gap-2 border-t border-border px-3 py-2 sm:border-t-0">
            <span className="shrink-0 text-sm">Ukuran Lama :</span>
            <Input disabled={disabled} value={value.history_ukuran} onChange={(e) => set("history_ukuran", e.target.value.slice(0, 40))} className="h-9" />
          </div>
        </div>
      </div>

      <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] text-foreground/80">{BAN_FREE_NOTE}</p>
    </div>
  );
}
