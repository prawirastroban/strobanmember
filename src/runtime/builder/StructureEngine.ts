// Phase 4.6 — StructureEngine
// Manages sections + fields inside a draft version. All operations are
// scoped to a single spk_form_template_versions row; published versions
// must not be structurally edited (guarded by the caller / PublishEngine).
import { supabase } from "@/integrations/supabase/client";
import { FormService, type FormStructure } from "@/services/spk/FormService";
import { fail, ok, type ServiceResult } from "@/services/spk/types";
import type { FieldDraft, FormFieldRow, FormSectionRow, SectionDraft } from "./types";

export const StructureEngine = {
  async readStructure(version_id: string): Promise<ServiceResult<FormStructure>> {
    const res = await FormService.loadStructure(version_id);
    if (res.ok === false) return fail(res.error, res.code);
    if (!res.data) return fail("version_not_found", "BUILDER_VER_MISSING");
    return ok(res.data);
  },

  // ─── Sections ────────────────────────────────────────────────────────────
  async upsertSection(
    version_id: string,
    draft: SectionDraft,
  ): Promise<ServiceResult<FormSectionRow>> {
    const payload = {
      id: draft.id,
      template_version_id: version_id,
      code: draft.code,
      title: draft.title,
      description: draft.description ?? null,
      display_order: draft.display_order ?? 0,
      is_collapsible: draft.is_collapsible ?? false,
      default_collapsed: draft.default_collapsed ?? false,
      visible_when: (draft.visible_when ?? null) as never,
    };
    const q = draft.id
      ? supabase.from("spk_form_sections").update(payload).eq("id", draft.id).select("*").maybeSingle()
      : supabase.from("spk_form_sections").insert(payload).select("*").maybeSingle();
    const { data, error } = await q;
    if (error || !data) return fail(error?.message ?? "section_upsert_failed");
    return ok(data as FormSectionRow);
  },

  async deleteSection(section_id: string): Promise<ServiceResult<true>> {
    // Fields cascade via FK; conditional rules referencing this section id
    // are the caller's responsibility (RuleEngine.cleanupOrphans).
    const { error } = await supabase.from("spk_form_sections").delete().eq("id", section_id);
    if (error) return fail(error.message);
    return ok(true);
  },

  async reorderSections(
    version_id: string,
    ordered_ids: string[],
  ): Promise<ServiceResult<true>> {
    for (let i = 0; i < ordered_ids.length; i++) {
      const { error } = await supabase
        .from("spk_form_sections")
        .update({ display_order: i })
        .eq("id", ordered_ids[i])
        .eq("template_version_id", version_id);
      if (error) return fail(error.message);
    }
    return ok(true);
  },

  // ─── Fields ──────────────────────────────────────────────────────────────
  async upsertField(draft: FieldDraft): Promise<ServiceResult<FormFieldRow>> {
    if (!draft.section_id) return fail("field_missing_section", "FIELD_NO_SECTION");
    const payload = {
      id: draft.id,
      section_id: draft.section_id,
      code: draft.code,
      label: draft.label,
      field_type: draft.field_type,
      helper_text: draft.helper_text ?? null,
      is_required: draft.is_required ?? false,
      is_locked_after_snapshot: draft.is_locked_after_snapshot ?? false,
      display_order: draft.display_order ?? 0,
      default_value: (draft.default_value ?? null) as never,
      options: (draft.options ?? null) as never,
      validation: (draft.validation ?? null) as never,
    };
    const q = draft.id
      ? supabase.from("spk_form_fields").update(payload).eq("id", draft.id).select("*").maybeSingle()
      : supabase.from("spk_form_fields").insert(payload).select("*").maybeSingle();
    const { data, error } = await q;
    if (error || !data) return fail(error?.message ?? "field_upsert_failed");
    return ok(data as FormFieldRow);
  },

  async deleteField(field_id: string): Promise<ServiceResult<true>> {
    const { error } = await supabase.from("spk_form_fields").delete().eq("id", field_id);
    if (error) return fail(error.message);
    return ok(true);
  },

  async reorderFields(
    section_id: string,
    ordered_ids: string[],
  ): Promise<ServiceResult<true>> {
    for (let i = 0; i < ordered_ids.length; i++) {
      const { error } = await supabase
        .from("spk_form_fields")
        .update({ display_order: i })
        .eq("id", ordered_ids[i])
        .eq("section_id", section_id);
      if (error) return fail(error.message);
    }
    return ok(true);
  },

  async moveField(field_id: string, new_section_id: string): Promise<ServiceResult<FormFieldRow>> {
    const { data, error } = await supabase
      .from("spk_form_fields")
      .update({ section_id: new_section_id })
      .eq("id", field_id)
      .select("*")
      .maybeSingle();
    if (error || !data) return fail(error?.message ?? "field_move_failed");
    return ok(data as FormFieldRow);
  },
};
