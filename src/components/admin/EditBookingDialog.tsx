import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { useScopedBranches } from "@/hooks/useBranches";
import { logAdminAction, diffFields } from "@/lib/auditLog";

interface BookingEditShape {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  car_type: string | null;
  car_plate_number: string | null;
  service_name: string;
  service_price?: number | null;
  service_duration?: number | null;
  booking_date: string;
  booking_time: string;
  branch: string | null;
  status: string;
  payment_status: string;
  customer_notes?: string | null;
  user_id?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: BookingEditShape;
  onSaved: (updated: BookingEditShape) => void;
}

const STATUS_OPTS = [
  "pending",
  "waiting_confirmation",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
];

const PAY_STATUS_OPTS = ["unpaid", "pending", "paid", "pay_later", "failed"];
const PAY_METHOD_OPTS = ["cash", "transfer", "qris"];

export default function EditBookingDialog({
  open,
  onOpenChange,
  booking,
  onSaved,
}: Props) {
  const { toast } = useToast();
  const { branches } = useScopedBranches();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<BookingEditShape>(booking);
  const [paymentMethod, setPaymentMethod] = useState<string>("");

  useEffect(() => {
    setForm(booking);
    // preload current payment_method
    supabase
      .from("payments")
      .select("payment_method")
      .eq("booking_id", booking.id)
      .maybeSingle()
      .then(({ data }) => setPaymentMethod(data?.payment_method || ""));
  }, [booking]);

  const set = <K extends keyof BookingEditShape>(k: K, v: BookingEditShape[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      customer_name: form.customer_name,
      customer_email: form.customer_email,
      customer_phone: form.customer_phone,
      car_type: form.car_type,
      car_plate_number: form.car_plate_number,
      service_name: form.service_name,
      service_price: Number(form.service_price ?? 0),
      service_duration: Number(form.service_duration ?? 0),
      booking_date: form.booking_date,
      booking_time: form.booking_time,
      branch: form.branch,
      status: form.status,
      payment_status: form.payment_status,
      customer_notes: form.customer_notes || null,
    };

    const { error } = await supabase
      .from("bookings")
      .update(payload)
      .eq("id", booking.id);

    if (error) {
      setSaving(false);
      toast({
        variant: "destructive",
        title: "Gagal menyimpan",
        description: error.message,
      });
      return;
    }

    // Sync payments.payment_method / payment_status if changed
    if (paymentMethod || payload.payment_status !== booking.payment_status) {
      const { data: existing } = await supabase
        .from("payments")
        .select("id")
        .eq("booking_id", booking.id)
        .maybeSingle();
      if (existing?.id) {
        await supabase
          .from("payments")
          .update({
            payment_method: paymentMethod || undefined,
            payment_status: payload.payment_status,
          })
          .eq("id", existing.id);
      } else if (paymentMethod) {
        await supabase.from("payments").insert({
          booking_id: booking.id,
          user_id: booking.user_id,
          amount: payload.service_price,
          payment_method: paymentMethod,
          payment_status: payload.payment_status,
        });
      }
    }

    const diff = diffFields(booking as any, payload as any);
    await logAdminAction({
      action: "booking.edit",
      targetId: booking.id,
      targetLabel: `${payload.customer_name} • ${payload.service_name}`,
      before: diff.before,
      after: diff.after,
      metadata: { branch: payload.branch },
    });

    setSaving(false);
    toast({ title: "Transaksi diperbarui" });
    onSaved({ ...booking, ...payload } as BookingEditShape);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Transaksi</DialogTitle>
          <DialogDescription>
            Owner-only. Semua perubahan dicatat di Audit Log.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Nama Pelanggan">
            <Input
              value={form.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
            />
          </Field>
          <Field label="Telepon">
            <Input
              value={form.customer_phone}
              onChange={(e) => set("customer_phone", e.target.value)}
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.customer_email}
              onChange={(e) => set("customer_email", e.target.value)}
            />
          </Field>
          <Field label="Cabang">
            <Select
              value={form.branch || ""}
              onValueChange={(v) => set("branch", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih cabang" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.slug} value={b.slug}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipe Mobil">
            <Input
              value={form.car_type || ""}
              onChange={(e) => set("car_type", e.target.value)}
            />
          </Field>
          <Field label="Plat Nomor">
            <Input
              value={form.car_plate_number || ""}
              onChange={(e) =>
                set("car_plate_number", e.target.value.toUpperCase())
              }
              className="uppercase font-mono"
            />
          </Field>
          <Field label="Nama Layanan">
            <Input
              value={form.service_name}
              onChange={(e) => set("service_name", e.target.value)}
            />
          </Field>
          <Field label="Harga (Rp)">
            <Input
              type="number"
              value={form.service_price ?? 0}
              onChange={(e) => set("service_price", Number(e.target.value))}
            />
          </Field>
          <Field label="Durasi (menit)">
            <Input
              type="number"
              value={form.service_duration ?? 0}
              onChange={(e) => set("service_duration", Number(e.target.value))}
            />
          </Field>
          <Field label="Tanggal">
            <Input
              type="date"
              value={form.booking_date}
              onChange={(e) => set("booking_date", e.target.value)}
            />
          </Field>
          <Field label="Jam">
            <Input
              value={form.booking_time}
              onChange={(e) => set("booking_time", e.target.value)}
              placeholder="HH:mm"
            />
          </Field>
          <Field label="Status Booking">
            <Select
              value={form.status}
              onValueChange={(v) => set("status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status Pembayaran">
            <Select
              value={form.payment_status}
              onValueChange={(v) => set("payment_status", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAY_STATUS_OPTS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Metode Pembayaran">
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="(tidak diubah)" />
              </SelectTrigger>
              <SelectContent>
                {PAY_METHOD_OPTS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Label className="text-xs text-muted-foreground">
              Catatan Internal
            </Label>
            <Textarea
              rows={3}
              value={form.customer_notes || ""}
              onChange={(e) => set("customer_notes", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Simpan Perubahan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="space-y-1">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    {children}
  </div>
);
