// Kartu "Form Pelanggan Ban" di Canvas — susunan mengikuti kertas SPK Ban.
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useBinding } from "@/hooks/spk/FormRuntimeProvider";
import { emptyBanData, normalizeBanData, type BanData } from "@/lib/spk/banForm";

function Row({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </p>
      {children}
    </div>
  );
}

export function BanCustomerCanvasCard() {
  const [name, setName, nm] = useBinding<string>("customer_name", "");
  const [phone, setPhone] = useBinding<string>("customer_phone", "");
  const [plate, setPlate] = useBinding<string>("vehicle_plate", "");
  const [merk, setMerk] = useBinding<string>("vehicle_merk", "");
  const [tipe, setTipe] = useBinding<string>("vehicle_tipe", "");
  const [tahun, setTahun] = useBinding<string>("vehicle_tahun", "");
  const [rawBan, setRawBan, banMeta] = useBinding<BanData>("ban", emptyBanData());
  const ban = normalizeBanData(rawBan);
  const disabled = nm.disabled || banMeta.disabled;
  const setB = <K extends keyof BanData>(k: K, v: BanData[K]) => setRawBan({ ...ban, [k]: v });

  const joined = [merk, tipe].filter(Boolean).join(" ");
  const [mobil, setMobil] = useState(joined);
  useEffect(() => {
    if (joined.replace(/\s+/g, " ").trim() !== mobil.replace(/\s+/g, " ").trim()) setMobil(joined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined]);
  const onMobil = (raw: string) => {
    const v = raw.slice(0, 120);
    setMobil(v);
    const parts = v.trim().split(/\s+/).filter(Boolean);
    setMerk(parts[0] ?? "");
    setTipe(parts.slice(1).join(" "));
  };

  return (
    <section id="sec-customer" className="rounded-2xl border border-border bg-card/60 p-3 sm:p-4 md:p-6 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide">Form Pelanggan Ban</h2>
        <div className="w-40">
          <p className="text-xs font-medium mb-1.5">Tanggal</p>
          <Input type="date" disabled={disabled} value={ban.tanggal} onChange={(e) => setB("tanggal", e.target.value)} className="h-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-3">
          <Row label="Nama" required><Input disabled={disabled} value={name} onChange={(e) => setName(e.target.value.slice(0, 120))} className="h-11" /></Row>
          <Row label="No. HP" required><Input disabled={disabled} inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value.slice(0, 20))} className="h-11" /></Row>
          <Row label="Alamat"><Input disabled={disabled} value={ban.alamat} onChange={(e) => setB("alamat", e.target.value.slice(0, 200))} className="h-11" /></Row>
          <Row label="No Plat" required><Input disabled={disabled} value={plate} onChange={(e) => setPlate(e.target.value.toUpperCase().slice(0, 15))} className="h-11 font-mono uppercase tracking-wider" /></Row>
        </div>
        <div className="space-y-3">
          <Row label="Merk/Tipe Mobil" required><Input disabled={disabled} value={mobil} onChange={(e) => onMobil(e.target.value)} className="h-11" /></Row>
          <Row label="Tahun Mobil"><Input disabled={disabled} inputMode="numeric" value={tahun} onChange={(e) => setTahun(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-11" /></Row>
          <Row label="Ukuran Ban"><Input disabled={disabled} value={ban.ukuran_ban} onChange={(e) => setB("ukuran_ban", e.target.value.slice(0, 40))} className="h-11" /></Row>
          <Row label="Merk Ban"><Input disabled={disabled} value={ban.merk_ban} onChange={(e) => setB("merk_ban", e.target.value.slice(0, 60))} className="h-11" /></Row>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Row label="Waktu Masuk"><Input type="time" disabled={disabled} value={ban.waktu_masuk} onChange={(e) => setB("waktu_masuk", e.target.value)} className="h-10" /></Row>
        <Row label="Waktu Mulai"><Input type="time" disabled={disabled} value={ban.waktu_mulai} onChange={(e) => setB("waktu_mulai", e.target.value)} className="h-10" /></Row>
        <Row label="Waktu Selesai"><Input type="time" disabled={disabled} value={ban.waktu_selesai} onChange={(e) => setB("waktu_selesai", e.target.value)} className="h-10" /></Row>
        <Row label="Waktu Jeda"><Input disabled={disabled} value={ban.waktu_jeda} onChange={(e) => setB("waktu_jeda", e.target.value.slice(0, 20))} className="h-10" /></Row>
        <Row label="Ket."><Input disabled={disabled} value={ban.waktu_jeda_ket} onChange={(e) => setB("waktu_jeda_ket", e.target.value.slice(0, 80))} className="h-10" /></Row>
      </div>
    </section>
  );
}
