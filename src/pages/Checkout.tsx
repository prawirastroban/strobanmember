import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, INSTALLATION_FEE_PER_TIRE } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Trash2, Plus, Minus, MapPin, Wrench, Package, Calendar as CalIcon, Clock, ShieldCheck, ClipboardList, Info, Sparkles, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Navbar from "@/components/Navbar";

// Lightweight info popover trigger — Apple-style "(i)"
const InfoDot = ({ children, label = "Info" }: { children: React.ReactNode; label?: string }) => (
  <Popover>
    <PopoverTrigger asChild>
      <button
        type="button"
        aria-label={label}
        className="inline-flex items-center justify-center h-5 w-5 rounded-full text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors"
      >
        <Info className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </PopoverTrigger>
    <PopoverContent side="top" align="center" className="w-64 text-[12px] leading-relaxed rounded-2xl border-border/60 shadow-xl">
      {children}
    </PopoverContent>
  </Popover>
);

const BRANCHES = ["Bandung - Stroban Pusat", "Tasikmalaya", "Cirebon", "Yogyakarta"];
const TIME_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

const loadSnap = (clientKey: string) => new Promise<void>((resolve, reject) => {
  if (window.snap) return resolve();
  const s = document.createElement("script");
  s.src = "https://app.sandbox.midtrans.com/snap/snap.js";
  s.setAttribute("data-client-key", clientKey);
  s.onload = () => resolve();
  s.onerror = () => reject(new Error("Snap load failed"));
  document.body.appendChild(s);
});

const Checkout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    tireItems, serviceItems, hasService, hasTire,
    tireSubtotal, serviceSubtotal, tireCount, serviceCount,
    updateQty, removeItem, clear,
  } = useCart();

  // When there's a service, fulfillment is forced to installation (sama jadwal)
  const [tireFulfillment, setTireFulfillment] = useState<"pickup" | "installation">("installation");
  const effectiveFulfillment = hasService ? "installation" : tireFulfillment;
  const needSchedule = hasService || (hasTire && effectiveFulfillment === "installation");
  const needVehicle = hasService || (hasTire && effectiveFulfillment === "installation");

  const [branch, setBranch] = useState(BRANCHES[0]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; brand: string; model: string; license_plate: string }>>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>();
  const [scheduleTime, setScheduleTime] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("full_name, phone").eq("id", user.id).maybeSingle();
      if (profile?.full_name) setName(profile.full_name);
      if (profile?.phone) setPhone(profile.phone);
      const { data: vs } = await supabase.from("vehicles").select("id, brand, model, license_plate").eq("user_id", user.id).order("is_default", { ascending: false });
      setVehicles(vs || []);
      if (vs && vs.length && !vehicleId) setVehicleId(vs[0].id);
    })();
  }, [user, vehicleId]);

  const totalDuration = useMemo(
    () => serviceItems.reduce((s, x) => s + (x.duration || 0), 0),
    [serviceItems]
  );

  const installationFee = useMemo(
    () => effectiveFulfillment === "installation" ? tireCount * INSTALLATION_FEE_PER_TIRE : 0,
    [effectiveFulfillment, tireCount]
  );
  const total = tireSubtotal + serviceSubtotal + installationFee;
  const isEmpty = !hasService && !hasTire;

  const canCheckout = useMemo(() => {
    if (isEmpty) return false;
    if (!name || !email || !phone || !branch) return false;
    if (needVehicle && !vehicleId) return false;
    if (needSchedule && (!scheduleDate || !scheduleTime)) return false;
    return true;
  }, [isEmpty, name, email, phone, branch, needVehicle, vehicleId, needSchedule, scheduleDate, scheduleTime]);

  const handleCheckout = async () => {
    if (!user) { toast({ title: "Login dulu", variant: "destructive" }); return; }
    if (!canCheckout) { toast({ title: "Lengkapi data dulu", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      const { data: snapRes, error: snapErr } = await supabase.functions.invoke("midtrans-create-cart-checkout", {
        body: {
          services: serviceItems.map(s => ({
            service_id: s.service_id, name: s.name, category: s.category,
            duration: s.duration, unit_price: s.unit_price,
          })),
          tires: tireItems.map(t => ({
            tire_id: t.tire_id, brand: t.brand, type: t.type, size: t.size,
            quantity: t.quantity, unit_price: t.unit_price,
          })),
          customer: { name, email, phone },
          branch,
          vehicle_id: needVehicle ? vehicleId : null,
          car_type: vehicle ? `${vehicle.brand} ${vehicle.model}` : null,
          car_plate_number: vehicle?.license_plate ?? null,
          schedule_date: needSchedule && scheduleDate ? format(scheduleDate, "yyyy-MM-dd") : null,
          schedule_time: needSchedule ? scheduleTime || null : null,
          tire_fulfillment: effectiveFulfillment,
          notes: notes || null,
        },
      });
      if (snapErr || !snapRes?.snap_token) {
        toast({
          title: "Gagal mulai pembayaran",
          description: snapErr?.message || snapRes?.error || "Coba lagi",
          variant: "destructive",
        });
        return;
      }
      await loadSnap(snapRes.client_key);
      window.snap!.pay(snapRes.snap_token, {
        onSuccess: () => {
          clear();
          toast({
            title: "Pembayaran berhasil 🎉",
            description: "Pesanan diteruskan ke staff untuk pengecekan stok & persiapan.",
          });
          navigate("/my-booking");
        },
        onPending: () => {
          clear();
          toast({
            title: "Menunggu pembayaran",
            description: "Pesanan akan diproses staff setelah pembayaran terkonfirmasi.",
          });
          navigate("/my-booking");
        },
        onError: () => { toast({ title: "Pembayaran gagal", variant: "destructive" }); },
        onClose: () => { toast({ title: "Pembayaran ditutup" }); },
      });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
      setConfirmOpen(false);
    }
  };

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center space-y-4 max-w-md">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Keranjang kosong</h2>
          <p className="text-muted-foreground">Tambahkan layanan service atau ban dari beranda.</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => navigate("/")}>Lihat Layanan</Button>
            <Button variant="outline" onClick={() => navigate("/")}>Lihat Ban</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <Navbar />

      <main className="container mx-auto px-4 pt-6 pb-4 space-y-4 max-w-2xl">
        {/* Page header — Apple-style */}
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight leading-none">Checkout</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Periksa pesanan & lanjutkan ke pembayaran.</p>
        </div>

        {/* Service items */}
        {hasService && (
          <Card className="p-4 space-y-3 rounded-2xl border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight flex items-center gap-2 text-[15px]"><Wrench className="h-4 w-4 text-primary" /> Layanan Service <span className="text-muted-foreground font-normal">({serviceCount})</span></h2>
              <InfoDot label="Tentang layanan service">
                <p className="font-medium text-foreground mb-1">Layanan Service</p>
                <p className="text-muted-foreground">Dikerjakan teknisi di cabang sesuai jadwal yang Anda pilih. Total durasi adalah estimasi pengerjaan semua layanan.</p>
              </InfoDot>
            </div>
            {serviceItems.map(s => (
              <div key={s.id} className="flex gap-3 items-center border-t border-border/60 pt-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 shrink-0 flex items-center justify-center">
                  <Wrench className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{s.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {s.duration} mnt
                  </p>
                  <p className="text-sm font-semibold text-primary tabular-nums">{formatIDR(s.unit_price)}</p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {serviceCount > 1 && (
              <p className="text-xs text-muted-foreground border-t border-border/60 pt-2">
                Total estimasi durasi: <span className="font-semibold text-foreground">{totalDuration} menit</span> — semua di jadwal yang sama.
              </p>
            )}
          </Card>
        )}

        {/* Tire items */}
        {hasTire && (
          <Card className="p-4 space-y-3 rounded-2xl border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight flex items-center gap-2 text-[15px]"><Package className="h-4 w-4 text-primary" /> Pesanan Ban <span className="text-muted-foreground font-normal">({tireCount})</span></h2>
              <InfoDot label="Tentang pesanan ban">
                <p className="font-medium text-foreground mb-1">Pesanan Ban</p>
                <p className="text-muted-foreground">Stok akan diverifikasi staff setelah pembayaran. Anda bisa pasang langsung di bengkel atau ambil sendiri (jika tanpa service).</p>
              </InfoDot>
            </div>
            {tireItems.map(it => (
              <div key={it.id} className="flex gap-3 items-center border-t border-border/60 pt-3">
                <div className="w-14 h-14 rounded-xl bg-muted shrink-0 overflow-hidden">
                  {it.image_url && <img src={it.image_url} alt={it.brand} className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{it.brand} {it.type}</p>
                  <p className="text-xs text-muted-foreground">{it.size}</p>
                  <p className="text-sm font-semibold text-primary tabular-nums">{formatIDR(it.unit_price)}</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(it.id, it.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                  <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQty(it.id, it.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(it.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))}
          </Card>
        )}

        {/* Tire fulfillment — only when tire-only */}
        {hasTire && !hasService && (
          <Card className="p-4 space-y-3 rounded-2xl border-border/60 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight text-[15px]">Metode Pengambilan Ban</h2>
              <InfoDot label="Detail metode">
                <p className="font-medium text-foreground mb-1">Pasang vs Ambil</p>
                <p className="text-muted-foreground">Pasang langsung mencakup jasa pasang & balancing per ban ({formatIDR(INSTALLATION_FEE_PER_TIRE)}). Ambil sendiri tidak ada biaya tambahan, namun pemasangan dilakukan terpisah.</p>
              </InfoDot>
            </div>
            <RadioGroup value={tireFulfillment} onValueChange={(v) => setTireFulfillment(v as "pickup" | "installation")}>
              <label className="flex items-start gap-3 p-3 border border-border/60 rounded-xl cursor-pointer hover:bg-accent transition-colors">
                <RadioGroupItem value="installation" className="mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-2"><Wrench className="h-4 w-4" /> Pasang langsung di bengkel</p>
                  <p className="text-xs text-muted-foreground">+ {formatIDR(INSTALLATION_FEE_PER_TIRE)}/ban (jasa pasang & balancing)</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border border-border/60 rounded-xl cursor-pointer hover:bg-accent transition-colors">
                <RadioGroupItem value="pickup" className="mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Ambil sendiri di cabang</p>
                  <p className="text-xs text-muted-foreground">Tanpa biaya pemasangan</p>
                </div>
              </label>
            </RadioGroup>
          </Card>
        )}

        {hasService && hasTire && (
          <div className="flex items-start gap-2 rounded-2xl bg-primary/5 border border-primary/20 p-3 text-[12px] text-foreground">
            <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
            <p>Karena ada layanan service, ban otomatis dipasang di cabang & jadwal yang sama <span className="text-muted-foreground">(+{formatIDR(INSTALLATION_FEE_PER_TIRE)}/ban biaya pasang).</span></p>
          </div>
        )}

        {/* Branch */}
        <Card className="p-4 space-y-3 rounded-2xl border-border/60 shadow-sm">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2 text-[15px] font-semibold tracking-tight"><MapPin className="h-4 w-4 text-primary" /> Cabang</Label>
            <InfoDot label="Tentang cabang">
              <p className="font-medium text-foreground mb-1">Pilih Cabang</p>
              <p className="text-muted-foreground">Pesanan akan diproses oleh staff cabang yang dipilih. Pastikan cabang sesuai dengan lokasi Anda untuk pengerjaan & pemasangan.</p>
            </InfoDot>
          </div>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="rounded-xl h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>

        {/* Vehicle + Schedule */}
        {(needVehicle || needSchedule) && (
          <Card className="p-4 space-y-3 rounded-2xl border-border/60 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold tracking-tight text-[15px]">Detail {hasService ? "Service" : "Pemasangan"}</h2>
              <InfoDot label="Detail jadwal">
                <p className="font-medium text-foreground mb-1">Jadwal & Kendaraan</p>
                <p className="text-muted-foreground">Pilih kendaraan agar staff bisa menyiapkan suku cadang & ban yang sesuai. Tanggal & jam menentukan slot teknisi di cabang.</p>
              </InfoDot>
            </div>
            {needVehicle && (
              <div>
                <Label className="text-xs text-muted-foreground">Kendaraan</Label>
                {vehicles.length > 0 ? (
                  <Select value={vehicleId} onValueChange={setVehicleId}>
                    <SelectTrigger className="rounded-xl h-11 mt-1"><SelectValue placeholder="Pilih kendaraan" /></SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} - {v.license_plate}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Belum ada kendaraan. <button onClick={() => navigate("/my-vehicles")} className="text-primary underline">Tambah dulu</button></p>
                )}
              </div>
            )}
            {needSchedule && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Tanggal</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start font-normal rounded-xl h-11 mt-1">
                        <CalIcon className="h-4 w-4 mr-2" />
                        {scheduleDate ? format(scheduleDate, "dd MMM yyyy") : "Pilih"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate}
                        disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))}
                        className={cn("p-3 pointer-events-auto")} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Jam</Label>
                  <Select value={scheduleTime} onValueChange={setScheduleTime}>
                    <SelectTrigger className="rounded-xl h-11 mt-1"><SelectValue placeholder="Pilih jam" /></SelectTrigger>
                    <SelectContent>
                      {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Customer info */}
        <Card className="p-4 space-y-3 rounded-2xl border-border/60 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold tracking-tight text-[15px]">Data Customer</h2>
            <InfoDot label="Tentang data customer">
              <p className="font-medium text-foreground mb-1">Data Kontak</p>
              <p className="text-muted-foreground">Digunakan untuk konfirmasi pesanan & notifikasi status pengerjaan. Pastikan nomor WhatsApp aktif.</p>
            </InfoDot>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Nama</Label>
            <Input className="rounded-xl h-11 mt-1" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input className="rounded-xl h-11 mt-1" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Telepon</Label>
              <Input className="rounded-xl h-11 mt-1" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Catatan (opsional)</Label>
            <Textarea className="rounded-xl mt-1" value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-4 space-y-2.5 rounded-2xl border-border/60 shadow-sm bg-gradient-to-b from-card to-muted/20">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold tracking-tight text-[15px]">Ringkasan Pembayaran</h2>
            <InfoDot label="Rincian biaya">
              <p className="font-medium text-foreground mb-1">Rincian Biaya</p>
              <p className="text-muted-foreground">Biaya pasang ban hanya berlaku jika ban dipasang di bengkel. Pajak & biaya tambahan (jika ada) dihitung di gateway pembayaran.</p>
            </InfoDot>
          </div>
          {hasService && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Service ({serviceCount})</span>
              <span className="tabular-nums">{formatIDR(serviceSubtotal)}</span>
            </div>
          )}
          {hasTire && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Ban ({tireCount})</span>
              <span className="tabular-nums">{formatIDR(tireSubtotal)}</span>
            </div>
          )}
          {(installationFee > 0 || effectiveFulfillment === "installation") && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                Biaya pasang ban
                <InfoDot label="Detail biaya pasang">
                  <p className="font-medium text-foreground mb-1">Biaya Pemasangan</p>
                  <p className="text-muted-foreground">{formatIDR(INSTALLATION_FEE_PER_TIRE)}/ban — termasuk jasa pasang, balancing & pengecekan tekanan angin.</p>
                </InfoDot>
              </span>
              <span className="tabular-nums">{installationFee ? formatIDR(installationFee) : "-"}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-[17px] pt-2.5 border-t border-border/60 tracking-tight">
            <span>Total</span>
            <span className="text-primary tabular-nums">{formatIDR(total)}</span>
          </div>
        </Card>
      </main>

      <div className="fixed left-0 right-0 z-[60] bg-background/90 backdrop-blur-xl border-t border-border/60 px-3 py-2 safe-area-bottom bottom-20 md:bottom-4 md:max-w-2xl md:left-1/2 md:-translate-x-1/2 md:rounded-2xl md:border md:shadow-2xl">
        <div className="flex items-center gap-2.5">
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-muted-foreground leading-none">
              {hasService && hasTire ? "Service + Ban" : hasService ? "Service" : "Ban"} · {serviceCount + tireCount} item
            </span>
            <span className="text-[14px] font-semibold tabular-nums tracking-tight leading-tight mt-0.5">{formatIDR(total)}</span>
          </div>
          <Button
            className="ml-auto h-9 px-4 text-[12.5px] font-semibold rounded-full shadow-md shadow-primary/20"
            onClick={() => setConfirmOpen(true)}
            disabled={!canCheckout || submitting}
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" strokeWidth={2} />
            {submitting ? "Memproses..." : "Bayar"}
          </Button>
        </div>
        {!canCheckout && !isEmpty && (
          <p className="text-[10px] text-muted-foreground text-center mt-1.5">
            Lengkapi data customer{needVehicle ? ", kendaraan" : ""}{needSchedule ? ", & jadwal" : ""} dulu.
          </p>
        )}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <AlertDialogContent className="max-w-md rounded-3xl">
          <AlertDialogHeader>
            <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-primary" strokeWidth={1.75} />
            </div>
            <AlertDialogTitle className="text-center text-xl tracking-tight">
              Konfirmasi Pesanan
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-[13px]">
              Pesanan Anda akan dikirim ke staff untuk pengecekan stok &amp; persiapan sebelum jadwal.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-2 text-[13px]">
              {hasService && (
                <div className="flex justify-between"><span className="text-muted-foreground">Service</span><span className="font-medium">{serviceCount} item</span></div>
              )}
              {hasTire && (
                <div className="flex justify-between"><span className="text-muted-foreground">Ban</span><span className="font-medium">{tireCount} pcs</span></div>
              )}
              <div className="flex justify-between"><span className="text-muted-foreground">Cabang</span><span className="font-medium text-right">{branch}</span></div>
              {needSchedule && scheduleDate && (
                <div className="flex justify-between"><span className="text-muted-foreground">Jadwal</span><span className="font-medium">{format(scheduleDate, "dd MMM yyyy")} · {scheduleTime}</span></div>
              )}
              <div className="flex justify-between pt-2 border-t border-border/60">
                <span className="font-semibold">Total Bayar</span>
                <span className="font-semibold text-primary tabular-nums">{formatIDR(total)}</span>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-3 text-[12px] text-foreground">
              <ClipboardList className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
              <p>
                Setelah pembayaran berhasil, pesanan otomatis masuk ke <span className="font-semibold">dashboard staff</span> untuk dicek stok &amp; disiapkan.
              </p>
            </div>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCheckout(); }}
              disabled={submitting}
              className="w-full h-11 rounded-full text-sm font-semibold"
            >
              {submitting ? "Memproses..." : `Bayar Sekarang · ${formatIDR(total)}`}
            </AlertDialogAction>
            <AlertDialogCancel disabled={submitting} className="w-full h-11 rounded-full mt-0">
              Periksa Lagi
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Checkout;
