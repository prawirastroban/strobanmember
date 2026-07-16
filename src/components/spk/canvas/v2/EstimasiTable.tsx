// SPK Canvas v2 — Estimasi Pergantian Spareparts.
// Terhubung ke Runtime via satu binding kunci "estimasi_items" + diskon.
// Redesign: liquid glass + fully responsive summary grid.
import { Plus, Trash2, Check, X, Wallet, Package, Percent, Receipt } from "lucide-react";
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";

export interface EstimasiItem {
  id: string;
  nama: string;
  qty: number;
  harga: number;
  urgensi: "" | "ok" | "bad";
  approval: "" | "yes" | "no";
}

const formatRp = (n: number) => new Intl.NumberFormat("id-ID").format(Math.max(0, n));
const newId = () => Math.random().toString(36).slice(2, 10);

function emptyItem(): EstimasiItem {
  return { id: newId(), nama: "", qty: 1, harga: 0, urgensi: "", approval: "" };
}

export function EstimasiTable() {
  const [items, setItems] = useBinding<EstimasiItem[]>("estimasi_items", [emptyItem()]);
  const [diskonJasa, setDiskonJasa] = useBinding<number>("estimasi_diskon_jasa", 0);
  const [diskonSp, setDiskonSp] = useBinding<number>("estimasi_diskon_sparepart", 0);

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.harga) || 0), 0);
  const totalItems = items.reduce((s, it) => s + (Number(it.qty) || 0), 0);
  const total = Math.max(0, subtotal - (Number(diskonJasa) || 0) - (Number(diskonSp) || 0));

  const patch = (id: string, next: Partial<EstimasiItem>) =>
    setItems(items.map((it) => (it.id === id ? { ...it, ...next } : it)));

  return (
    <div className="space-y-4">
      {/* Header — glass panel */}
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-br from-primary/15 via-background/40 to-background/60 px-4 py-3 backdrop-blur-xl shadow-[0_8px_30px_-12px_hsl(var(--primary)/0.35)]">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/20 text-primary">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Estimasi</p>
            <h3 className="text-sm font-semibold text-foreground">Pergantian Spareparts</h3>
          </div>
        </div>
      </div>

      {/* Desktop column header */}
      <div className="hidden md:grid grid-cols-12 gap-2 text-muted-foreground font-semibold text-center border-b border-white/10 pb-2 px-2 uppercase text-[10px] tracking-wider">
        <div className="col-span-5 text-left">Nama Barang</div>
        <div className="col-span-1">Qty</div>
        <div className="col-span-2">Harga</div>
        <div className="col-span-2">Urgensi</div>
        <div className="col-span-2">Persetujuan</div>
      </div>

      <div className="flex flex-col gap-3">
        {items.map((it) => (
          <EstimasiRow
            key={it.id}
            item={it}
            onChange={(patchIt) => patch(it.id, patchIt)}
            onRemove={() => setItems(items.filter((x) => x.id !== it.id))}
            canRemove={items.length > 1}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={() => setItems([...items, emptyItem()])}
        className="w-full rounded-xl border border-dashed border-primary/40 bg-primary/10 py-2.5 font-semibold text-primary transition-colors hover:bg-primary/20 flex items-center justify-center gap-2 backdrop-blur-md"
      >
        <Plus className="h-4 w-4" /> Tambah Item
      </button>

      {/* Summary — liquid glass card, responsive grid */}
      <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/5 shadow-xl backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-4 sm:gap-3 sm:p-4">
          <SumTile icon={<Package className="h-3.5 w-3.5" />} label="Produk">
            <span className="text-lg font-bold tabular-nums text-foreground">{totalItems}</span>
            <span className="ml-1 text-[10px] uppercase tracking-wider text-muted-foreground">items</span>
          </SumTile>
          <SumTile icon={<Wallet className="h-3.5 w-3.5" />} label="Sub Total">
            <SumValue value={`Rp ${formatRp(subtotal)}`} />
          </SumTile>
          <SumTile icon={<Percent className="h-3.5 w-3.5" />} label="Diskon Jasa" editable>
            <SumInput value={diskonJasa} onChange={setDiskonJasa} />
          </SumTile>
          <SumTile icon={<Percent className="h-3.5 w-3.5" />} label="Diskon Sparepart" editable>
            <SumInput value={diskonSp} onChange={setDiskonSp} />
          </SumTile>
        </div>

        {/* Total footer */}
        <div className="relative flex flex-col items-start justify-between gap-1 border-t border-white/10 bg-gradient-to-r from-primary/25 via-primary/15 to-primary/25 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-primary/90">
            Total Pembayaran
          </span>
          <div className="text-xl font-black tabular-nums tracking-tight text-foreground sm:text-2xl">
            Rp {formatRp(total)}
          </div>
        </div>
      </div>
    </div>
  );
}

function SumTile({
  icon,
  label,
  editable,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  editable?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-2.5 backdrop-blur-md transition-colors ${
        editable ? "hover:border-primary/40 focus-within:border-primary/60" : ""
      }`}
    >
      <div className="mb-1 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className="text-primary/70">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="flex min-w-0 items-baseline">{children}</div>
    </div>
  );
}

function SumValue({ value }: { value: string }) {
  return (
    <span className="truncate text-sm font-bold tabular-nums text-foreground sm:text-base">
      {value}
    </span>
  );
}

function SumInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex w-full items-baseline gap-1">
      <span className="text-[11px] font-medium text-muted-foreground">Rp</span>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="w-full min-w-0 bg-transparent text-sm font-bold tabular-nums text-foreground outline-none placeholder:text-muted-foreground/40 sm:text-base"
      />
    </div>
  );
}

function EstimasiRow({
  item,
  onChange,
  onRemove,
  canRemove,
}: {
  item: EstimasiItem;
  onChange: (patch: Partial<EstimasiItem>) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="group rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-md shadow-sm transition-colors hover:bg-white/[0.07] md:grid md:grid-cols-12 md:items-center md:gap-2 md:p-2 flex flex-col gap-2">
      {/* Nama */}
      <div className="md:col-span-5">
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">
          Nama Barang
        </label>
        <input
          type="text"
          value={item.nama}
          onChange={(e) => onChange({ nama: e.target.value })}
          placeholder="Nama sparepart…"
          className="w-full rounded-lg border border-white/10 bg-background/40 px-2.5 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
        />
      </div>
      {/* Qty */}
      <div className="flex items-center justify-between md:col-span-1 md:block">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">Qty</label>
        <input
          type="number"
          min={1}
          value={item.qty}
          onChange={(e) => onChange({ qty: Number(e.target.value) || 0 })}
          className="w-20 rounded-lg border border-white/10 bg-background/40 px-2 py-2 text-center text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 md:w-full"
        />
      </div>
      {/* Harga */}
      <div className="flex items-center justify-between md:col-span-2 md:block">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">Harga</label>
        <div className="relative w-full max-w-[200px] md:max-w-none">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">Rp</span>
          <input
            type="number"
            min={0}
            value={item.harga || ""}
            onChange={(e) => onChange({ harga: Number(e.target.value) || 0 })}
            placeholder="0"
            className="w-full rounded-lg border border-white/10 bg-background/40 py-2 pl-7 pr-2 text-right text-sm text-foreground outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40"
          />
        </div>
      </div>
      {/* Urgensi */}
      <div className="flex items-center justify-between md:col-span-2 md:justify-center">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">Urgensi</label>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ urgensi: "ok" })}
            className={`h-8 w-12 rounded-lg text-[11px] font-bold transition-all ${
              item.urgensi === "ok"
                ? "bg-amber-400/25 text-amber-200 ring-1 ring-amber-400/50 shadow-[0_0_12px_-2px_rgba(251,191,36,0.5)]"
                : "bg-white/5 text-muted-foreground hover:bg-amber-400/10 hover:text-amber-200"
            }`}
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => onChange({ urgensi: "bad" })}
            className={`h-8 w-12 rounded-lg text-[11px] font-bold transition-all ${
              item.urgensi === "bad"
                ? "bg-destructive/25 text-destructive ring-1 ring-destructive/50 shadow-[0_0_12px_-2px_hsl(var(--destructive)/0.5)]"
                : "bg-white/5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            }`}
          >
            BAD
          </button>
        </div>
      </div>
      {/* Persetujuan + remove */}
      <div className="flex items-center justify-between md:col-span-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:hidden">Persetujuan</label>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange({ approval: "yes" })}
            className={`grid h-8 w-10 place-items-center rounded-lg transition-all ${
              item.approval === "yes"
                ? "bg-emerald-500/25 text-emerald-300 ring-1 ring-emerald-400/50 shadow-[0_0_12px_-2px_rgba(52,211,153,0.5)]"
                : "bg-white/5 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-300"
            }`}
            aria-label="Setujui"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange({ approval: "no" })}
            className={`grid h-8 w-10 place-items-center rounded-lg transition-all ${
              item.approval === "no"
                ? "bg-destructive/25 text-destructive ring-1 ring-destructive/50 shadow-[0_0_12px_-2px_hsl(var(--destructive)/0.5)]"
                : "bg-white/5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            }`}
            aria-label="Tolak"
          >
            <X className="h-4 w-4" />
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Hapus item"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}