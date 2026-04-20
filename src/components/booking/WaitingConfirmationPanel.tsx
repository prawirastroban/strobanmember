import { useEffect, useState } from "react";
import { Hourglass, Sparkles, RefreshCw, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ROTATING_MESSAGES = [
  "Booking Anda sedang diproses oleh tim kami",
  "Kami sedang menyiapkan teknisi terbaik untuk Anda",
  "Mohon tunggu sebentar, konfirmasi segera dilakukan",
];

interface Props {
  bookingId: string;
  branch: string | null;
  bookingDate: string;
  lastUpdatedAt: number; // ms timestamp from parent (updates on every realtime/poll tick)
}

const formatRelative = (ms: number) => {
  const sec = Math.max(0, Math.floor(ms / 1000));
  if (sec < 5) return "baru saja";
  if (sec < 60) return `${sec} detik lalu`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} menit lalu`;
  const h = Math.floor(min / 60);
  return `${h} jam lalu`;
};

export const WaitingConfirmationPanel = ({ bookingId, branch, bookingDate, lastUpdatedAt }: Props) => {
  const [msgIdx, setMsgIdx] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [queuePos, setQueuePos] = useState<number | null>(null);

  // Rotate message every 4s
  useEffect(() => {
    const t = setInterval(() => setMsgIdx((i) => (i + 1) % ROTATING_MESSAGES.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Tick "last updated" every second
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Compute queue position: count bookings on same date+branch in waiting/pending created before this one
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: self } = await supabase
          .from("bookings")
          .select("created_at")
          .eq("id", bookingId)
          .maybeSingle();
        if (!self || !active) return;

        let q = supabase
          .from("bookings")
          .select("id", { count: "exact", head: true })
          .eq("booking_date", bookingDate)
          .in("status", ["pending", "waiting_confirmation"])
          .lt("created_at", self.created_at);
        if (branch) q = q.eq("branch", branch);

        const { count } = await q;
        if (active) setQueuePos((count ?? 0) + 1);
      } catch {
        /* silent */
      }
    })();
    return () => { active = false; };
  }, [bookingId, branch, bookingDate, lastUpdatedAt]);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/5 p-5 space-y-4 overflow-hidden relative">
      {/* Shimmer accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] bg-[linear-gradient(90deg,transparent,hsl(var(--primary)),transparent)] bg-[length:200%_100%] animate-shimmer"
        aria-hidden
      />

      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <span className="absolute inset-0 rounded-full bg-primary/30 blur-md animate-pulse" />
          <div className="relative h-10 w-10 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Hourglass className="h-5 w-5 text-primary animate-pulse" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-medium text-primary mb-1">
            <Sparkles className="h-3 w-3" />
            <span>Sedang Diproses</span>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </div>
          <p
            key={msgIdx}
            className="text-sm font-semibold text-foreground animate-message-in min-h-[2.5rem]"
          >
            {ROTATING_MESSAGES[msgIdx]}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2 flex items-center gap-2">
          <Users className="h-3.5 w-3.5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px]">Posisi antrian</p>
            <p className="font-semibold truncate">
              {queuePos === null ? "Menghitung..." : queuePos === 1 ? "Anda berikutnya" : `Antrian ke-${queuePos}`}
            </p>
          </div>
        </div>
        <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2 flex items-center gap-2">
          <RefreshCw className="h-3.5 w-3.5 text-primary shrink-0 animate-spin [animation-duration:3s]" />
          <div className="min-w-0">
            <p className="text-muted-foreground text-[10px]">Terakhir diperbarui</p>
            <p className="font-semibold truncate">{formatRelative(now - lastUpdatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WaitingConfirmationPanel;
