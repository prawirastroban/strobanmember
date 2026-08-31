import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { z } from "zod";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useOverlayQueue } from "@/contexts/OverlayQueueContext";
import { useOnboarding, ONBOARDING_TOTAL_STEPS } from "@/hooks/useOnboarding";
import { friendlyDbError } from "@/lib/supabaseErrorMessage";

import StepWelcome from "./StepWelcome";
import StepWhatsApp from "./StepWhatsApp";
import StepVehicle, { type VehicleDraft } from "./StepVehicle";
import StepTour from "./StepTour";

const SKIP_PREFIXES = [
  "/auth",
  "/reset-password",
  "/reset-password-wa",
  "/review",
  "/legal",
  "/t/",
  "/dashboard",
  "/admin",
  "/spk",
  "/invoice",
  "/payment",
  "/~oauth",
];

const phoneSchema = z
  .string()
  .regex(/^[1-9][0-9]{7,12}$/, "Masukkan nomor WhatsApp aktif tanpa 0 di depan.");

const vehicleSchema = z.object({
  brand: z.string().trim().min(2, "Merk wajib diisi").max(40),
  model: z.string().trim().min(1, "Model wajib diisi").max(40),
  year: z.string().regex(/^(19|20)\d{2}$/, "Tahun tidak valid").or(z.literal("")),
  license_plate: z.string().trim().min(3, "Plat nomor wajib diisi").max(15),
});

export default function OnboardingWizard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const { request, release, isActive } = useOverlayQueue();
  const { shouldShow, step, saveStep, complete, hasPhone, phone, refresh } = useOnboarding();

  const [current, setCurrent] = useState(0);
  const [phoneInput, setPhoneInput] = useState("");
  const [vehicle, setVehicle] = useState<VehicleDraft>({
    brand: "",
    model: "",
    year: "",
    license_plate: "",
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);


  const skip = SKIP_PREFIXES.some((p) => location.pathname.startsWith(p));
  const wants = shouldShow && !skip;
  const open = wants && isActive("onboarding");

  useEffect(() => {
    if (wants) {
      request("onboarding");
      return () => release("onboarding");
    }
  }, [wants, request, release]);

  useEffect(() => {
    setCurrent(Math.min(step, ONBOARDING_TOTAL_STEPS - 1));
  }, [step]);

  useEffect(() => {
    if (hasPhone && phone) setPhoneInput(phone.replace(/^\+62/, ""));
  }, [hasPhone, phone]);

  const goto = (n: number) => {
    setCurrent(n);
    void saveStep(n);
  };

  const handleNext = async () => {
    if (current === 0) return goto(1);

    if (current === 1) {
      const digits = phoneInput.replace(/\D/g, "").replace(/^0+/, "");
      const parsed = phoneSchema.safeParse(digits);
      if (!parsed.success) {
        toast({ variant: "destructive", title: "Nomor tidak valid", description: parsed.error.issues[0].message });
        return;
      }
      setSaving(true);
      setSaveError(null);
      const { error } = await supabase
        .from("profiles")
        .update({ phone: `+62${digits}` })
        .eq("id", user!.id);
      setSaving(false);
      if (error) {
        console.error("[onboarding] gagal menyimpan nomor WhatsApp:", error);
        setSaveError(friendlyDbError(error));
        return;
      }
      await refresh();
      return goto(2);
    }

    if (current === 2) {
      const filled = Object.values(vehicle).some((v) => v.trim().length > 0);
      if (!filled) return goto(3);
      const parsed = vehicleSchema.safeParse(vehicle);
      if (!parsed.success) {
        toast({ variant: "destructive", title: "Data kendaraan belum lengkap", description: parsed.error.issues[0].message });
        return;
      }
      setSaving(true);
      setSaveError(null);
      const { error } = await supabase.from("vehicles").insert({
        user_id: user!.id,
        brand: parsed.data.brand,
        model: parsed.data.model,
        year: parsed.data.year ? Number(parsed.data.year) : null,
        license_plate: parsed.data.license_plate,
        is_default: true,
      });
      setSaving(false);
      if (error) {
        console.error("[onboarding] gagal menyimpan kendaraan:", error);
        setSaveError(friendlyDbError(error));
        return;
      }
      await refresh();
      return goto(3);
    }

    setSaving(true);
    await complete();
    setSaving(false);
    toast({ title: "Selamat datang di Bengkel Mobil Stroban!" });
  };

  const canSkipStep = current === 1 || current === 2 || current === 3;

  const handleSkipStep = async () => {
    setSaveError(null);
    if (current === 1) return goto(2);
    if (current === 2) return goto(3);
    setSaving(true);
    await complete();
    setSaving(false);
  };


  return (
    <Dialog open={open}>
      <DialogContent
        hideClose
        className="max-w-md p-0 overflow-hidden rounded-3xl border-border/60 gap-0"
      >
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            {current > 0 && current < 3 ? (
              <button
                onClick={() => goto(current - 1)}
                className="p-1 -ml-1 rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Kembali"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div className="flex-1 flex gap-1.5">
              {Array.from({ length: ONBOARDING_TOTAL_STEPS }).map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= current ? "bg-[#ff2b2b]" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {current + 1}/{ONBOARDING_TOTAL_STEPS}
            </span>
          </div>
        </div>

        <div className="px-5 pb-2 max-h-[62dvh] overflow-y-auto">
          {current === 0 && <StepWelcome name={user?.user_metadata?.full_name as string | undefined} />}
          {current === 1 && <StepWhatsApp value={phoneInput} onChange={setPhoneInput} />}
          {current === 2 && <StepVehicle value={vehicle} onChange={setVehicle} />}
          {current === 3 && <StepTour />}
        </div>

        <div
          className="p-5 pt-3 space-y-2"
          style={{ paddingBottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Button
            onClick={handleNext}
            disabled={saving}
            className="w-full h-11 rounded-full font-semibold text-[14px] bg-[#ff2b2b] hover:bg-[#ff2b2b]/90 text-white shadow-[0_0_14px_rgba(255,43,43,0.4)]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {current === 0 ? "Mulai" : current === 3 ? "Mulai pakai aplikasi" : "Lanjut"}
          </Button>
          {canSkipStep && (
            <button
              onClick={handleSkipStep}
              disabled={saving}
              className="w-full text-[12px] text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {current === 2 ? "Nanti saja" : "Lewati"}
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}