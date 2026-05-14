import { useEffect, useState } from "react";
import { Loader2, Save, RotateCcw, Inbox } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LEGAL_SLUGS, LEGAL_META, type LegalSlug } from "@/pages/LegalPage";
import ComplaintInbox from "@/components/admin/ComplaintInbox";

type Doc = { slug: LegalSlug; title: string; content: string; version: number; updated_at: string };

const LegalDocumentsManager = () => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Record<string, Doc>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);
  const [tab, setTab] = useState<string>("terms");

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any).from("legal_documents").select("*");
    const map: Record<string, Doc> = {};
    (data || []).forEach((d: Doc) => { map[d.slug] = d; });
    setDocs(map);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = (slug: string, patch: Partial<Doc>) => {
    setDocs((prev) => ({ ...prev, [slug]: { ...prev[slug], ...patch } as Doc }));
  };

  const save = async (slug: string, bumpVersion: boolean) => {
    const d = docs[slug];
    if (!d) return;
    setSavingSlug(slug);
    const { error } = await (supabase as any)
      .from("legal_documents")
      .update({
        title: d.title,
        content: d.content,
        version: bumpVersion ? (d.version || 1) + 1 : d.version,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      })
      .eq("slug", slug);
    setSavingSlug(null);
    if (error) { toast.error("Gagal menyimpan: " + error.message); return; }
    toast.success("Tersimpan.");
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="flex flex-wrap h-auto">
        {LEGAL_SLUGS.map((s) => (
          <TabsTrigger key={s} value={s}>{LEGAL_META[s].label}</TabsTrigger>
        ))}
        <TabsTrigger value="inbox"><Inbox className="h-3.5 w-3.5 mr-1" />Pengaduan Masuk</TabsTrigger>
      </TabsList>

      {LEGAL_SLUGS.map((slug) => {
        const d = docs[slug];
        const [bump, setBump] = [false, () => {}]; // placeholder, we use uncontrolled below via local state
        return (
          <TabsContent key={slug} value={slug}>
            <DocEditor
              doc={d}
              slug={slug}
              saving={savingSlug === slug}
              onChange={(patch) => update(slug, patch)}
              onSave={(bv) => save(slug, bv)}
              publicPath={LEGAL_META[slug].path}
            />
          </TabsContent>
        );
      })}

      <TabsContent value="inbox">
        <ComplaintInbox />
      </TabsContent>
    </Tabs>
  );
};

function DocEditor({
  doc, slug, saving, onChange, onSave, publicPath,
}: {
  doc: Doc | undefined;
  slug: string;
  saving: boolean;
  onChange: (patch: Partial<Doc>) => void;
  onSave: (bumpVersion: boolean) => void;
  publicPath: string;
}) {
  const [bump, setBump] = useState(false);
  if (!doc) return <p className="text-sm text-muted-foreground py-8">Dokumen belum tersedia.</p>;
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">Edit dokumen</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">v{doc.version}</Badge>
            <a href={publicPath} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">Lihat halaman publik →</a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`title-${slug}`}>Judul</Label>
          <Input id={`title-${slug}`} value={doc.title} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
        <div>
          <Label htmlFor={`content-${slug}`}>Isi (plain text / markdown sederhana)</Label>
          <Textarea
            id={`content-${slug}`}
            rows={20}
            value={doc.content}
            onChange={(e) => onChange({ content: e.target.value })}
            className="font-mono text-sm"
          />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={bump} onChange={(e) => setBump(e.target.checked)} className="h-4 w-4" />
            Naikkan versi (catat sebagai pembaruan resmi)
          </label>
          <p className="text-xs text-muted-foreground">Terakhir diperbarui: {new Date(doc.updated_at).toLocaleString("id-ID")}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => onSave(bump)} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Simpan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default LegalDocumentsManager;