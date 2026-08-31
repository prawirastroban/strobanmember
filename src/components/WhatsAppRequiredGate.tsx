import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, MessageCircle, LogOut } from "lucide-react";
import { useMissingWhatsApp } from "@/hooks/useMissingWhatsApp";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOverlayQueue } from "@/contexts/OverlayQueueContext";
import { friendlyDbError } from "@/lib/supabaseErrorMessage";


// Paths where the gate must never appear (auth flows, public review pages, etc.)
const SKIP_PREFIXES = [
  "/auth",
  "/reset-password",
  "/reset-password-wa",
  "/review",
  "/legal",
];

const SNOOZE_KEY = "wa_gate_snoozed_until";
const SNOOZE_MS = 24 * 60 * 60 * 1000;

function isSnoozed() {
  try {
    const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

export default function WhatsAppRequiredGate() {
  const { user, signOut } = useAuth();
  const { isMissing, loading } = useMissingWhatsApp();
  const location = useLocation();
  const { toast } = useToast();
  const { request, release, isActive } = useOverlayQueue();
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [dismissed, setDismissed] = useState(() => isSnoozed());
  const [saveError, setSaveError] = useState<string | null>(null);

  const skip = SKIP_PREFIXES.some((p) => location.pathname.startsWith(p));
  const shouldShow = !!user && !loading && isMissing && !skip && !dismissed;
  const open = shouldShow && isActive("wa");

  // Request slot when we want to show, release otherwise.
  useEffect(() => {
    if (shouldShow) {
      request("wa");
      return () => release("wa");
    }
  }, [shouldShow, request, release]);

  // Reset dismissal if user becomes missing again (e.g. phone cleared elsewhere)
  useEffect(() => {
    if (!isMissing) setDismissed(false);
  }, [isMissing]);

  // Clear any legacy dismiss flag from the old reminder banner.
  useEffect(() => {
    try { localStorage.removeItem("wa_reminder_dismissed_until"); } catch { /* ignore */ }
  }, []);

  const snooze = () => {
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS)); } catch { /* ignore */ }
    setSaveError(null);
    setDismissed(true);
  };

  const handleSave = async () => {
    if (!user) return;
    const digits = phone.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length < 8) {
      toast({ variant: "destructive", title: "Nomor tidak valid", description: "Masukkan nomor WhatsApp aktif minimal 8 digit." });
      return;
    }
    setSaving(true);
    setSaveError(null);
    const formatted = `+62${digits}`;
    const { error } = await supabase
      .from("profiles")
      .update({ phone: formatted })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      console.error("[wa-gate] gagal menyimpan nomor:", error);
      setSaveError(friendlyDbError(error));
      return;
    }
    toast({ title: "Nomor WhatsApp tersimpan" });
    try { localStorage.removeItem(SNOOZE_KEY); } catch { /* ignore */ }
    setDismissed(true);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
      window.location.href = "/";
    } catch {
      setSigningOut(false);
    }
  };


  return (
    <Dialog open={open}>
      <DialogContent
        className="rounded-3xl max-w-md p-0 overflow-hidden border-border/60"
        onPointerDownOutside={snooze}
        onEscapeKeyDown={snooze}
        onInteractOutside={snooze}
      >
        <DialogHeader className="px-6 pt-6 pb-2 text-center sm:text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-[#25D366]/15 flex items-center justify-center mb-2">
            <MessageCircle className="h-6 w-6 text-[#25D366]" />
          </div>
          <DialogTitle className="text-[18px] font-semibold tracking-tight">
            Lengkapi nomor WhatsApp Anda
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-muted-foreground">
            Nomor WhatsApp dipakai untuk konfirmasi booking, reminder servis, dan reset password.
            Anda bisa mengisinya nanti, tetapi akan diminta lagi saat memesan servis.
          </DialogDescription>
        </DialogHeader>
        <div className="p-6 pt-3 space-y-4">
          <div>
            <Label htmlFor="wa-gate-phone" className="text-[11px] text-muted-foreground">
              Nomor WhatsApp aktif
            </Label>
            <div className="flex mt-1">
              <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-xl bg-muted text-muted-foreground text-sm">
                +62
              </div>
              <Input
                id="wa-gate-phone"
                type="tel"
                inputMode="numeric"
                autoFocus
                placeholder="812 3456 7890"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                maxLength={13}
                className="rounded-l-none rounded-r-xl h-11 text-sm ring-2 ring-[#ff2b2b]/40 focus-visible:ring-[#ff2b2b]"
              />
            </div>
            <p className="text-[10.5px] text-muted-foreground mt-1.5">
              Masukkan tanpa angka 0 di depan. Contoh: 81234567890
            </p>
          </div>

          {saveError && (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
              {saveError}
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || signingOut}
            className="w-full h-11 rounded-full font-semibold text-[14px] bg-[#ff2b2b] hover:bg-[#ff2b2b]/90 text-white shadow-[0_0_14px_rgba(255,43,43,0.4)]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {saveError ? "Coba lagi" : "Simpan & Lanjutkan"}
          </Button>

          <button
            onClick={snooze}
            disabled={saving || signingOut}
            className="w-full text-[12.5px] text-muted-foreground hover:text-foreground transition-colors py-1"
          >
            Isi nanti
          </button>

          <button
            onClick={handleSignOut}
            disabled={saving || signingOut}
            className="w-full flex items-center justify-center gap-1.5 text-[12px] text-muted-foreground hover:text-destructive transition-colors py-1"
          >
            {signingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
            Keluar dari akun
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}