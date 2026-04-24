import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, Sparkles, Send, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useToast } from "@/hooks/use-toast";

type Mode = "search" | "complaint";

type Recommendation = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price: number;
  duration: number;
};

const PLACEHOLDERS: Record<Mode, string> = {
  search: "Cari layanan atau tanya kebutuhan Anda...",
  complaint: "Apa keluhan kendaraan Anda? cth: mobil bergetar",
};

const Konsultasi = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [recs, setRecs] = useState<Recommendation[]>([]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setAnswer(null);
    setRecs([]);
    setQuery("");
  };

  const ask = async () => {
    if (query.trim().length < 2) return;
    setLoading(true);
    setAnswer(null);
    setRecs([]);
    try {
      const { data, error } = await supabase.functions.invoke("service-consultation", {
        body: { mode, query: query.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnswer(data?.answer ?? null);
      setRecs(Array.isArray(data?.recommendations) ? data.recommendations : []);
    } catch (e) {
      console.error(e);
      toast({
        title: "Gagal memuat konsultasi",
        description: e instanceof Error ? e.message : "Coba lagi sebentar.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const goBook = (id: string) => {
    if (!user) { openLoginDialog(`/booking?service=${id}`); return; }
    navigate(`/booking?service=${id}`);
  };

  return (
    <section className="lg:hidden mt-8 px-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-base font-bold text-foreground">Konsultasi Online</h2>
      </div>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button
          onClick={() => switchMode("search")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border transition ${
            mode === "search"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border"
          }`}
        >
          <Search className="h-4 w-4" /> Cari Layanan
        </button>
        <button
          onClick={() => switchMode("complaint")}
          className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold border transition ${
            mode === "complaint"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-card text-foreground border-border"
          }`}
        >
          <MessageCircle className="h-4 w-4" /> Keluhan Kendaraan
        </button>
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder={PLACEHOLDERS[mode]}
          className="flex-1 bg-transparent px-2 py-2 text-sm outline-none text-foreground placeholder:text-muted-foreground"
          disabled={loading}
        />
        <button
          onClick={ask}
          disabled={loading || query.trim().length < 2}
          className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
          aria-label="Tanya AI"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* Result */}
      {answer && (
        <div className="mt-3 bg-primary/5 border border-primary/20 rounded-2xl p-3">
          <p className="text-sm text-foreground leading-relaxed">{answer}</p>
        </div>
      )}

      {recs.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground px-1">
            {mode === "complaint" ? "Disarankan melakukan:" : "Rekomendasi untuk Anda:"}
          </p>
          {recs.map((s) => (
            <div
              key={s.id}
              className="bg-card border border-border rounded-2xl p-3 flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-1">{s.name}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {s.duration} menit • {s.category}
                </p>
              </div>
              <button
                onClick={() => goBook(s.id)}
                className="shrink-0 inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold rounded-xl px-3 py-2 active:scale-[0.97]"
              >
                Booking <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {!answer && !loading && recs.length === 0 && (
        <p className="mt-3 text-xs text-muted-foreground text-center">
          Tanyakan apa saja — AI akan bantu pilihkan layanan yang tepat.
        </p>
      )}
    </section>
  );
};

export default Konsultasi;