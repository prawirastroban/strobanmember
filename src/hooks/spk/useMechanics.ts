// Daftar akun mekanik untuk penugasan SPK ("dikerjakan oleh mekanik siapa").
// Query mengikuti pola UserRolesManager (profiles + user_roles) yang sudah
// terbukti lolos RLS untuk pengguna internal.
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface MechanicOption {
  id: string;
  name: string;
  branch: string | null;
}

const normalize = (v: unknown) =>
  String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function useMechanics() {
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: roles, error: rolesError } = await supabase
          .from("user_roles")
          .select("user_id, role");
        if (rolesError) throw rolesError;

        const ids = Array.from(
          new Set(
            (roles ?? [])
              .filter((r) => r.role === "mekanik" || (r.role as string) === "head_mekanik")
              .map((r) => r.user_id)
              .filter(Boolean),
          ),
        );
        if (ids.length === 0) {
          if (!cancelled) setMechanics([]);
          return;
        }

        const { data: profiles, error: profileError } = await supabase
          .from("profiles")
          .select("id, full_name, assigned_branch")
          .in("id", ids);
        if (profileError) throw profileError;

        const list: MechanicOption[] = (profiles ?? [])
          .map((p) => ({
            id: p.id as string,
            name: String((p as { full_name?: string | null }).full_name ?? "").trim() ||
              `Mekanik ${String(p.id).slice(0, 8)}`,
            branch: ((p as { assigned_branch?: string | null }).assigned_branch ?? null),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "id"));

        if (!cancelled) setMechanics(list);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "gagal memuat mekanik");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Filter per cabang; kembali ke daftar penuh bila tak ada yang cocok. */
  const forBranch = useMemo(
    () => (branch?: string | null) => {
      const needle = normalize(branch);
      if (!needle) return mechanics;
      const hit = mechanics.filter((m) => {
        const b = normalize(m.branch);
        return !!b && (b === needle || b.includes(needle) || needle.includes(b));
      });
      return hit.length ? hit : mechanics;
    },
    [mechanics],
  );

  return { mechanics, forBranch, loading, error };
}
