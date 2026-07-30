// SPK Canvas v2 — Estimasi Pergantian Spareparts (runtime-bound wrapper).
// UI-nya berasal dari <EstimasiEditor /> yang juga dipakai oleh dialog Estimasi
// pada card booking, sehingga kedua tempat selalu identik dan tersinkron.
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import { EstimasiEditor, emptyEstimasiItem, type EstimasiItem } from "./EstimasiEditor";

export type { EstimasiItem };

export function EstimasiTable() {
  const [items, setItems] = useBinding<EstimasiItem[]>("estimasi_items", [emptyEstimasiItem()]);
  const [diskonJasa, setDiskonJasa] = useBinding<number>("estimasi_diskon_jasa", 0);
  const [diskonSp, setDiskonSp] = useBinding<number>("estimasi_diskon_sparepart", 0);

  return (
    <EstimasiEditor
      items={items}
      diskonJasa={diskonJasa}
      diskonSparepart={diskonSp}
      onItemsChange={setItems}
      onDiskonJasaChange={setDiskonJasa}
      onDiskonSparepartChange={setDiskonSp}
    />
  );
}
