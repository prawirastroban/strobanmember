import { useState } from "react";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { parseTireExcel, type ImportRow } from "@/lib/pricelistImport";
import type { PricelistItem } from "@/lib/pricelistSearch";

interface Props { open: boolean; onOpenChange: (o: boolean) => void; current: PricelistItem[]; onDone: () => void }

export function PricelistImportDialog({ open, onOpenChange, current, onDone }: Props) {
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => { setRows(null); setErrors([]); setFileName(""); };

  const onFile = async (f?: File) => {
    if (!f) return;
    setFileName(f.name);
    try {
      const res = await parseTireExcel(f);
      setRows(res.rows); setErrors(res.errors);
    } catch {
      setRows([]); setErrors(["File tidak bisa dibaca. Pastikan format .xlsx"]);
    }
  };

  const currentMap = new Map(current.map((c) => [`${c.brand}|${c.pattern}|${c.size}`.toLowerCase(), c.price_retail]));
  const changed = rows?.filter((r) => {
    const p = currentMap.get(`${r.brand}|${r.pattern}|${r.size}`.toLowerCase());
    return p !== undefined && Number(p) !== r.price_retail;
  }).length ?? 0;
  const added = rows?.filter((r) => !currentMap.has(`${r.brand}|${r.pattern}|${r.size}`.toLowerCase())).length ?? 0;

  const save = async () => {
    if (!rows?.length) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("replace_pricelist", { _category: "ban", _rows: rows as never });
    setBusy(false);
    if (error) { toast.error("Import gagal", { description: error.message }); return; }
    toast.success(`${data} harga ban berhasil diperbarui`);
    reset(); onOpenChange(false); onDone();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Import Pricelist Ban</DialogTitle>
          <DialogDescription>
            Gunakan format Excel sheet <b>BAN</b>: BRAND, TYPE, KATEGORI, PATTERN, RIM, SIZE, GROSIR, EXTERNAL, HEB, RETAIL, VEHICLE MODEL. Seluruh daftar ban akan diganti isi file.
          </DialogDescription>
        </DialogHeader>
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed border-border p-6 text-center hover:bg-muted/40">
          <FileSpreadsheet className="h-8 w-8 text-primary" />
          <span className="text-sm font-medium">{fileName || "Pilih file .xlsx"}</span>
          <input type="file" accept=".xlsx,.xls" className="hidden" data-testid="pricelist-file" onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
        {rows && (
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-muted p-2"><div className="text-lg font-bold">{rows.length}</div>Total baris</div>
            <div className="rounded-lg bg-muted p-2"><div className="text-lg font-bold">{added}</div>Baru</div>
            <div className="rounded-lg bg-muted p-2"><div className="text-lg font-bold">{changed}</div>Harga berubah</div>
          </div>
        )}
        {errors.length > 0 && (
          <div className="max-h-28 overflow-auto rounded-lg bg-destructive/10 p-2 text-xs text-destructive">
            {errors.slice(0, 20).map((e) => <div key={e}>{e}</div>)}
            {errors.length > 20 && <div>+{errors.length - 20} lainnya</div>}
          </div>
        )}
        <DialogFooter>
          <Button onClick={save} disabled={!rows?.length || busy} className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Simpan {rows?.length ? `${rows.length} baris` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
