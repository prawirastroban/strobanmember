import { supabase } from "@/integrations/supabase/client";

export type SpkLoadNameMaps = {
  mechanicNames: Record<string, string>;
  branchNames: Record<string, string>;
};

type SpkLoadNameRow = {
  kind: string;
  id: string;
  name: string | null;
};

export const UNASSIGNED_MECHANIC_LABEL = "Belum ditugaskan";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && UUID_RE.test(value.trim());

export const textValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (value === null || value === undefined) return "";
  return String(value).trim();
};

export const asSnapshot = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const getMechanicIdFromSnapshot = (snapshot: Record<string, unknown>): string => {
  const candidates = [
    snapshot.mechanic_id,
    snapshot.mechanic_user_id,
    snapshot.assigned_mechanic_id,
  ];
  for (const candidate of candidates) {
    const raw = textValue(candidate);
    if (isUuid(raw)) return raw;
  }
  return "";
};

export async function resolveSpkLoadNames(params: {
  userIds?: string[];
  branchIds?: string[];
}): Promise<SpkLoadNameMaps> {
  const userIds = Array.from(new Set((params.userIds ?? []).filter(isUuid)));
  const branchIds = Array.from(new Set((params.branchIds ?? []).filter(isUuid)));
  const mechanicNames: Record<string, string> = {};
  const branchNames: Record<string, string> = {};

  if (userIds.length === 0 && branchIds.length === 0) {
    return { mechanicNames, branchNames };
  }

  const { data, error } = await supabase.rpc("get_spk_load_names", {
    _user_ids: userIds,
    _branch_ids: branchIds,
  });

  if (error) {
    console.error("[SPK] get_spk_load_names", error);
    if (branchIds.length > 0) {
      const { data: branches, error: branchError } = await supabase
        .from("branches")
        .select("id, name")
        .in("id", branchIds);
      if (branchError) console.error("[SPK] branch name fallback", branchError);
      for (const branch of branches ?? []) {
        const name = textValue((branch as { name?: unknown }).name);
        if (branch.id && name) branchNames[branch.id] = name;
      }
    }
    return { mechanicNames, branchNames };
  }

  for (const row of (data ?? []) as SpkLoadNameRow[]) {
    if (!row.id || !row.name) continue;
    if (row.kind === "user") mechanicNames[row.id] = row.name;
    if (row.kind === "branch") branchNames[row.id] = row.name;
  }

  return { mechanicNames, branchNames };
}

/** SPK owner role yang berarti "mekanik" (enum DB `mechanic`, legacy `mekanik`). */
export const isMechanicOwnerRole = (role: unknown): boolean => {
  const r = textValue(role).toLowerCase();
  return r === "mechanic" || r === "mekanik" || r === "head_mekanik";
};
