import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, AlertTriangle, Plus, Trash2, Shield } from "lucide-react";

type FlaggedUser = {
  id: string;
  full_name: string | null;
  phone: string | null;
  fraud_score: number;
  is_flagged: boolean;
  flagged_reason: string | null;
  flagged_at: string | null;
  signup_ip: string | null;
};

type FraudLog = {
  id: string;
  user_id: string;
  related_user_id: string | null;
  rule: string;
  score_delta: number;
  details: any;
  created_at: string;
  _user?: { full_name: string | null };
};

type IpAllow = {
  ip: string;
  reason: string | null;
  created_at: string;
};

const fmt = (s?: string | null) =>
  s ? new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "-";

const AntiFraudPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [flagged, setFlagged] = useState<FlaggedUser[]>([]);
  const [logs, setLogs] = useState<FraudLog[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [allowlist, setAllowlist] = useState<IpAllow[]>([]);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [savingIp, setSavingIp] = useState(false);

  const load = async () => {
    setLoading(true);
    const [u, l, a] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, phone, fraud_score, is_flagged, flagged_reason, flagged_at, signup_ip")
        .or("is_flagged.eq.true,fraud_score.gte.30")
        .order("fraud_score", { ascending: false })
        .limit(100),
      supabase
        .from("referral_fraud_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("referral_ip_allowlist" as any)
        .select("ip, reason, created_at")
        .order("created_at", { ascending: false }),
    ]);
    const flaggedRows = ((u.data as any) || []) as FlaggedUser[];
    const logRows = ((l.data as any) || []) as FraudLog[];
    setFlagged(flaggedRows);
    setAllowlist(((a.data as any) || []) as IpAllow[]);

    // hydrate names for logs
    const ids = Array.from(new Set(logRows.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, any> = {};
      (profs || []).forEach((p: any) => { map[p.id] = p; });
      setLogs(logRows.map((r) => ({ ...r, _user: map[r.user_id] })));
    } else {
      setLogs(logRows);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addAllowlist = async (ip: string, reason: string) => {
    const cleanIp = ip.trim();
    if (!cleanIp) return;
    setSavingIp(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("referral_ip_allowlist" as any)
      .insert({ ip: cleanIp, reason: reason.trim() || null, created_by: u?.user?.id });
    setSavingIp(false);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "IP di-whitelist" });
      setNewIp(""); setNewReason("");
      load();
    }
  };

  const removeAllowlist = async (ip: string) => {
    const { error } = await supabase.from("referral_ip_allowlist" as any).delete().eq("ip", ip);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  };

  const unflag = async (userId: string, releaseCommissions: boolean) => {
    setBusy(userId);
    const { data, error } = await supabase.rpc("admin_unflag_user" as any, {
      _user_id: userId,
      _release_commissions: releaseCommissions,
    });
    setBusy(null);
    if (error || !(data as any)?.success) {
      toast({ title: "Gagal", description: error?.message || (data as any)?.error, variant: "destructive" });
    } else {
      toast({ title: "Akun di-unflag" });
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold">Akun Bermasalah ({flagged.length})</h3>
          </div>
          {flagged.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Tidak ada akun yang ditandai.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>HP</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Skor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flagged.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.full_name || u.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-xs">{u.phone || "-"}</TableCell>
                      <TableCell className="text-xs">{u.signup_ip || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={u.fraud_score >= 50 ? "destructive" : "outline"}>{u.fraud_score}</Badge>
                      </TableCell>
                      <TableCell>
                        {u.is_flagged ? (
                          <Badge variant="destructive">FLAGGED</Badge>
                        ) : (
                          <Badge variant="outline">Watch</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[260px] truncate">{u.flagged_reason || "-"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy === u.id || !u.is_flagged}
                          onClick={() => unflag(u.id, true)}
                          className="gap-1"
                        >
                          {busy === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ShieldCheck className="h-3 w-3" />}
                          Unflag & Cairkan
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Log Deteksi ({logs.length})</h3>
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Belum ada log fraud.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Rule</TableHead>
                    <TableHead>+Skor</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                      <TableCell className="text-xs">{r._user?.full_name || r.user_id.slice(0, 8)}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{r.rule}</Badge></TableCell>
                      <TableCell className="text-xs font-mono">+{r.score_delta}</TableCell>
                      <TableCell className="text-[11px] text-muted-foreground max-w-[320px] truncate">
                        {r.details ? JSON.stringify(r.details) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-semibold">IP Allowlist ({allowlist.length})</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            IP di daftar ini boleh dipakai untuk mendaftar lebih dari satu kali (contoh: kantor, warnet, jaringan keluarga).
          </p>
          <div className="flex flex-col sm:flex-row gap-2 mb-4">
            <Input
              placeholder="IP address (mis. 103.21.45.10)"
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              className="sm:max-w-[220px]"
            />
            <Input
              placeholder="Alasan (opsional)"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
            />
            <Button onClick={() => addAllowlist(newIp, newReason)} disabled={savingIp || !newIp.trim()} size="sm" className="gap-1">
              {savingIp ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
              Tambah
            </Button>
          </div>
          {allowlist.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">Belum ada IP yang di-whitelist.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Ditambahkan</TableHead>
                    <TableHead className="w-[80px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allowlist.map((a) => (
                    <TableRow key={a.ip}>
                      <TableCell className="font-mono text-xs">{a.ip}</TableCell>
                      <TableCell className="text-xs">{a.reason || "-"}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">{fmt(a.created_at)}</TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => removeAllowlist(a.ip)} className="h-7 w-7 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AntiFraudPanel;