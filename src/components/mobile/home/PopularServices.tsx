import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, MessageCircle, Sparkles, Send, Loader2, ArrowRight, Bot, User as UserIcon, CarFront } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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

// Brand → model catalog (shared concept with hero booking form)
const BRAND_MODELS: Record<string, string[]> = {
  Toyota:     ["Avanza", "Innova", "Fortuner", "Rush", "Yaris", "Calya", "Agya", "Veloz", "Raize", "Hilux", "Camry", "Corolla Altis"],
  Daihatsu:   ["Xenia", "Terios", "Ayla", "Sigra", "Rocky", "Gran Max", "Luxio", "Sirion"],
  Honda:      ["Brio", "Mobilio", "Jazz", "HR-V", "CR-V", "Civic", "City", "BR-V", "WR-V", "Accord"],
  Suzuki:     ["Ertiga", "XL7", "Baleno", "Ignis", "Carry", "Swift", "S-Presso", "Jimny"],
  Mitsubishi: ["Pajero Sport", "Xpander", "Xpander Cross", "Outlander", "Triton", "Mirage"],
  Nissan:     ["Livina", "X-Trail", "Serena", "Magnite", "Kicks"],
  Wuling:     ["Confero", "Almaz", "Cortez", "Air EV", "Alvez"],
  Mazda:      ["CX-5", "CX-3", "CX-30", "Mazda 2", "Mazda 3", "Biante"],
  Hyundai:    ["Stargazer", "Creta", "Santa Fe", "Ioniq 5", "Palisade"],
  KIA:        ["Sonet", "Seltos", "Carnival", "Sportage"],
  BMW:        ["320i", "520i", "X1", "X3", "X5"],
  "Mercedes-Benz": ["C-Class", "E-Class", "GLA", "GLC", "GLE"],
  Lainnya:    [],
};
const BRAND_OPTIONS = Object.keys(BRAND_MODELS);
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 2004 }, (_, i) => CURRENT_YEAR - i);

type KonsultasiProps = {
  defaultMode?: Mode;
  embedded?: boolean;
};

// --- Persisted vehicle draft (chatbot keluhan) -------------------------
type VehicleDraft = {
  brand: string; model: string; customModel: string; year: string;
  transmission: string; mileage: string; plate: string; name: string; phone: string;
  vehicleId: string;
};
const EMPTY_DRAFT: VehicleDraft = {
  brand: "", model: "", customModel: "", year: "",
  transmission: "", mileage: "", plate: "", name: "", phone: "",
  vehicleId: "",
};
const VEHICLE_DRAFT_KEY = "stroban.komplain.vehicle";

type SavedVehicle = {
  id: string;
  brand: string | null;
  model: string | null;
  year: number | null;
  transmission: string | null;
  license_plate: string | null;
  is_default: boolean | null;
};

function readVehicleDraft(): VehicleDraft {
  try {
    const raw = localStorage.getItem(VEHICLE_DRAFT_KEY);
    if (!raw) return EMPTY_DRAFT;
    return { ...EMPTY_DRAFT, ...(JSON.parse(raw) as Partial<VehicleDraft>) };
  } catch {
    return EMPTY_DRAFT;
  }
}

function writeVehicleDraft(draft: VehicleDraft) {
  try {
    localStorage.setItem(VEHICLE_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable — ignore */
  }
}

const Konsultasi = ({ defaultMode = "search", embedded = false }: KonsultasiProps = {}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();
  const { toast } = useToast();

  const [mode, setMode] = useState<Mode>(defaultMode);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedService, setSelectedService] = useState<Recommendation | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Vehicle data captured for complaint mode (used for both guests & members)
  // Persisted locally so the data isn't lost when the user leaves the page.
  const [vBrand, setVBrand] = useState(() => readVehicleDraft().brand);
  const [vModel, setVModel] = useState(() => readVehicleDraft().model);
  const [vCustomModel, setVCustomModel] = useState(() => readVehicleDraft().customModel);
  const [vYear, setVYear] = useState(() => readVehicleDraft().year);
  const [vTransmission, setVTransmission] = useState(() => readVehicleDraft().transmission);
  const [vMileage, setVMileage] = useState(() => readVehicleDraft().mileage);
  const [vPlate, setVPlate] = useState(() => readVehicleDraft().plate);
  const [vName, setVName] = useState(() => readVehicleDraft().name);
  const [vPhone, setVPhone] = useState(() => readVehicleDraft().phone);

  // Saved vehicles (members only)
  const [savedVehicles, setSavedVehicles] = useState<SavedVehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(() => readVehicleDraft().vehicleId);
  const autoPickedRef = useRef(false);

  useEffect(() => {
    if (!user) { setSavedVehicles([]); setSelectedVehicleId(""); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("vehicles")
        .select("id, brand, model, year, transmission, license_plate, is_default")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setSavedVehicles((data ?? []) as SavedVehicle[]);
    })();
    return () => { cancelled = true; };
  }, [user]);

  const applyVehicle = (v: SavedVehicle) => {
    const brand = v.brand ?? "";
    const model = v.model ?? "";
    const known = (BRAND_MODELS[brand] ?? []).includes(model);
    setSelectedVehicleId(v.id);
    setVBrand(brand);
    setVModel(known ? model : model ? "Lainnya" : "");
    setVCustomModel(known ? "" : model);
    setVYear(v.year ? String(v.year) : "");
    setVTransmission(v.transmission ?? "");
    setVPlate(v.license_plate ?? "");
  };

  const useManualVehicle = () => {
    setSelectedVehicleId("");
    setVBrand(""); setVModel(""); setVCustomModel("");
    setVYear(""); setVTransmission(""); setVPlate("");
  };

  // Auto-pick the default vehicle once, only when nothing was typed before.
  useEffect(() => {
    if (autoPickedRef.current || savedVehicles.length === 0) return;
    autoPickedRef.current = true;
    if (selectedVehicleId) {
      const match = savedVehicles.find((v) => v.id === selectedVehicleId);
      if (match) { applyVehicle(match); return; }
    }
    if (vBrand || vModel || vPlate) return;
    applyVehicle(savedVehicles.find((v) => v.is_default) ?? savedVehicles[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedVehicles]);

  // Keep the draft in sync (never auto-reset on remount / navigation).
  useEffect(() => {
    writeVehicleDraft({
      brand: vBrand,
      model: vModel,
      customModel: vCustomModel,
      year: vYear,
      transmission: vTransmission,
      mileage: vMileage,
      plate: vPlate,
      name: vName,
      phone: vPhone,
      vehicleId: selectedVehicleId,
    });
  }, [vBrand, vModel, vCustomModel, vYear, vTransmission, vMileage, vPlate, vName, vPhone, selectedVehicleId]);

  useEffect(() => {
    if (messages.length === 0 && !loading) return;
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // Listen for external triggers (e.g. from HeroBookingForm guest sheet)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ mode?: Mode }>).detail;
      const targetMode: Mode = detail?.mode === "search" ? "search" : "complaint";
      setMode(targetMode);
      // Smooth scroll into view, then focus input
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 500);
      });
    };
    window.addEventListener("open-konsultasi", handler as EventListener);
    return () => window.removeEventListener("open-konsultasi", handler as EventListener);
  }, []);

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
      const finalModel = vModel === "Lainnya" ? vCustomModel.trim() : vModel.trim();
      if (!vBrand.trim() || !finalModel || !vYear.trim()) {
        toast({
          title: "Lengkapi data kendaraan",
          description: "Merk, tipe, dan tahun wajib diisi untuk keluhan.",
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
        const finalModel = vModel === "Lainnya" ? vCustomModel.trim() : vModel.trim();
        payload.vehicle = {
          brand: vBrand.trim(),
          model: finalModel,
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

  const finishSelection = () => {
    if (!selectedService) return;
    goBook(selectedService.id);
  };

  return (
    <section
      id={embedded ? undefined : "konsultasi"}
      ref={sectionRef}
      className={embedded ? "block" : "lg:hidden mt-8 px-4 scroll-mt-20"}
    >
      {!embedded && (
      <div className="flex items-center gap-2 mb-3">
        <div className="relative">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="absolute inset-0 animate-ping opacity-50">
            <Sparkles className="h-4 w-4 text-primary" />
          </span>
        </div>
        <h2 className="text-base font-bold text-foreground">Konsultasi Online</h2>
      </div>
      )}

      {/* Vehicle data form — only for complaint mode */}
      {mode === "complaint" && (
        <div className="mb-3 bg-card/50 backdrop-blur-sm border border-border rounded-2xl p-3 animate-fade-in">
          <div className="flex items-center gap-2 mb-2">
            <CarFront className="h-4 w-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">Data Kendaraan</p>
            <span className="text-[10px] text-muted-foreground">(merk, tipe, tahun wajib)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={vBrand}
              onChange={(e) => { setVBrand(e.target.value); setVModel(""); setVCustomModel(""); }}
              className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
            >
              <option value="">Merk *</option>
              {BRAND_OPTIONS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <select
              value={vModel}
              onChange={(e) => setVModel(e.target.value)}
              disabled={!vBrand}
              className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60 disabled:opacity-60"
            >
              <option value="">{vBrand ? "Tipe *" : "Pilih merk dulu"}</option>
              {(BRAND_MODELS[vBrand] ?? []).map((m) => <option key={m} value={m}>{m}</option>)}
              {vBrand && vBrand !== "Lainnya" && <option value="Lainnya">Lainnya / tulis sendiri…</option>}
            </select>
            <select
              value={vYear}
              onChange={(e) => setVYear(e.target.value)}
              className="bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
            >
              <option value="">Tahun *</option>
              {YEAR_OPTIONS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
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
          {vModel === "Lainnya" && (
            <input
              value={vCustomModel}
              onChange={(e) => setVCustomModel(e.target.value)}
              placeholder="Tulis tipe mobil (mis. Sienta, Veloz Q) *"
              className="mt-2 w-full bg-background border border-border rounded-xl px-2.5 py-1.5 text-sm outline-none focus:border-primary/60"
            />
          )}
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
                          onClick={() => setSelectedService(s)}
                          style={{ animationDelay: `${i * 80}ms` }}
                          className={cn(
                            "w-full text-left rounded-2xl p-3 flex items-center gap-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] animate-scale-in",
                            selectedService?.id === s.id
                              ? "bg-primary/10 border-2 border-primary shadow-[0_0_14px_hsl(var(--primary)/0.4),0_0_28px_hsl(var(--primary)/0.15)]"
                              : "bg-card border border-primary/30 hover:border-primary hover:shadow-[0_0_14px_hsl(var(--primary)/0.4),0_0_28px_hsl(var(--primary)/0.15)]"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground line-clamp-1">{s.name}</p>
                            <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                              {s.duration} menit • {s.category}
                            </p>
                          </div>
                          <span className="shrink-0 inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-semibold rounded-xl px-3 py-2">
                            {selectedService?.id === s.id ? "Dipilih" : "Pilih"} <ArrowRight className="h-3 w-3" />
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
      <div className={cn(
        "mt-3 flex items-center gap-2 bg-card border border-border rounded-2xl p-2 focus-within:border-primary/60 transition-colors",
        !embedded && "focus-within:shadow-[0_0_10px_hsl(var(--primary)/0.25)]"
      )}>
        <input
          ref={inputRef}
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
          className={cn(
            "h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-transform active:scale-90",
            !embedded && "hover:shadow-[0_0_10px_hsl(var(--primary)/0.4)]"
          )}
          aria-label="Kirim"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>

      {/* Selesai button — appears once a service is selected */}
      {selectedService && (
        <button
          onClick={finishSelection}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold rounded-2xl py-3 text-sm transition-all duration-300 hover:scale-[1.01] active:scale-[0.98] hover:shadow-[0_0_14px_hsl(var(--primary)/0.4)] animate-fade-in"
        >
          Selesai • Lanjut booking <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </section>
  );
};

export { Konsultasi };
export default Konsultasi;
