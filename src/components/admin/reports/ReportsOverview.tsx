import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingBag, Wallet, CreditCard, Users, Car, Trophy, Tag, Building2, FileBarChart, Timer,
  Share2, Package, Truck, Wand2, Search, Rocket, Star, Pin, FileText,
} from "lucide-react";
import { CATEGORIES, reportsByCategory, ALL_REPORTS, findReport, getCategory } from "./ReportRegistry";
import { useUserRole } from "@/hooks/useUserRole";
import { useReportPins } from "@/hooks/useReportPins";
import { useReportTemplates } from "@/hooks/useReportTemplates";
import TemplatesPanel from "./templates/TemplatesPanel";

const ICONS: Record<string, any> = {
  ShoppingBag, Wallet, CreditCard, Users, Car, Trophy, Tag, Building2, Timer, Share2, Package, Truck, Rocket,
};

// Final, user-defined ordering of primary categories on /dashboard/reports.
const PRIMARY_ORDER = [
  "sales",
  "finance",
  "payments",
  "customers",
  "vehicles",
  "loyalty",
  "promos",
  "operations",
];

const CATEGORY_EMOJI: Record<string, string> = {
  sales: "📈",
  finance: "💰",
  payments: "💳",
  customers: "👥",
  vehicles: "🚗",
  loyalty: "🎁",
  promos: "🏷",
  operations: "🏢",
  response: "⏱",
  referral: "🤝",
  inventory: "📦",
  purchasing: "🚚",
  adoption: "🚀",
};

export default function ReportsOverview() {
  const navigate = useNavigate();
  const { canManageFinancial } = useUserRole();
  const { pins } = useReportPins();
  const { templates } = useReportTemplates();
  const [q, setQ] = useState("");

  const visible = CATEGORIES.filter((c) => !c.sensitive || canManageFinancial);

  // Primary categories (ordered) — guarantee navigation works.
  const primary = PRIMARY_ORDER
    .map((id) => visible.find((c) => c.id === id))
    .filter(Boolean) as typeof CATEGORIES;

  // Anything else still surfaced under "Kategori Lainnya"
  const secondary = visible.filter((c) => !PRIMARY_ORDER.includes(c.id));

  // Favorites = pinned reports + favorited templates
  const favoriteReports = pins
    .filter((p) => !p.startsWith("builder:"))
    .map((id) => findReport(id))
    .filter((r): r is NonNullable<ReturnType<typeof findReport>> => Boolean(r))
    .filter((r) => {
      const cat = getCategory(r.category);
      return !cat?.sensitive || canManageFinancial;
    });

  const favoriteTemplates = templates.filter((t) => t.is_favorite);
  const pinnedTemplateIds = new Set(
    pins.filter((p) => p.startsWith("builder:")).map((p) => p.slice("builder:".length)),
  );
  const pinnedTemplates = templates.filter(
    (t) => pinnedTemplateIds.has(t.id) && !t.is_favorite,
  );
  const favoriteAllTemplates = [...favoriteTemplates, ...pinnedTemplates];

  const matchingReports = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return ALL_REPORTS.filter((r) => {
      const cat = CATEGORIES.find((c) => c.id === r.category);
      if (cat?.sensitive && !canManageFinancial) return false;
      return (
        r.title.toLowerCase().includes(term) ||
        r.description.toLowerCase().includes(term) ||
        (cat?.label?.toLowerCase().includes(term) ?? false)
      );
    }).slice(0, 20);
  }, [q, canManageFinancial]);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <FileBarChart className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Daftar Laporan</h2>
          <p className="text-sm text-muted-foreground">Pilih kategori untuk melihat laporan analitik dan ekspor data.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari laporan…"
          className="pl-9"
        />
      </div>

      {/* Search results */}
      {q.trim() && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{matchingReports.length} laporan cocok</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {matchingReports.map((r) => (
              <Card key={r.id} onClick={() => navigate(`/dashboard/reports/${r.category}/${r.id}`)}
                className="cursor-pointer transition-all hover:border-primary/50">
                <CardContent className="p-3">
                  <div className="font-medium text-sm">{r.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ⭐ Favorit */}
      {(favoriteReports.length > 0 || favoriteAllTemplates.length > 0) && !q.trim() && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-primary text-primary" />
            <h3 className="font-semibold">Favorit</h3>
            <span className="text-xs text-muted-foreground">
              {favoriteReports.length + favoriteAllTemplates.length} item
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {favoriteReports.map((r) => (
              <Card
                key={`fav-${r.id}`}
                onClick={() => navigate(`/dashboard/reports/${r.category}/${r.id}`)}
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Pin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm line-clamp-1">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {getCategory(r.category)?.label}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {favoriteAllTemplates.map((t) => (
              <Card
                key={`fav-tpl-${t.id}`}
                onClick={() =>
                  t.kind === "builder"
                    ? navigate(`/dashboard/reports/builder?template=${t.id}`)
                    : (() => {
                        const r = findReport(t.config?.reportId);
                        if (!r) return;
                        const qs = t.config?.searchParams ? `?${t.config.searchParams}` : "";
                        navigate(`/dashboard/reports/${r.category}/${r.id}${qs}`);
                      })()
                }
                className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-[0_0_15px_hsl(var(--primary)/0.2)]"
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="p-2 rounded-md bg-primary/10 text-primary">
                    <Star className="h-4 w-4 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm line-clamp-1">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{t.kind}</Badge>
                      {t.is_global && <Badge variant="secondary" className="text-[10px] px-1 py-0">global</Badge>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Primary categories */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileBarChart className="h-4 w-4 text-primary" />
          <h3 className="font-semibold">Kategori Laporan</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {primary.map((c) => {
            const Icon = ICONS[c.icon] || FileBarChart;
            const count = reportsByCategory(c.id).length;
            const disabled = count === 0;
            return (
              <Card
                key={c.id}
                onClick={() => !disabled && navigate(`/dashboard/reports/${c.id}`)}
                aria-disabled={disabled}
                className={`transition-all duration-200 ${
                  disabled
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:scale-[1.02] hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:border-primary/50"
                }`}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span aria-hidden>{CATEGORY_EMOJI[c.id]}</span>
                        {c.label}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.description}</p>
                      <div className="text-xs mt-2">
                        {disabled ? (
                          <span className="text-muted-foreground">Segera hadir</span>
                        ) : (
                          <span className="text-primary">{count} laporan tersedia</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* 📋 Custom Report */}
          <Card
            onClick={() => navigate("/dashboard/reports/builder")}
            className="cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_20px_hsl(var(--primary)/0.25)] hover:border-primary/50 bg-gradient-to-br from-primary/5 to-transparent"
          >
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <Wand2 className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold flex items-center gap-1.5">
                    <span aria-hidden>📋</span>
                    Custom Report
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    Susun laporan sendiri: data source, rows, columns, values & filters — tanpa coding.
                  </p>
                  <div className="text-xs text-primary mt-2">Buka Builder →</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Templates panel */}
      <TemplatesPanel />

      {/* Secondary categories */}
      {secondary.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-muted-foreground">Kategori Lainnya</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {secondary.map((c) => {
              const Icon = ICONS[c.icon] || FileBarChart;
              const count = reportsByCategory(c.id).length;
              const disabled = count === 0;
              return (
                <Card
                  key={c.id}
                  onClick={() => !disabled && navigate(`/dashboard/reports/${c.id}`)}
                  className={`transition-all ${
                    disabled
                      ? "opacity-60 cursor-not-allowed"
                      : "cursor-pointer hover:border-primary/50"
                  }`}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="p-2 rounded-md bg-muted text-foreground/70">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm flex items-center gap-1.5">
                        <span aria-hidden>{CATEGORY_EMOJI[c.id]}</span>
                        {c.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {disabled ? "Segera hadir" : `${count} laporan`}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}