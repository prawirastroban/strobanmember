// Phase 4.6 — RuleEngine
// Manages metadata rules: validation (on fields), visibility (on sections),
// conditional/repeatable/default_value effects (via spk_form_conditional_rules).
// Field-level validation and default_value live on spk_form_fields columns and
// are updated through StructureEngine.upsertField — this engine focuses on the
// conditional-rule table and cross-cutting cleanup.
import { supabase } from "@/integrations/supabase/client";
import { fail, ok, type ServiceResult } from "@/services/spk/types";
import { StructureEngine } from "./StructureEngine";
import type { FormRuleRow, RuleDraft } from "./types";

async function resolveTargetId(
  version_id: string,
  draft: RuleDraft,
): Promise<ServiceResult<string>> {
  if (draft.target_id) return ok(draft.target_id);
  if (!draft.target_code) return fail("rule_missing_target", "RULE_NO_TARGET");
  const struct = await StructureEngine.readStructure(version_id);
  if (struct.ok === false) return fail(struct.error, struct.code);
  if (draft.target_type === "section") {
    const s = struct.data.sections.find((x) => x.code === draft.target_code);
    return s ? ok(s.id) : fail("rule_target_section_not_found", "RULE_TARGET_MISS");
  }
  for (const s of struct.data.sections) {
    const f = s.fields.find((x) => x.code === draft.target_code);
    if (f) return ok(f.id);
  }
  return fail("rule_target_field_not_found", "RULE_TARGET_MISS");
}

export const RuleEngine = {
  async list(version_id: string): Promise<ServiceResult<FormRuleRow[]>> {
    const { data, error } = await supabase
      .from("spk_form_conditional_rules")
      .select("*")
      .eq("template_version_id", version_id);
    if (error) return fail(error.message);
    return ok((data ?? []) as FormRuleRow[]);
  },

  async upsert(version_id: string, draft: RuleDraft): Promise<ServiceResult<FormRuleRow>> {
    const target = await resolveTargetId(version_id, draft);
    if (target.ok === false) return fail(target.error, target.code);
    const payload = {
      id: draft.id,
      template_version_id: version_id,
      target_type: draft.target_type,
      target_id: target.data,
      effect: draft.effect,
      rule: (draft.rule ?? {}) as never,
    };
    const q = draft.id
      ? supabase.from("spk_form_conditional_rules").update(payload).eq("id", draft.id).select("*").maybeSingle()
      : supabase.from("spk_form_conditional_rules").insert(payload).select("*").maybeSingle();
    const { data, error } = await q;
    if (error || !data) return fail(error?.message ?? "rule_upsert_failed");
    return ok(data as FormRuleRow);
  },

  async delete(rule_id: string): Promise<ServiceResult<true>> {
    const { error } = await supabase.from("spk_form_conditional_rules").delete().eq("id", rule_id);
    if (error) return fail(error.message);
    return ok(true);
  },

  /** Remove rules whose target no longer exists in the version (post-structural edits). */
  async cleanupOrphans(version_id: string): Promise<ServiceResult<number>> {
    const struct = await StructureEngine.readStructure(version_id);
    if (struct.ok === false) return fail(struct.error, struct.code);
    const validIds = new Set<string>();
    struct.data.sections.forEach((s) => {
      validIds.add(s.id);
      s.fields.forEach((f) => validIds.add(f.id));
    });
    const orphans = struct.data.rules.filter((r) => !validIds.has(r.target_id));
    let removed = 0;
    for (const r of orphans) {
      const res = await RuleEngine.delete(r.id);
      if (res.ok) removed++;
    }
    return ok(removed);
  },
};
