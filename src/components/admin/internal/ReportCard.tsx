import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { CheckCircle2, Pencil, Trash2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { InternalReport } from "./InternalReports";

interface Props {
  report: InternalReport;
  currentUserId: string;
  isStaff: boolean;
  categoryMeta: Record<InternalReport["category"], { label: string; icon: any; color: string }>;
  onEdit: (r: InternalReport) => void;
  onChanged: () => void;
}

const statusBadge = (status: InternalReport["status"]) => {
  if (status === "fixed") return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">Sudah Diperbaiki</Badge>;
  if (status === "in_progress") return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">In Progress</Badge>;
  return <Badge className="bg-slate-500/15 text-slate-600 border-slate-500/30">Open</Badge>;
};

const ReportCard = ({ report, currentUserId, isStaff, categoryMeta, onEdit, onChanged }: Props) => {
  const { toast } = useToast();
  const meta = categoryMeta[report.category];
  const Icon = meta.icon;
  const isOwner = report.reporter_id === currentUserId;
  const canEdit = (isOwner || isStaff) && report.status !== "fixed";
  const canDelete = (isOwner && report.status !== "fixed") || isStaff;

  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [fixNote, setFixNote] = useState("");
  const [busy, setBusy] = useState(false);

  const handleMarkFixed = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("internal_reports" as any)
      .update({
        status: "fixed",
        fixed_at: new Date().toISOString(),
        fixed_by: currentUserId,
        fixed_note: fixNote.trim() || null,
      })
      .eq("id", report.id);
    setBusy(false);
    if (error) {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ditandai sudah diperbaiki" });
      setFixDialogOpen(false);
      onChanged();
    }
  };

  const handleReopen = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("internal_reports" as any)
      .update({ status: "open", fixed_at: null, fixed_by: null, fixed_note: null })
      .eq("id", report.id);
    setBusy(false);
    if (error) toast({ title: "Gagal", description: error.message, variant: "destructive" });
    else { toast({ title: "Status dibuka kembali" }); onChanged(); }
  };

  const handleDelete = async () => {
    const { error } = await supabase.from("internal_reports" as any).delete().eq("id", report.id);
    if (error) toast({ title: "Gagal hapus", description: error.message, variant: "destructive" });
    else { toast({ title: "Report dihapus" }); onChanged(); }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur p-3 flex flex-col gap-2 hover:border-primary/40 transition">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${meta.color}`} />
          <span className="text-xs font-semibold uppercase tracking-wide">{meta.label}</span>
        </div>
        {statusBadge(report.status)}
      </div>

      {report.image_url && (
        <a href={report.image_url} target="_blank" rel="noreferrer" className="block">
          <img
            src={report.image_url}
            alt={report.title}
            className="w-full h-32 object-cover rounded-md border"
            loading="lazy"
          />
        </a>
      )}

      <h3 className="font-semibold text-sm leading-snug line-clamp-2">{report.title}</h3>
      {report.description && (
        <p className="text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">{report.description}</p>
      )}

      {report.page_url && (
        <a
          href={report.page_url}
          className="text-[11px] text-primary inline-flex items-center gap-1 hover:underline truncate"
        >
          <ExternalLink className="h-3 w-3" /> {report.page_url}
        </a>
      )}

      <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/40">
        <span className="truncate">
          {report.reporter_name || "—"}
          {report.reporter_role && <span className="ml-1 text-muted-foreground/70">· {report.reporter_role}</span>}
        </span>
        <span>{new Date(report.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</span>
      </div>

      {report.status === "fixed" && report.fixed_note && (
        <div className="text-xs rounded-md bg-emerald-500/10 border border-emerald-500/20 p-2 text-emerald-700 dark:text-emerald-400">
          <strong>Catatan perbaikan:</strong> {report.fixed_note}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {isStaff && report.status !== "fixed" && (
          <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1 h-8">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sudah Diperbaiki
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Tandai Sudah Diperbaiki</DialogTitle>
              </DialogHeader>
              <Textarea
                value={fixNote}
                onChange={(e) => setFixNote(e.target.value)}
                placeholder="Catatan perbaikan (opsional)..."
                rows={3}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setFixDialogOpen(false)}>Batal</Button>
                <Button onClick={handleMarkFixed} disabled={busy}>Konfirmasi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {isStaff && report.status === "fixed" && (
          <Button size="sm" variant="outline" className="h-8" onClick={handleReopen} disabled={busy}>
            Buka Kembali
          </Button>
        )}
        {canEdit && (
          <Button size="sm" variant="ghost" className="h-8 gap-1" onClick={() => onEdit(report)}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
        )}
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" /> Hapus
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus report ini?</AlertDialogTitle>
                <AlertDialogDescription>Tindakan ini tidak bisa dibatalkan.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
};

export default ReportCard;