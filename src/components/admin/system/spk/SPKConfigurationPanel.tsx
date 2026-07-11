// Phase 5.8 — SPK Operational Configuration Console (Owner UI)
// Reads/writes rules through OperationalConfigService (Phase 5.7). No new
// concepts, no Runtime/Canvas/Builder redesign, no schema changes.
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  ShieldCheck, Save, Users, Hash, Zap, RefreshCw,
} from "lucide-react";
import {
  OperationalConfigService,
  DEFAULT_NUMBERING,
  DEFAULT_AUTOMATION,
  type NumberingConfig,
  type AutomationConfig,
} from "@/services/spk/OperationalConfigService";
import {
  DEFAULT_ROLE_PROFILES,
  DEFAULT_WORKFLOW_ROLES,
  type RoleProfile,
  type SectionCode,
  type SectionScope,
} from "@/runtime/form/RoleProfiles";

const SECTION_CODES: SectionCode[] = [
  "customer", "vehicle", "complaint", "service_order",
  "suspension", "tyre", "ac", "engine", "notes", "time", "approval",
];

// Canonical role list — mirrors the app's real user roles so operational
// config stays in sync with authentication. Each entry maps an app-facing
// role to the SpkActor enum key used by Runtime/Canvas.
//
//   Staff (Owner)  → owner
//   CS Pusat       → admin
//   Admin Cabang   → admin_cabang
//   Mekanik Cabang → mechanic
//   Customer       → system  (read-only observer)
const ROLE_ROWS: { key: string; label: string; appRole: string; hint: string }[] = [
  { key: "owner",        label: "Staff (Owner)",  appRole: "staff",        hint: "Akses penuh — pemilik / super admin." },
  { key: "admin",        label: "CS Pusat",       appRole: "admin",        hint: "Customer service pusat — hampir seluruh akses operasional." },
  { key: "admin_cabang", label: "Admin Cabang",   appRole: "admin_cabang", hint: "Admin per cabang — akses penuh dalam cabangnya." },
  { key: "mechanic",     label: "Mekanik Cabang", appRole: "mekanik",      hint: "Mekanik di cabang — hanya inspeksi & catatan pekerjaan." },
  { key: "system",       label: "Customer",       appRole: "customer",     hint: "Konsumen — hanya melihat SPK miliknya (read-only)." },
];

const SPKConfigurationPanel = () => (
  <Card className="border-white/10 bg-card/60 backdrop-blur-xl">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <ShieldCheck className="h-5 w-5 text-primary" />
        SPK Configuration
        <Badge variant="outline" className="ml-2 text-[10px]">Operational Config</Badge>
      </CardTitle>
      <p className="text-xs text-muted-foreground">
        Ubah aturan operasional SPK tanpa perlu deploy. Perubahan berlaku setelah tekan Simpan.
      </p>
    </CardHeader>
    <CardContent>
      <Tabs defaultValue="roles" className="space-y-4">
        <TabsList className="bg-muted/40 flex-wrap h-auto gap-1">
          <TabsTrigger value="roles" className="gap-1.5"><Users className="h-3.5 w-3.5" />Role Profiles</TabsTrigger>
          <TabsTrigger value="numbering" className="gap-1.5"><Hash className="h-3.5 w-3.5" />Numbering</TabsTrigger>
          <TabsTrigger value="automation" className="gap-1.5"><Zap className="h-3.5 w-3.5" />Automation</TabsTrigger>
        </TabsList>
        <TabsContent value="roles" className="mt-0"><RoleProfilesEditor /></TabsContent>
        <TabsContent value="numbering" className="mt-0"><NumberingEditor /></TabsContent>
        <TabsContent value="automation" className="mt-0"><AutomationEditor /></TabsContent>
      </Tabs>
    </CardContent>
  </Card>
);

/* ---------------- 1. Role Profiles ---------------- */

const isAllVisible = (s: SectionScope) => s === "*";
const scopeHas = (s: SectionScope, code: SectionCode) =>
  s === "*" ? true : (s as string[]).includes(code);

const RoleProfilesEditor = () => {
  const [profiles, setProfiles] = useState<Record<string, RoleProfile>>(DEFAULT_ROLE_PROFILES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await OperationalConfigService.getRaw<Record<string, RoleProfile>>("spk.role_profiles");
      if (raw) setProfiles({ ...DEFAULT_ROLE_PROFILES, ...raw });
      setLoading(false);
    })();
  }, []);

  const toggleAll = (role: string, kind: "visible" | "editable", allOn: boolean) => {
    setProfiles((p) => ({
      ...p,
      [role]: { ...p[role], [kind]: allOn ? "*" : [] } as RoleProfile,
    }));
  };

  const toggleSection = (role: string, kind: "visible" | "editable", code: SectionCode) => {
    setProfiles((p) => {
      const cur = p[role][kind];
      const list: SectionCode[] = cur === "*" ? [...SECTION_CODES] : [...(cur as SectionCode[])];
      const idx = list.indexOf(code);
      if (idx >= 0) list.splice(idx, 1); else list.push(code);
      return { ...p, [role]: { ...p[role], [kind]: list } };
    });
  };

  const save = async () => {
    setSaving(true);
    const { error } = await OperationalConfigService.saveRaw("spk.role_profiles", profiles);
    setSaving(false);
    if (error) return toast.error(error);
    OperationalConfigService.invalidate();
    await OperationalConfigService.load({ force: true });
    toast.success("Role profiles tersimpan");
  };

  const resetDefaults = () => {
    setProfiles({ ...DEFAULT_ROLE_PROFILES });
    toast.info("Menggunakan default — tekan Simpan untuk menerapkan");
  };

  if (loading) return <div className="text-sm text-muted-foreground p-4">Memuat konfigurasi…</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/10 bg-muted/10 p-3 text-[11px] text-muted-foreground">
        Perubahan Role Profiles otomatis sinkron ke Workflow (transitions yang boleh dijalankan tiap role) dan Canvas
        SPK aktif tanpa perlu reload.
      </div>
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-2 sticky left-0 bg-muted/40 z-10">Role</th>
              <th className="text-left p-2">Scope</th>
              {SECTION_CODES.map((c) => (
                <th key={c} className="p-2 text-center capitalize whitespace-nowrap">{c.replace("_", " ")}</th>
              ))}
              <th className="p-2 text-center">All</th>
            </tr>
          </thead>
          <tbody>
            {ROLE_ROWS.map(({ key: role, label, appRole, hint }) => {
              const prof = profiles[role] ?? { visible: [], editable: [] };
              const wfRoles = prof.workflow_roles ?? DEFAULT_WORKFLOW_ROLES[role] ?? [];
              return (
                <>
                  <tr key={`${role}-v`} className="border-t border-white/10">
                    <td rowSpan={2} className="p-2 font-medium sticky left-0 bg-card/60 z-10 align-top">
                      {label}
                      <div className="text-[10px] text-muted-foreground font-normal">
                        app role: <code>{appRole}</code>
                      </div>
                      <div className="text-[10px] text-muted-foreground font-normal mt-1 max-w-[180px]">
                        {hint}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 font-normal mt-1 max-w-[180px]">
                        workflow: {wfRoles.length ? wfRoles.join(", ") : <em>none (read-only)</em>}
                      </div>
                    </td>
                    <td className="p-2 text-muted-foreground">Visible</td>
                    {SECTION_CODES.map((c) => (
                      <td key={c} className="text-center p-1">
                        <Checkbox
                          checked={scopeHas(prof.visible, c)}
                          onCheckedChange={() => toggleSection(role, "visible", c)}
                        />
                      </td>
                    ))}
                    <td className="text-center p-1">
                      <Checkbox
                        checked={isAllVisible(prof.visible)}
                        onCheckedChange={(v) => toggleAll(role, "visible", !!v)}
                      />
                    </td>
                  </tr>
                  <tr key={`${role}-e`} className="border-b border-white/10">
                    <td className="p-2 text-muted-foreground">Editable</td>
                    {SECTION_CODES.map((c) => (
                      <td key={c} className="text-center p-1">
                        <Checkbox
                          checked={scopeHas(prof.editable, c)}
                          onCheckedChange={() => toggleSection(role, "editable", c)}
                          disabled={!scopeHas(prof.visible, c)}
                        />
                      </td>
                    ))}
                    <td className="text-center p-1">
                      <Checkbox
                        checked={isAllVisible(prof.editable)}
                        onCheckedChange={(v) => toggleAll(role, "editable", !!v)}
                      />
                    </td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-red-500 to-yellow-400 text-white">
          <Save className="h-4 w-4 mr-2" /> {saving ? "Menyimpan…" : "Simpan Role Profiles"}
        </Button>
        <Button variant="outline" onClick={resetDefaults}>
          <RefreshCw className="h-4 w-4 mr-2" /> Kembalikan Default
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Editable otomatis dinonaktifkan bila section tidak Visible untuk role tersebut.
      </p>
    </div>
  );
};

/* ---------------- 4. Numbering ---------------- */

const applyPattern = (n: NumberingConfig, seq: number, branch = "MAIN"): string => {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const padded = String(seq).padStart(Math.max(1, n.seq_padding), "0");
  const tokens: Record<string, string> = {
    "{PREFIX}": n.prefix, "{YYYY}": yyyy, "{YY}": yy,
    "{MM}": mm, "{DD}": dd, "{BRANCH}": branch, "{SEQ}": padded,
  };
  let out = n.pattern;
  for (const [k, v] of Object.entries(tokens)) out = out.split(k).join(v);
  return out;
};

const NumberingEditor = () => {
  const [cfg, setCfg] = useState<NumberingConfig>(DEFAULT_NUMBERING);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await OperationalConfigService.getRaw<Partial<NumberingConfig>>("spk.numbering");
      if (raw) setCfg({ ...DEFAULT_NUMBERING, ...raw });
    })();
  }, []);

  const preview = useMemo(() => applyPattern(cfg, 1), [cfg]);
  const preview42 = useMemo(() => applyPattern(cfg, 42), [cfg]);

  const save = async () => {
    setSaving(true);
    const { error } = await OperationalConfigService.saveRaw("spk.numbering", cfg);
    setSaving(false);
    if (error) return toast.error(error);
    OperationalConfigService.invalidate();
    toast.success("Numbering pattern tersimpan");
  };

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Prefix</Label>
          <Input value={cfg.prefix} onChange={(e) => setCfg({ ...cfg, prefix: e.target.value.toUpperCase() })} />
        </div>
        <div className="space-y-1.5">
          <Label>Padding Sequence</Label>
          <Input
            type="number" min={1} max={8}
            value={cfg.seq_padding}
            onChange={(e) => setCfg({ ...cfg, seq_padding: Math.max(1, Math.min(8, Number(e.target.value) || 1)) })}
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Pattern</Label>
          <Input value={cfg.pattern} onChange={(e) => setCfg({ ...cfg, pattern: e.target.value })} />
          <p className="text-[11px] text-muted-foreground">
            Token yang tersedia: <code>{"{PREFIX} {YYYY} {YY} {MM} {DD} {BRANCH} {SEQ}"}</code>
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Reset Sequence</Label>
          <select
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={cfg.reset_period}
            onChange={(e) => setCfg({ ...cfg, reset_period: e.target.value as NumberingConfig["reset_period"] })}
          >
            <option value="never">Tidak pernah</option>
            <option value="daily">Harian</option>
            <option value="monthly">Bulanan</option>
            <option value="yearly">Tahunan</option>
          </select>
        </div>
      </div>
      <div className="rounded-xl border border-white/10 bg-muted/20 p-3 space-y-1">
        <div className="text-xs text-muted-foreground">Preview</div>
        <div className="font-mono text-sm">{preview}</div>
        <div className="font-mono text-sm">{preview42}</div>
      </div>
      <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-red-500 to-yellow-400 text-white">
        <Save className="h-4 w-4 mr-2" /> {saving ? "Menyimpan…" : "Simpan"}
      </Button>
    </div>
  );
};

/* ---------------- 5. Automation ---------------- */

const AutomationEditor = () => {
  const [cfg, setCfg] = useState<AutomationConfig>(DEFAULT_AUTOMATION);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const raw = await OperationalConfigService.getRaw<Partial<AutomationConfig>>("spk.automation");
      if (raw) setCfg({ ...DEFAULT_AUTOMATION, ...raw });
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await OperationalConfigService.saveRaw("spk.automation", cfg);
    setSaving(false);
    if (error) return toast.error(error);
    OperationalConfigService.invalidate();
    toast.success("Automation tersimpan");
  };

  const Row = ({ id, label, hint }: { id: keyof AutomationConfig; label: string; hint: string }) => (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-muted/20 p-3">
      <div>
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={cfg[id]} onCheckedChange={(v) => setCfg({ ...cfg, [id]: v })} />
    </div>
  );

  return (
    <div className="space-y-3">
      <Row id="auto_save" label="Auto Save" hint="Perubahan tersimpan otomatis di latar belakang." />
      <Row id="auto_collapse" label="Auto Collapse" hint="Section yang sudah selesai otomatis diciutkan." />
      <Row id="auto_scroll" label="Auto Scroll" hint="Lompat otomatis ke section berikutnya setelah section selesai." />
      <Row id="resume_position" label="Resume Position" hint="Ingat section terakhir yang diedit lalu tawarkan lanjutan." />
      <Row id="auto_timeline" label="Auto Timeline" hint="Setiap perubahan tercatat otomatis di timeline SPK." />
      <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-red-500 to-yellow-400 text-white">
        <Save className="h-4 w-4 mr-2" /> {saving ? "Menyimpan…" : "Simpan"}
      </Button>
    </div>
  );
};

export default SPKConfigurationPanel;