import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTireCart, INSTALLATION_FEE_PER_TIRE } from "@/contexts/CartContext";
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
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ShoppingCart, Trash2, Plus, Minus, MapPin, Wrench, Package, Calendar as CalIcon } from "lucide-react";
import { format } from "date-fns";

const BRANCHES = [
  "Bandung - Stroban Pusat",
  "Tasikmalaya",
  "Cirebon",
  "Yogyakarta",
];

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
  const { items, subtotal, count, updateQty, removeItem, clear } = useTireCart();

  const [fulfillment, setFulfillment] = useState<"pickup" | "installation">("installation");
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; brand: string; model: string; license_plate: string }>>([]);
  const [vehicleId, setVehicleId] = useState<string>("");
  const [installDate, setInstallDate] = useState<Date | undefined>(undefined);
  const [installTime, setInstallTime] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const installationFee = useMemo(
    () => fulfillment === "installation" ? count * INSTALLATION_FEE_PER_TIRE : 0,
    [fulfillment, count]
  );
  const total = subtotal + installationFee;

  const canCheckout = useMemo(() => {
    if (!items.length) return false;
    if (!name || !email || !phone || !branch) return false;
    if (fulfillment === "installation" && (!vehicleId && (!installDate || !installTime))) return false;
    if (fulfillment === "installation" && (!installDate || !installTime)) return false;
    return true;
  }, [items, name, email, phone, branch, fulfillment, vehicleId, installDate, installTime]);

  const handleCheckout = async () => {
    if (!user) { toast({ title: "Login dulu", variant: "destructive" }); return; }
    if (!canCheckout) { toast({ title: "Lengkapi data dulu", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const vehicle = vehicles.find(v => v.id === vehicleId);
      const orderItems = items.map(i => ({
        tire_id: i.tire_id, brand: i.brand, type: i.type, size: i.size,
        quantity: i.quantity, unit_price: i.unit_price, subtotal: i.unit_price * i.quantity,
      }));

      const { data: order, error } = await supabase.from("tire_orders").insert({
        user_id: user.id,
        order_number: "", // auto
        customer_name: name, customer_email: email, customer_phone: phone,
        items: orderItems, quantity_total: count,
        subtotal, installation_fee: installationFee, total_amount: total,
        fulfillment_type: fulfillment, branch,
        vehicle_id: fulfillment === "installation" ? (vehicleId || null) : null,
        car_type: vehicle ? `${vehicle.brand} ${vehicle.model}` : null,
        car_plate_number: vehicle?.license_plate ?? null,
        install_date: fulfillment === "installation" && installDate ? format(installDate, "yyyy-MM-dd") : null,
        install_time: fulfillment === "installation" ? installTime || null : null,
        notes: notes || null,
        status: "pending", payment_status: "pending",
      }).select("id, order_number").single();

      if (error || !order) throw error || new Error("Gagal buat pesanan");

      // Trigger Midtrans
      const { data: snapRes, error: snapErr } = await supabase.functions.invoke("midtrans-create-tire-order", {
        body: { order_id: order.id },
      });
      if (snapErr || !snapRes?.snap_token) {
        toast({ title: "Gagal mulai pembayaran", description: snapErr?.message || snapRes?.error, variant: "destructive" });
        // Order tetap tersimpan, user bisa retry dari halaman pesanan
        navigate("/reminder-service");
        return;
      }
      await loadSnap(snapRes.client_key);
      window.snap!.pay(snapRes.snap_token, {
        onSuccess: () => { clear(); toast({ title: "Pembayaran berhasil!" }); navigate("/reminder-service"); },
        onPending: () => { clear(); toast({ title: "Menunggu pembayaran" }); navigate("/reminder-service"); },
        onError: () => { toast({ title: "Pembayaran gagal", variant: "destructive" }); },
        onClose: () => { toast({ title: "Pembayaran ditutup" }); },
      });
    } catch (e) {
      toast({ title: "Error", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (!items.length) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
          <div className="container mx-auto px-4 h-14 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <h1 className="font-semibold">Checkout Ban</h1>
          </div>
        </header>
        <div className="container mx-auto px-4 py-20 text-center space-y-4">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-semibold">Keranjang kosong</h2>
          <p className="text-muted-foreground">Yuk pilih ban dulu di katalog.</p>
          <Button onClick={() => navigate("/")}>Lihat Katalog Ban</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur border-b border-border">
        <div className="container mx-auto px-4 h-14 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="font-semibold flex-1">Checkout Ban</h1>
          <Badge variant="secondary">{count} item</Badge>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 space-y-4 max-w-2xl">
        {/* Items */}
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Pesanan Ban</h2>
          {items.map(it => (
            <div key={it.tire_id} className="flex gap-3 items-center border-t border-border pt-3">
              <div className="w-14 h-14 rounded-lg bg-muted shrink-0 overflow-hidden">
                {it.image_url && <img src={it.image_url} alt={it.brand} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{it.brand} {it.type}</p>
                <p className="text-xs text-muted-foreground">{it.size}</p>
                <p className="text-sm font-semibold text-primary">{formatIDR(it.unit_price)}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(it.tire_id, it.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                <span className="w-8 text-center text-sm font-semibold">{it.quantity}</span>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQty(it.tire_id, it.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeItem(it.tire_id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
        </Card>

        {/* Fulfillment */}
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Metode Pengambilan</h2>
          <RadioGroup value={fulfillment} onValueChange={(v) => setFulfillment(v as "pickup" | "installation")}>
            <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent">
              <RadioGroupItem value="installation" className="mt-0.5" />
              <div className="flex-1">
                <p className="font-medium flex items-center gap-2"><Wrench className="h-4 w-4" /> Pasang langsung di bengkel</p>
                <p className="text-xs text-muted-foreground">+ {formatIDR(INSTALLATION_FEE_PER_TIRE)}/ban (jasa pasang & balancing)</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-accent">
              <RadioGroupItem value="pickup" className="mt-0.5" />
              <div className="flex-1">
                <p className="font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Ambil sendiri di cabang</p>
                <p className="text-xs text-muted-foreground">Tanpa biaya pemasangan</p>
              </div>
            </label>
          </RadioGroup>
        </Card>

        {/* Branch */}
        <Card className="p-4 space-y-3">
          <Label className="flex items-center gap-2"><MapPin className="h-4 w-4" /> Cabang</Label>
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {BRANCHES.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
            </SelectContent>
          </Select>
        </Card>

        {/* Installation specific */}
        {fulfillment === "installation" && (
          <Card className="p-4 space-y-3">
            <h2 className="font-semibold">Detail Pemasangan</h2>
            <div>
              <Label>Kendaraan</Label>
              {vehicles.length > 0 ? (
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger><SelectValue placeholder="Pilih kendaraan" /></SelectTrigger>
                  <SelectContent>
                    {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} - {v.license_plate}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-xs text-muted-foreground">Belum ada kendaraan. <button onClick={() => navigate("/my-vehicles")} className="text-primary underline">Tambah dulu</button></p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Pasang</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                      <CalIcon className="h-4 w-4 mr-2" />
                      {installDate ? format(installDate, "dd MMM yyyy") : "Pilih"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={installDate} onSelect={setInstallDate} disabled={(d) => d < new Date(new Date().setHours(0,0,0,0))} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>Jam Pasang</Label>
                <Select value={installTime} onValueChange={setInstallTime}>
                  <SelectTrigger><SelectValue placeholder="Pilih jam" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>
        )}

        {/* Customer info */}
        <Card className="p-4 space-y-3">
          <h2 className="font-semibold">Data Customer</h2>
          <div>
            <Label>Nama</Label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Telepon</Label>
              <Input value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Catatan (opsional)</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} />
          </div>
        </Card>

        {/* Summary */}
        <Card className="p-4 space-y-2">
          <div className="flex justify-between text-sm"><span>Subtotal ({count} ban)</span><span>{formatIDR(subtotal)}</span></div>
          <div className="flex justify-between text-sm"><span>Biaya pasang</span><span>{installationFee ? formatIDR(installationFee) : "-"}</span></div>
          <div className="flex justify-between font-bold text-lg pt-2 border-t border-border"><span>Total</span><span className="text-primary">{formatIDR(total)}</span></div>
        </Card>
      </main>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border p-3 safe-area-bottom md:max-w-2xl md:left-1/2 md:-translate-x-1/2 md:rounded-t-2xl md:bottom-4 md:border md:shadow-2xl">
        <Button className="w-full h-12 text-base font-semibold" onClick={handleCheckout} disabled={!canCheckout || submitting}>
          {submitting ? "Memproses..." : `Bayar ${formatIDR(total)}`}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;