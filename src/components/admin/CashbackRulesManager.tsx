import { useEffect, useState } from "react";
import { Loader2, Save, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ServiceMultiPicker from "@/components/admin/ServiceMultiPicker";
import {
  CASHBACK_RULES_KEY,
  DEFAULT_CASHBACK_RULES,
  fetchCashbackRules,
  invalidateCashbackRules,
  type CashbackUsageRules,
} from "@/lib/cashbackRules";

interface CategoryRow {
  slug: string;
  label: string;
  kind: string;
}

const formatIDR = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

/**
 * Panel Owner untuk mengatur di layanan mana saja saldo cashback pelanggan
 * boleh dipakai (global). Disimpan sebagai satu baris JSON di `app_settings`
 * dengan key `cashback.usage_rules` dan divalidasi ulang di server.
 */
export default function CashbackRulesManager() {
  const [rules, setRules] = useState<CashbackUsageRules>(DEFAULT_CASHBACK_RULES);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [r, cats] = await Promise.all([
        fetchCashbackRules(true),
        supabase
          .from("service_categories")
          .select("slug,label,kind")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
      ]);
      if (!alive) return;
      setRules(r);
      setCategories((cats.data as CategoryRow[]) || []);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const patch = (p: Partial<CashbackUsageRules>) => setRules((s) => ({ ...s, ...p }));

  const toggleCategory = (slug: string) =>
    patch({
      allowed_categories: rules.allowed_categories.includes(slug)
        ? rules.allowed_categories.filter((c) => c !== slug)
        : [...rules.allowed_categories, slug],
    });

  const save = async () => {
    if (rules.mode === "categories" && rules.allowed_categories.length === 0) {
      toast.error("Pilih minimal satu kategori");
      return;
    }
    if (rules.mode === "services" && rules.allowed_service_ids.length === 0) {
      toast.error("Pilih minimal satu layanan");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key: CASHBACK_RULES_KEY, value: rules as any, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan", { description: error.message });
      return;
    }
    invalidateCashbackRules();
    toast.success("Aturan saldo cashback disimpan");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Aturan Saldo Cashback
        </CardTitle>
        <CardDescription>
          Atur di layanan mana saja saldo cashback pelanggan boleh dipakai dan berapa batas potongannya.
          Berlaku global untuk semua checkout.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <Label className="text-sm font-semibold">Izinkan pemakaian saldo cashback</Label>
            <p className="text-xs text-muted-foreground">
              Jika dimatikan, pelanggan tetap bisa mengumpulkan saldo tetapi tidak bisa memakainya.
            </p>
          </div>
          <Switch checked={rules.enabled} onCheckedChange={(v) => patch({ enabled: v })} />
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-semibold">Berlaku untuk</Label>
          <RadioGroup
            value={rules.mode}
            onValueChange={(v) => patch({ mode: v as CashbackUsageRules["mode"] })}
            className="grid gap-2"
          >
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer">
              <RadioGroupItem value="all" id="cb-mode-all" />
              <span className="text-sm">Semua layanan</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer">
              <RadioGroupItem value="categories" id="cb-mode-cat" />
              <span className="text-sm">Kategori tertentu</span>
            </label>
            <label className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer">
              <RadioGroupItem value="services" id="cb-mode-svc" />
              <span className="text-sm">Layanan tertentu</span>
            </label>
          </RadioGroup>
        </div>

        {rules.mode === "categories" && (
          <div className="space-y-2">
            <Label>Kategori yang diizinkan</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {categories.map((c) => (
                <label
                  key={c.slug}
                  className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 cursor-pointer"
                >
                  <Checkbox
                    checked={rules.allowed_categories.includes(c.slug)}
                    onCheckedChange={() => toggleCategory(c.slug)}
                  />
                  <span className="text-sm">{c.label}</span>
                  {c.kind === "product" && (
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      Barang
                    </Badge>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {rules.mode === "services" && (
          <ServiceMultiPicker
            value={rules.allowed_service_ids}
            onChange={(next) => patch({ allowed_service_ids: next })}
            hint="Pilih layanan yang boleh memakai saldo cashback. Saat mode ini aktif, layanan lain tidak bisa memakai saldo."
          />
        )}

        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <Label className="text-sm font-semibold">Kecualikan kategori barang</Label>
            <p className="text-xs text-muted-foreground">
              Blokir pemakaian saldo bila keranjang berisi barang (ban / oli / sparepart).
            </p>
          </div>
          <Switch
            checked={rules.exclude_products}
            onCheckedChange={(v) => patch({ exclude_products: v })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Minimal transaksi (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={rules.min_transaction}
              onChange={(e) => patch({ min_transaction: Math.max(0, Number(e.target.value) || 0) })}
            />
            <p className="text-[11px] text-muted-foreground">0 = tanpa minimal</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Maks. potongan (Rp)</Label>
            <Input
              type="number"
              min={0}
              value={rules.max_amount}
              onChange={(e) => patch({ max_amount: Math.max(0, Number(e.target.value) || 0) })}
            />
            <p className="text-[11px] text-muted-foreground">0 = tanpa batas nominal</p>
          </div>
          <div className="grid gap-1.5">
            <Label>Maks. persentase (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={rules.max_percent}
              onChange={(e) =>
                patch({ max_percent: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })
              }
            />
            <p className="text-[11px] text-muted-foreground">100 = boleh penuh</p>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Pesan bila saldo tidak bisa dipakai</Label>
          <Textarea
            rows={2}
            value={rules.denied_message}
            onChange={(e) => patch({ denied_message: e.target.value })}
            placeholder={DEFAULT_CASHBACK_RULES.denied_message}
          />
        </div>

        <div className="rounded-lg bg-muted/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Ringkasan aturan aktif</p>
          <p>
            {rules.enabled ? "Aktif" : "Nonaktif"} ·{" "}
            {rules.mode === "all"
              ? "Semua layanan"
              : rules.mode === "categories"
                ? `${rules.allowed_categories.length} kategori`
                : `${rules.allowed_service_ids.length} layanan`}
            {rules.exclude_products ? " · barang dikecualikan" : ""}
          </p>
          <p>
            Minimal transaksi {formatIDR(rules.min_transaction)} · Maks.{" "}
            {rules.max_amount > 0 ? formatIDR(rules.max_amount) : "tanpa batas"} · Maks. {rules.max_percent}%
            dari total
          </p>
        </div>

        <Button onClick={save} disabled={saving} className="w-full sm:w-auto">
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Simpan Aturan
        </Button>
      </CardContent>
    </Card>
  );
}
