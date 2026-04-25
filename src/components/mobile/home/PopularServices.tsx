import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, Sparkles, Send, Loader2, ArrowRight, Bot, User as UserIcon, Car } from "lucide-react";
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

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; recs: Recommendation[]; mode: Mode };

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Vehicle data captured for complaint mode (used for both guests & members)
  const [vBrand, setVBrand] = useState("");
  const [vModel, setVModel] = useState("");
  const [vYear, setVYear] = useState("");
  const [vTransmission, setVTransmission] = useState("");
  const [vMileage, setVMileage] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vName, setVName] = useState("");
  const [vPhone, setVPhone] = useState("");

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  const switchMode = (m: Mode) => {
    setMode(m);
    setQuery("");
    // Smoothly bring the chat into the middle of the viewport so it feels balanced
    requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const ask = async () => {
    const q = query.trim();
    if (q.length < 2 || loading) return;

    // For complaint mode, require vehicle basics
    if (mode === "complaint") {
      if (!vBrand.trim() || !vModel.trim() || !vYear.trim()) {
        toast({
          title: "Lengkapi data kendaraan",
          description: "Brand, model, dan tahun wajib diisi untuk keluhan.",
          variant: "destructive",
        });
        return;
      }
      const yearNum = parseInt(vYear, 10);
      if (Number.isNaN(yearNum) || yearNum < 1950 || yearNum > 2100) {
        toast({ title: "Tahun tidak valid", variant: "destructive" });
        return;
      }
    }

    const userMsg: ChatMessage = { id: `u-${Date.now()}`, role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setQuery("");
    setLoading(true);
    try {
      const payload: any = { mode, query: q };
      if (mode === "complaint") {
        payload.vehicle = {
          brand: vBrand.trim(),
          model: vModel.trim(),
          year: parseInt(vYear, 10),
          transmission: vTransmission.trim() || null,
          mileage: vMileage.trim() ? parseInt(vMileage.replace(/\D/g, ""), 10) : null,
          plate: vPlate.trim() ? vPlate.trim().toUpperCase() : null,
        };
        if (!user) {
          payload.customer = {
            name: vName.trim() || null,
            phone: vPhone.trim() || null,
          };
        }
      }
      const { data, error } = await supabase.functions.invoke("service-consultation", {
        body: payload,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data?.answer ?? "Maaf, saya belum punya jawaban yang pas.",
        recs: Array.isArray(data?.recommendations) ? data.recommendations : [],
        mode,
      };
      setMessages((prev) => [...prev, assistantMsg]);
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
        <div className="relative">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="absolute inset-0 animate-ping opacity-50">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
        </div>
        <h2 className="text-base font-bold text-foreground">Konsultasi Online</h2>
      </div>

      {/* Unified segmented mode toggle */}
      <div
        role="tablist"
        aria-label="Mode konsultasi"
        className="relative grid grid-cols-2 mb-3 p-1 rounded-2xl bg-muted/60 border border-border"
      >
        {/* Sliding indicator */}
        <span
          aria-hidden
          className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.4)] transition-transform duration-300 ease-out ${
            mode === "complaint" ? "translate-x-[calc(100%+0.25rem)]" : "translate-x-0"
          }`}
        />
        <button
          role="tab"
          aria-selected={mode === "search"}
          onClick={() => switchMode("search")}
          className={`relative z-10 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors duration-300 ${
            mode === "search" ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <Search className="h-4 w-4" /> Cari Layanan
        </button>
        <button
          role="tab"
          aria-selected={mode === "complaint"}
          onClick={() => switchMode("complaint")}
          className={`relative z-10 flex items-center justify-center gap-1.5 py-2 text-sm font-semibold transition-colors duration-300 ${
            mode === "complaint" ? "text-primary-foreground" : "text-muted-foreground"
          }`}
        >
          <MessageCircle className="h-4 w-4" /> Keluhan
        </button>
      </div>

      {/* Vehicle data form — only for complaint mode */}
      {mode === "complaint" && (
        <div className="mb-3 bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <Car className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">Data Kendaraan</p>
            <span className="text-[10px] text-muted-foreground">(brand, model, tahun wajib)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              value={vBrand}
              onChange={(e) => setVBrand(e.target.value)}
              placeholder="Brand *"
              className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
            />
            <input
              value={vModel}
              onChange={(e) => setVModel(e.target.value)}
              placeholder="Model *"
              className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
            />
            <input
              value={vYear}
              onChange={(e) => setVYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="Tahun *"
              inputMode="numeric"
              className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
            />
            <select
              value={vTransmission}
              onChange={(e) => setVTransmission(e.target.value)}
              className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
            >
              <option value="">Transmisi</option>
              <option value="Manual">Manual</option>
              <option value="Automatic">Automatic</option>
              <option value="CVT">CVT</option>
            </select>
            <input
              value={vMileage}
              onChange={(e) => setVMileage(e.target.value.replace(/\D/g, ""))}
              placeholder="Kilometer (opsional)"
              inputMode="numeric"
              className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
            />
            <input
              value={vPlate}
              onChange={(e) => setVPlate(e.target.value.toUpperCase())}
              placeholder="Plat nomor (opsional)"
              className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
            />
          </div>
          {!user && (
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border">
              <input
                value={vName}
                onChange={(e) => setVName(e.target.value)}
                placeholder="Nama (opsional)"
                className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
              />
              <input
                value={vPhone}
                onChange={(e) => setVPhone(e.target.value)}
                placeholder="No. HP (opsional)"
                inputMode="tel"
                className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
              />
            </div>
          )}
        </div>
      )}

      {/* Chat container */}
      <div
        ref={scrollRef}
        className="bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-3 max-h-[420px] min-h-[180px] overflow-y-auto space-y-3"
      >
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">Halo! Ada yang bisa saya bantu?</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mode === "search"
                ? "Tanyakan layanan apa yang Anda butuhkan."
                : "Ceritakan keluhan kendaraan Anda."}
            </p>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="animate-fade-in">
            {m.role === "user" ? (
              <div className="flex items-end justify-end gap-2">
                <div className="max-w-[80%] bg-primary text-primary-foreground text-sm rounded-2xl rounded-br-sm px-3 py-2 shadow-[0_0_8px_hsl(var(--primary)/0.25)]">
                  {m.content}
                </div>
                <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <UserIcon className="h-3.5 w-3.5 text-primary" />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="max-w-[88%] bg-muted/70 text-foreground text-sm rounded-2xl rounded-bl-sm px-3 py-2 leading-relaxed">
                    {m.content}
                  </div>
                  {m.recs.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {m.mode === "complaint" ? "Disarankan melakukan:" : "Rekomendasi:"}
                      </p>
                      {m.recs.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => goBook(s.id)}
                          style={{ animationDelay: `${i * 80}ms` }}
                          className="w-full text-left bg-card border border-primary/30 rounded-2xl p-3 flex items-center gap-3 transition-all duration-300 hover:scale-[1.02] hover:border-primary hover:shadow-[0_0_14px_hsl(var(--primary)/0.4),0_0_28px_hsl(var(--primary)/0.15)] active:scale-[0.98] animate-scale-in"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground line-clamp-1">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {s.duration} menit • {s.category}
                            </p>
                          </div>
                          <span className="shrink-0 inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold rounded-xl px-3 py-2">
                            Booking <ArrowRight className="h-3 w-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div className="flex items-start gap-2 animate-fade-in">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="bg-muted/70 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/70 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="mt-3 flex items-center gap-2 bg-card border border-border rounded-2xl p-2 focus-within:border-primary/60 focus-within:shadow-[0_0_10px_hsl(var(--primary)/0.25)] transition-all">
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
          className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-transform active:scale-90 hover:shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
          aria-label="Kirim"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </section>
  );
};

export default Konsultasi;
