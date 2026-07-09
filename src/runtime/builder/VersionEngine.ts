// Phase 4.6 — VersionEngine
// Manages version lifecycle: create a new draft version by cloning an existing
// one (structure + rules), list versions, and read a specific version. Never
// mutates published versions — running SPKs continue to reference their own
// snapshot without impact.
import { supabase } from "@/integrations/supabase/client";
import { fail, ok, type ServiceResult } from "@/services/spk/types";
import { StructureEngine } from "./StructureEngine";
import type { FormVersionRow } from "./types";

function isoNow(): string {
  return new Date().toISOString();
}

export const VersionEngine = {
  async list(template_id: string): Promise<ServiceResult<FormVersionRow[]>> {
    const { data, error } = await supabase
      .from("spk_form_template_versions")
      .select("*")
      .eq("template_id", template_id)
      .order("version_number", { ascending: false });
    if (error) return fail(error.message);
    return ok((data ?? []) as FormVersionRow[]);
  },

  async get(version_id: string): Promise<ServiceResult<FormVersionRow>> {
    const { data, error } = await supabase
      .from("spk_form_template_versions")
      .select("*")
      .eq("id", version_id)
      .maybeSingle();
    if (error) return fail(error.message);
    if (!data) return fail("version_not_found", "BUILDER_VER_MISSING");
    return ok(data as FormVersionRow);
  },

  /** Clone a version's sections/fields/rules into a brand new draft version. */
  async createFrom(source_version_id: string): Promise<ServiceResult<FormVersionRow>> {
    const struct = await StructureEngine.readStructure(source_version_id);
    if (struct.ok === false) return fail(struct.error, struct.code);
    const src = struct.data;

    const list = await VersionEngine.list(src.template.id);
    if (list.ok === false) return fail(list.error, list.code);
    const next = (list.data[0]?.version_number ?? 0) + 1;

    const { data: ver, error: verErr } = await supabase
      .from("spk_form_template_versions")
      .insert({
        template_id: src.template.id,
        version_number: next,
        is_published: false,
        snapshot: {
          $lifecycle: "draft",
          $created_at: isoNow(),
          $forked_from: source_version_id,
        } as never,
      })
      .select("*")
      .maybeSingle();
    if (verErr || !ver) return fail(verErr?.message ?? "version_create_failed");

    // Clone sections → id map → fields → rules (rewriting target_ids).
    const sectionIdMap = new Map<string, string>();
    const fieldIdMap = new Map<string, string>();

    for (const sec of src.sections) {
      const { data: newSec, error } = await supabase
        .from("spk_form_sections")
        .insert({
          template_version_id: ver.id,
          code: sec.code,
          title: sec.title,
          description: sec.description,
          display_order: sec.display_order,
          is_collapsible: sec.is_collapsible,
          default_collapsed: sec.default_collapsed,
          visible_when: sec.visible_when as never,
        })
        .select("id")
        .maybeSingle();
      if (error || !newSec) return fail(error?.message ?? "section_clone_failed");
      sectionIdMap.set(sec.id, newSec.id);

      for (const f of sec.fields) {
        const { data: newField, error: fErr } = await supabase
          .from("spk_form_fields")
          .insert({
            section_id: newSec.id,
            code: f.code,
            label: f.label,
            field_type: f.field_type,
            helper_text: f.helper_text,
            is_required: f.is_required,
            is_locked_after_snapshot: f.is_locked_after_snapshot,
            display_order: f.display_order,
            default_value: f.default_value as never,
            options: f.options as never,
            validation: f.validation as never,
          })
          .select("id")
          .maybeSingle();
        if (fErr || !newField) return fail(fErr?.message ?? "field_clone_failed");
        fieldIdMap.set(f.id, newField.id);
      }
    }

    for (const r of src.rules) {
      const newTarget =
        r.target_type === "section" ? sectionIdMap.get(r.target_id) : fieldIdMap.get(r.target_id);
      if (!newTarget) continue; // orphan rule dropped in the clone
      const { error } = await supabase.from("spk_form_conditional_rules").insert({
        template_version_id: ver.id,
        target_type: r.target_type,
        target_id: newTarget,
        effect: r.effect,
        rule: r.rule as never,
      });
      if (error) return fail(error.message);
    }

    return ok(ver as FormVersionRow);
  },
};
