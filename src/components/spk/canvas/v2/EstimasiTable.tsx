// SPK Canvas v2 — Estimasi Pergantian Spareparts.
// Terhubung ke Runtime via satu binding kunci "estimasi_items" + diskon.
import { Plus, Trash2, Check, X } from "lucide-react";
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
      <div className="bg-[color:#ff0000] text-white font-bold text-center py-3 text-lg uppercase tracking-wide rounded shadow-sm">
        Estimasi Pergantian Spareparts
      </div>

      <div className="hidden md:grid grid-cols-12 gap-2 text-[color:#ff0000] font-bold text-center border-b-2 border-[color:#ff0000] pb-2 px-2 uppercase text-xs">
        <div className="col-span-5 text-left">Nama Barang</div>
        <div className="col-span-1 border-l border-[color:#ff0000]">Qty</div>
        <div className="col-span-2 border-l border-[color:#ff0000]">Harga</div>
        <div className="col-span-2 border-l border-[color:#ff0000]">Urgensi</div>
        <div className="col-span-2 border-l border-[color:#ff0000]">Persetujuan</div>
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
        className="w-full bg-red-100 hover:bg-red-200 text-[color:#ff0000] font-bold py-2 rounded transition-colors flex items-center justify-center gap-2 border border-red-200"
      >
        <Plus className="h-4 w-4" /> Tambah Item
      </button>

      {/* Summary */}
      <div className="flex justify-end pt-4">
        <div className="w-full md:w-1/2 lg:w-2/5 border-2 border-[color:#ff0000] rounded-lg overflow-hidden bg-white shadow-md">
          <div className="p-4 flex flex-col gap-3">
            <SumRow label="Product">
              <span className="font-mono bg-gray-100 px-2 py-1 rounded min-w-[30px] text-center">
                {totalItems}
              </span>
              <span>Items</span>
            </SumRow>
            <SumRow label="Sub Total">
              <span>Rp</span>
              <span className="font-mono border-b border-[color:#ff0000] min-w-[100px] text-right inline-block">
                {formatRp(subtotal)}
              </span>
            </SumRow>
            <SumRow label="Diskon Jasa">
              <span>Rp</span>
              <input
                type="number"
                value={diskonJasa || ""}
                onChange={(e) => setDiskonJasa(Number(e.target.value) || 0)}
                className="font-mono border-b border-[color:#ff0000] min-w-[100px] text-right bg-transparent outline-none focus:bg-gray-50"
                placeholder="0"
              />
            </SumRow>
            <SumRow label="Diskon Spareparts">
              <span>Rp</span>
              <input
                type="number"
                value={diskonSp || ""}
                onChange={(e) => setDiskonSp(Number(e.target.value) || 0)}
                className="font-mono border-b border-[color:#ff0000] min-w-[100px] text-right bg-transparent outline-none focus:bg-gray-50"
                placeholder="0"
              />
            </SumRow>
          </div>
          <div className="bg-[color:#ff0000] text-white p-4 flex justify-between items-center">
            <span className="font-bold text-lg">TOTAL PAYMENTS</span>
            <div className="font-bold text-xl tracking-wider">Rp {formatRp(total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SumRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-[color:#ff0000] text-sm">
      <span>{label}</span>
      <div className="flex items-center gap-2">{children}</div>
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
    <div className="bg-white border md:border-none border-gray-200 p-3 md:p-0 rounded md:rounded-none shadow-sm md:shadow-none flex flex-col md:grid md:grid-cols-12 gap-2 md:items-center md:px-2 md:py-1">
      <div className="col-span-5 md:pr-2">
        <label className="md:hidden text-xs font-bold text-[color:#ff0000] mb-1 block">
          Nama Barang
        </label>
        <input
          type="text"
          value={item.nama}
          onChange={(e) => onChange({ nama: e.target.value })}
          placeholder="Masukkan nama sparepart..."
          className="w-full bg-gray-100 border-none p-2 rounded text-sm outline-none focus:ring-1 focus:ring-[color:#ff0000]"
        />
      </div>
      <div className="col-span-1 md:border-l md:border-[color:#ffe6e6] md:px-2 flex md:block items-center justify-between">
        <label className="md:hidden text-xs font-bold text-[color:#ff0000]">Qty</label>
        <input
          type="number"
          min={1}
          value={item.qty}
          onChange={(e) => onChange({ qty: Number(e.target.value) || 0 })}
          className="w-20 md:w-full bg-gray-100 border-none p-2 rounded text-sm text-center outline-none focus:ring-1 focus:ring-[color:#ff0000]"
        />
      </div>
      <div className="col-span-2 md:border-l md:border-[color:#ffe6e6] md:px-2 flex md:block items-center justify-between">
        <label className="md:hidden text-xs font-bold text-[color:#ff0000]">Harga</label>
        <div className="relative w-full max-w-[180px] md:max-w-none">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs">Rp</span>
          <input
            type="number"
            min={0}
            value={item.harga || ""}
            onChange={(e) => onChange({ harga: Number(e.target.value) || 0 })}
            placeholder="0"
            className="w-full bg-gray-100 border-none p-2 pl-8 rounded text-sm text-right outline-none focus:ring-1 focus:ring-[color:#ff0000]"
          />
        </div>
      </div>
      <div className="col-span-2 md:border-l md:border-[color:#ffe6e6] md:px-2 flex justify-between items-center md:justify-center">
        <label className="md:hidden text-xs font-bold text-[color:#ff0000]">Urgensi</label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ urgensi: "ok" })}
            className={`w-12 h-8 rounded font-bold text-xs transition-colors ${
              item.urgensi === "ok"
                ? "bg-[color:#ffcc00] text-black"
                : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
            }`}
          >
            OK
          </button>
          <button
            type="button"
            onClick={() => onChange({ urgensi: "bad" })}
            className={`w-12 h-8 rounded font-bold text-xs transition-colors ${
              item.urgensi === "bad"
                ? "bg-[color:#b34700] text-white"
                : "bg-orange-100 text-orange-800 hover:bg-orange-200"
            }`}
          >
            BAD
          </button>
        </div>
      </div>
      <div className="col-span-2 md:border-l md:border-[color:#ffe6e6] md:px-2 flex justify-between items-center md:justify-between">
        <label className="md:hidden text-xs font-bold text-[color:#ff0000]">Persetujuan</label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ approval: "yes" })}
            className={`w-10 h-8 rounded font-bold flex items-center justify-center transition-colors ${
              item.approval === "yes"
                ? "bg-[color:#00cc00] text-white"
                : "bg-green-100 text-green-700 hover:bg-green-200"
            }`}
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange({ approval: "no" })}
            className={`w-10 h-8 rounded font-bold flex items-center justify-center transition-colors ${
              item.approval === "no"
                ? "bg-[color:#cc3300] text-white"
                : "bg-red-100 text-red-700 hover:bg-red-200"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 transition-colors ml-2"
            aria-label="Hapus item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}