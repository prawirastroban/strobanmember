import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/appVersion";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const SEEN_KEY = "update_popup_seen_for";

interface ReleaseInfo {
  version: string;
  title: string | null;
  summary: string | null;
  purpose: string | null;
  released_at: string;
}

const UpdatePopup = () => {
  const { user } = useAuth();
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const seen = localStorage.getItem(SEEN_KEY);
        if (seen === APP_VERSION) return;
        const { data } = await supabase
          .from("app_releases")
          .select("version, title, summary, purpose, released_at")
          .eq("status", "published")
          .eq("version", APP_VERSION)
          .maybeSingle();
        if (cancelled || !data) return;
        setRelease(data as ReleaseInfo);
        setOpen(true);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const dismiss = () => {
    try { localStorage.setItem(SEEN_KEY, APP_VERSION); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!release) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md border-white/15 bg-background/90 backdrop-blur-2xl">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500/20 to-yellow-400/20 text-primary ring-1 ring-primary/30">
            <Sparkles className="h-6 w-6" />
          </div>
          <DialogTitle className="text-center">Aplikasi telah diperbarui</DialogTitle>
          <DialogDescription className="text-center">
            Versi <span className="font-mono">{release.version}</span> · {new Date(release.released_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </DialogDescription>
        </DialogHeader>
        {release.title && <p className="text-sm font-medium text-center">{release.title}</p>}
        {release.summary && (
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
            {release.summary}
          </div>
        )}
        {release.purpose && (
          <div className="text-xs">
            <span className="font-medium">Tujuan: </span>
            <span className="text-muted-foreground">{release.purpose}</span>
          </div>
        )}
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="ghost" onClick={dismiss} className="w-full sm:w-auto">Tutup</Button>
          <Button asChild onClick={dismiss} className="w-full sm:w-auto bg-gradient-to-r from-red-500 to-yellow-400 text-white">
            <Link to="/update-center">Lihat Detail Perubahan</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UpdatePopup;