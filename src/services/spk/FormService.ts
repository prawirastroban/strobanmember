// Phase 4.2 — FormService
// Reads dynamic-form metadata (templates, versions, sections, fields, rules).
// Prepares structure for a renderer; does NOT render UI.
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { fail, ok, type ServiceResult } from "./types";

export type FormTemplateRow = Database["public"]["Tables"]["spk_form_templates"]["Row"];
export type FormVersionRow = Database["public"]["Tables"]["spk_form_template_versions"]["Row"];
export type FormSectionRow = Database["public"]["Tables"]["spk_form_sections"]["Row"];
export type FormFieldRow = Database["public"]["Tables"]["spk_form_fields"]["Row"];
export type FormRuleRow = Database["public"]["Tables"]["spk_form_conditional_rules"]["Row"];

export interface FormStructure {
  template: FormTemplateRow;
  version: FormVersionRow;
  sections: (FormSectionRow & { fields: FormFieldRow[] })[];
  rules: FormRuleRow[];
}

export const FormService = {
  async getActiveTemplateByCode(code: string): Promise<ServiceResult<FormTemplateRow | null>> {
    const { data, error } = await supabase
      .from("spk_form_templates")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .maybeSingle();
    if (error) return fail(error.message);
    return ok((data ?? null) as FormTemplateRow | null);
  },

  async getVersion(version_id: string): Promise<ServiceResult<FormVersionRow | null>> {
    const { data, error } = await supabase
      .from("spk_form_template_versions")
      .select("*")
      .eq("id", version_id)
      .maybeSingle();
    if (error) return fail(error.message);
    return ok((data ?? null) as FormVersionRow | null);
  },

  async loadStructure(version_id: string): Promise<ServiceResult<FormStructure | null>> {
    const ver = await FormService.getVersion(version_id);
    if (ver.ok === false) return fail(ver.error, ver.code);
    if (!ver.data) return ok(null);

    const [tpl, sec, rul] = await Promise.all([
      supabase.from("spk_form_templates").select("*").eq("id", ver.data.template_id).maybeSingle(),
      supabase
        .from("spk_form_sections")
        .select("*")
        .eq("template_version_id", version_id)
        .order("display_order"),
      supabase.from("spk_form_conditional_rules").select("*").eq("template_version_id", version_id),
    ]);
    if (!tpl.data) return fail("template_not_found");

    const sectionIds = (sec.data ?? []).map((s) => s.id);
    const { data: flds } = sectionIds.length
      ? await supabase
          .from("spk_form_fields")
          .select("*")
          .in("section_id", sectionIds)
          .order("display_order")
      : { data: [] as FormFieldRow[] };

    const sections = (sec.data ?? []).map((s) => ({
      ...s,
      fields: (flds ?? []).filter((f) => f.section_id === s.id),
    })) as FormStructure["sections"];

    return ok({
      template: tpl.data as FormTemplateRow,
      version: ver.data,
      sections,
      rules: (rul.data ?? []) as FormRuleRow[],
    });
  },

  /** Basic required-field validation. Type-level validation lives in field.validation JSON. */
  validate(structure: FormStructure, values: Record<string, unknown>): ServiceResult<true> {
    for (const s of structure.sections) {
      for (const f of s.fields) {
        const v = values[f.code];
        if (f.is_required && (v === undefined || v === null || v === "")) {
          return fail(`field_required:${f.code}`, "FIELD_REQUIRED");
        }
      }
    }
    return ok(true);
  },
};
