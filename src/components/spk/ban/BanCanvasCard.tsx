// Kartu pengerjaan SPK Ban di Canvas — tersimpan otomatis ke data.ban.
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import { emptyBanData, normalizeBanData, type BanData } from "@/lib/spk/banForm";
import { BanFormFields } from "./BanFormFields";

export function BanCanvasCard() {
  const [raw, setRaw, meta] = useBinding<BanData>("ban", emptyBanData());
  const value = normalizeBanData(raw);
  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-3 shadow-xl backdrop-blur-xl sm:p-4 md:p-6">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide">Pengerjaan Ban</h2>
      <BanFormFields value={value} onChange={setRaw} disabled={meta.disabled} hideIdentity />
    </div>
  );
}
