// Phase 5.3 — SPK Intake Form
// Full-page mobile-first form for creating a new SPK (Surat Perintah Kerja).
// Captures branch, customer, vehicle, complaint and priority, then calls
// SPKService.create() and routes to the Canvas.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  Loader2,
  ClipboardList,
  User2,
  Car,
  MessageSquare,
  Building2,
  CalendarCheck,
  UserSearch,
  UserPlus,
  Search,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { SPKService } from "@/services/spk/SPKService";
import type { SpkActor, SpkPriority } from "@/services/spk/types";
import type { Json } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Validation schema

const intakeSchema = z.object({
  branch_id: z.string().uuid({ message: "Pilih cabang" }),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  customer_name: z.string().trim().min(2, "Nama minimal 2 karakter").max(120),
  customer_phone: z
    .string()
    .trim()
    .min(6, "Nomor HP tidak valid")
    .max(20)
    .regex(/^[0-9+\-\s]+$/, "Hanya angka, +, dan spasi"),
  customer_platform: z.enum(["organik", "referral", "iklan", "walk_in", "aplikasi"]),
  vehicle_merk: z.string().trim().min(1, "Merk wajib").max(60),
  vehicle_tipe: z.string().trim().min(1, "Tipe wajib").max(80),
  vehicle_tahun: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "Tahun 4 digit")
    .refine((v) => {
      const n = Number(v);
      return n >= 1980 && n <= new Date().getFullYear() + 1;
    }, "Tahun tidak valid"),
  vehicle_plate: z.string().trim().min(3, "Plat wajib").max(15).toUpperCase(),
  vehicle_mileage_now: z
    .string()
    .trim()
    .regex(/^[\d.,]+$/, "Hanya angka")
    .max(12),
  complaint_note: z.string().trim().min(5, "Keluhan minimal 5 karakter").max(1000),
  complaint_estimasi: z.string().trim().max(60).optional().or(z.literal("")),
});

type IntakeForm = z.infer<typeof intakeSchema>;

const EMPTY: IntakeForm = {
  branch_id: "",
  priority: "normal",
  customer_name: "",
  customer_phone: "",
  customer_platform: "organik",
  vehicle_merk: "",
  vehicle_tipe: "",
  vehicle_tahun: String(new Date().getFullYear()),
  vehicle_plate: "",
  vehicle_mileage_now: "",
  complaint_note: "",
  complaint_estimasi: "",
};

function actorFromRoles(opts: {
  isStaff: boolean;
  isAdmin: boolean;
  isAdminCabang: boolean;
}): SpkActor {
  if (opts.isStaff) return "owner";
  if (opts.isAdmin) return "admin";
  if (opts.isAdminCabang) return "admin_cabang";
  return "reception";
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-3 border-b border-border/60 pb-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="space-y-3">{children}</div>
      </CardContent>
    </Card>
  );
}

function Field({
  id,
  label,
  required,
  error,
  children,
  hint,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
        {required && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="text-[11px] text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page

export default function SPKNewForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialBookingId = searchParams.get("booking_id");
  const { user } = useAuth();
  const { isStaff, isAdmin, isAdminCabang, userBranch } = useUserRole();
  const assignedBranch = userBranch || null;

  const [form, setForm] = useState<IntakeForm>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof IntakeForm, string>>>({});
  const [branches, setBranches] = useState<{ id: string; name: string }[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Source picker
  type SourceMode = "booking" | "customer" | "walkin";
  const [sourceMode, setSourceMode] = useState<SourceMode>(initialBookingId ? "booking" : "walkin");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(initialBookingId);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Booking list (checked_in / in_progress without SPK)
  const [bookingsList, setBookingsList] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Customer search
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [customerVehicles, setCustomerVehicles] = useState<any[]>([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);

  // Load branches
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("branches")
        .select("id, name")
        .order("name", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Gagal memuat cabang", { description: error.message });
      } else if (data) {
        setBranches(data.map((b) => ({ id: b.id, name: b.name })));
      }
      setLoadingBranches(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preselect assigned branch for branch admins
  useEffect(() => {
    if (!form.branch_id) {
      if (assignedBranch) {
        setForm((f) => ({ ...f, branch_id: assignedBranch }));
      } else if (branches.length === 1) {
        setForm((f) => ({ ...f, branch_id: branches[0].id }));
      }
    }
  }, [assignedBranch, branches, form.branch_id]);

  // Load bookings for "booking" source
  useEffect(() => {
    if (sourceMode !== "booking") return;
    let cancelled = false;
    (async () => {
      setLoadingBookings(true);
      // bookings checked_in / in_progress
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, customer_name, customer_phone, car_type, car_plate_number, service_name, branch, status, booking_date, user_id, vehicle_id, customer_notes")
        .in("status", ["checked_in", "in_progress"])
        .order("booking_date", { ascending: false })
        .limit(50);
      if (cancelled) return;
      // Filter out ones that already have SPK
      const ids = (bookings ?? []).map((b) => b.id);
      let existingSet = new Set<string>();
      if (ids.length) {
        const { data: existing } = await supabase
          .from("spk_orders")
          .select("booking_id")
          .in("booking_id", ids);
        existingSet = new Set((existing ?? []).map((r) => r.booking_id).filter(Boolean) as string[]);
      }
      if (cancelled) return;
      setBookingsList((bookings ?? []).filter((b) => !existingSet.has(b.id)));
      setLoadingBookings(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sourceMode]);

  // Prefill from booking selection
  const applyBookingToForm = async (bookingId: string) => {
    const b = bookingsList.find((x) => x.id === bookingId);
    if (!b) return;
    setSelectedBookingId(bookingId);
    // Resolve branch_id from name
    let branchId = form.branch_id;
    if (b.branch) {
      const found = branches.find((br) => br.name.toLowerCase() === String(b.branch).toLowerCase());
      if (found) branchId = found.id;
    }
    // Try vehicle lookup
    let vehicleData: any = null;
    if (b.vehicle_id) {
      const { data } = await supabase.from("vehicles").select("*").eq("id", b.vehicle_id).maybeSingle();
      vehicleData = data;
      setSelectedVehicleId(b.vehicle_id);
    }
    setSelectedCustomerId(b.user_id ?? null);
    setForm((f) => ({
      ...f,
      branch_id: branchId,
      customer_name: b.customer_name ?? "",
      customer_phone: b.customer_phone ?? "",
      customer_platform: "aplikasi",
      vehicle_merk: vehicleData?.brand ?? (b.car_type ?? "").split(" ")[0] ?? "",
      vehicle_tipe: vehicleData?.model ?? b.car_type ?? "",
      vehicle_tahun: vehicleData?.year ? String(vehicleData.year) : f.vehicle_tahun,
      vehicle_plate: (vehicleData?.license_plate ?? b.car_plate_number ?? "").toUpperCase(),
      complaint_note: b.customer_notes ?? b.service_name ?? "",
    }));
  };

  // Auto-apply when arriving with ?booking_id= param
  useEffect(() => {
    if (initialBookingId && bookingsList.length && selectedBookingId !== initialBookingId) {
      applyBookingToForm(initialBookingId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialBookingId, bookingsList]);

  // Customer search (debounced)
  useEffect(() => {
    if (sourceMode !== "customer") return;
    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearchingCustomer(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, phone, customer_id")
        .or(`full_name.ilike.%${q}%,phone.ilike.%${q}%,customer_id.ilike.%${q}%`)
        .limit(10);
      if (cancelled) return;
      setCustomerResults(data ?? []);
      setSearchingCustomer(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [customerQuery, sourceMode]);

  const applyCustomerToForm = async (profile: any) => {
    setSelectedCustomerId(profile.id);
    setForm((f) => ({
      ...f,
      customer_name: profile.full_name ?? "",
      customer_phone: profile.phone ?? "",
      customer_platform: "aplikasi",
    }));
    // Load their vehicles
    const { data: vs } = await supabase
      .from("vehicles")
      .select("id, brand, model, year, license_plate, is_default")
      .eq("user_id", profile.id)
      .order("is_default", { ascending: false });
    setCustomerVehicles(vs ?? []);
    // Auto-select default vehicle
    const def = (vs ?? []).find((v) => v.is_default) ?? (vs ?? [])[0];
    if (def) applyVehicleToForm(def);
  };

  const applyVehicleToForm = (v: any) => {
    setSelectedVehicleId(v.id);
    setForm((f) => ({
      ...f,
      vehicle_merk: v.brand ?? "",
      vehicle_tipe: v.model ?? "",
      vehicle_tahun: v.year ? String(v.year) : f.vehicle_tahun,
      vehicle_plate: (v.license_plate ?? "").toUpperCase(),
    }));
  };

  const resetPrefill = () => {
    setSelectedBookingId(null);
    setSelectedCustomerId(null);
    setSelectedVehicleId(null);
    setCustomerVehicles([]);
    setCustomerResults([]);
    setCustomerQuery("");
    setForm({ ...EMPTY, branch_id: form.branch_id });
  };

  const actor: SpkActor = useMemo(
    () => actorFromRoles({ isStaff, isAdmin, isAdminCabang }),
    [isStaff, isAdmin, isAdminCabang],
  );

  const setField = <K extends keyof IntakeForm>(key: K, value: IntakeForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = intakeSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof IntakeForm, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof IntakeForm;
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Isian belum lengkap", {
        description: `${parsed.error.issues.length} kolom perlu diperbaiki`,
      });
      // Scroll to first error
      const firstKey = parsed.error.issues[0]?.path[0] as string;
      if (firstKey) {
        document
          .getElementById(String(firstKey))
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    const v = parsed.data;
    setSubmitting(true);
    try {
      const initialData: Json = {
        customer_name: v.customer_name,
        customer_phone: v.customer_phone,
        customer_platform: v.customer_platform,
        vehicle_merk: v.vehicle_merk,
        vehicle_tipe: v.vehicle_tipe,
        vehicle_tahun: v.vehicle_tahun,
        vehicle_plate: v.vehicle_plate,
        vehicle_mileage_now: v.vehicle_mileage_now,
        complaint_note: v.complaint_note,
        complaint_estimasi: v.complaint_estimasi ?? "",
      };

      const result = await SPKService.create({
        branch_id: v.branch_id,
        priority: v.priority as SpkPriority,
        data: initialData,
        notes: v.complaint_note,
        initial_owner_role: actor,
        booking_id: selectedBookingId,
        vehicle_id: selectedVehicleId,
        customer_id: selectedCustomerId,
        ctx: {
          actor: { user_id: user?.id ?? null, role: actor },
          occurred_at: new Date().toISOString(),
        },
      });

      if (result.ok !== true) {
        toast.error("Gagal membuat SPK", { description: result.error });
        return;
      }

      toast.success("SPK berhasil dibuat", {
        description: result.data.spk_number,
      });
      navigate(`/spk/${result.data.id}`, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Terjadi kesalahan";
      toast.error("Gagal membuat SPK", { description: msg });
    } finally {
      setSubmitting(false);
    }
  };

  const branchLocked = !isStaff && !isAdmin && !!assignedBranch;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Sticky header */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-muted active:scale-95 transition"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight text-foreground">
              Buat SPK Baru
            </h1>
            <p className="text-[11px] text-muted-foreground truncate">
              Intake awal · dilanjutkan di Canvas
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary border border-primary/20">
            <ClipboardList className="h-3 w-3" />
            Phase 5.3
          </div>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-2xl px-4 pt-4 space-y-4">
        {/* 1. Branch & priority */}
        <SectionCard icon={Building2} title="Cabang & Prioritas" subtitle="Tentukan cabang pelaksana dan urgensi pengerjaan.">
          <Field id="branch_id" label="Cabang" required error={errors.branch_id}>
            <Select
              value={form.branch_id}
              onValueChange={(v) => setField("branch_id", v)}
              disabled={loadingBranches || branchLocked}
            >
              <SelectTrigger id="branch_id" className="h-11">
                <SelectValue
                  placeholder={loadingBranches ? "Memuat cabang…" : "Pilih cabang"}
                />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="priority" label="Prioritas" required error={errors.priority}>
            <div className="grid grid-cols-4 gap-2">
              {(["low", "normal", "high", "urgent"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setField("priority", p)}
                  className={cn(
                    "h-10 rounded-md border text-xs font-medium capitalize transition",
                    form.priority === p
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  {p === "urgent" ? "Darurat" : p === "high" ? "Tinggi" : p === "normal" ? "Normal" : "Rendah"}
                </button>
              ))}
            </div>
          </Field>
        </SectionCard>

        {/* 2. Customer */}
        <SectionCard icon={User2} title="Data Pelanggan" subtitle="Identitas pemilik kendaraan.">
          <Field id="customer_name" label="Nama Pelanggan" required error={errors.customer_name}>
            <Input
              id="customer_name"
              value={form.customer_name}
              onChange={(e) => setField("customer_name", e.target.value)}
              placeholder="mis. Budi Santoso"
              autoComplete="name"
              maxLength={120}
              className="h-11"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="customer_phone" label="Nomor HP" required error={errors.customer_phone}>
              <Input
                id="customer_phone"
                inputMode="tel"
                value={form.customer_phone}
                onChange={(e) => setField("customer_phone", e.target.value)}
                placeholder="0812-3456-7890"
                autoComplete="tel"
                maxLength={20}
                className="h-11"
              />
            </Field>

            <Field id="customer_platform" label="Sumber" required error={errors.customer_platform}>
              <Select
                value={form.customer_platform}
                onValueChange={(v) => setField("customer_platform", v as IntakeForm["customer_platform"])}
              >
                <SelectTrigger id="customer_platform" className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="organik">Organik</SelectItem>
                  <SelectItem value="referral">Referral</SelectItem>
                  <SelectItem value="iklan">Iklan</SelectItem>
                  <SelectItem value="walk_in">Walk-in</SelectItem>
                  <SelectItem value="aplikasi">Aplikasi</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </SectionCard>

        {/* 3. Vehicle */}
        <SectionCard icon={Car} title="Data Kendaraan" subtitle="Sesuai STNK atau pengecekan langsung.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="vehicle_merk" label="Merk" required error={errors.vehicle_merk}>
              <Input
                id="vehicle_merk"
                value={form.vehicle_merk}
                onChange={(e) => setField("vehicle_merk", e.target.value)}
                placeholder="Toyota"
                maxLength={60}
                className="h-11"
              />
            </Field>
            <Field id="vehicle_tipe" label="Tipe / Model" required error={errors.vehicle_tipe}>
              <Input
                id="vehicle_tipe"
                value={form.vehicle_tipe}
                onChange={(e) => setField("vehicle_tipe", e.target.value)}
                placeholder="Avanza 1.3 G"
                maxLength={80}
                className="h-11"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field id="vehicle_tahun" label="Tahun" required error={errors.vehicle_tahun}>
              <Input
                id="vehicle_tahun"
                inputMode="numeric"
                value={form.vehicle_tahun}
                onChange={(e) => setField("vehicle_tahun", e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
                placeholder="2020"
                className="h-11"
              />
            </Field>
            <Field id="vehicle_plate" label="Nomor Polisi" required error={errors.vehicle_plate}>
              <Input
                id="vehicle_plate"
                value={form.vehicle_plate}
                onChange={(e) => setField("vehicle_plate", e.target.value.toUpperCase().slice(0, 15))}
                placeholder="B 1234 XYZ"
                className="h-11 font-mono uppercase tracking-wider"
              />
            </Field>
          </div>

          <Field
            id="vehicle_mileage_now"
            label="Kilometer Sekarang"
            required
            error={errors.vehicle_mileage_now}
            hint="Angka pada odometer saat masuk bengkel."
          >
            <Input
              id="vehicle_mileage_now"
              inputMode="numeric"
              value={form.vehicle_mileage_now}
              onChange={(e) => setField("vehicle_mileage_now", e.target.value.replace(/[^0-9.,]/g, "").slice(0, 12))}
              placeholder="82.450"
              className="h-11 tabular-nums"
            />
          </Field>
        </SectionCard>

        {/* 4. Complaint */}
        <SectionCard icon={MessageSquare} title="Keluhan Pelanggan" subtitle="Deskripsi awal — detail teknis diisi mekanik di Canvas.">
          <Field
            id="complaint_note"
            label="Keluhan"
            required
            error={errors.complaint_note}
          >
            <Textarea
              id="complaint_note"
              value={form.complaint_note}
              onChange={(e) => setField("complaint_note", e.target.value)}
              placeholder="mis. Suara berdecit dari kaki-kaki saat melewati jalan rusak, AC kurang dingin siang hari."
              maxLength={1000}
              rows={4}
              className="resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right tabular-nums">
              {form.complaint_note.length} / 1000
            </p>
          </Field>

          <Field
            id="complaint_estimasi"
            label="Estimasi Waktu"
            error={errors.complaint_estimasi}
            hint="Opsional. mis. '4 jam', '1 hari'."
          >
            <Input
              id="complaint_estimasi"
              value={form.complaint_estimasi ?? ""}
              onChange={(e) => setField("complaint_estimasi", e.target.value)}
              placeholder="4 jam"
              maxLength={60}
              className="h-11"
            />
          </Field>
        </SectionCard>

        <p className="px-2 text-[11px] text-muted-foreground">
          Setelah dibuat, SPK akan otomatis terbuka di Canvas untuk pengisian inspeksi dan pengerjaan.
        </p>
      </form>

      {/* Sticky action bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(-1)}
            disabled={submitting}
            className="flex-1"
          >
            Batal
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-[2] h-11 bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-glow-sm)]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Membuat SPK…
              </>
            ) : (
              <>Buat SPK</>
            )}
          </Button>
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  );
}