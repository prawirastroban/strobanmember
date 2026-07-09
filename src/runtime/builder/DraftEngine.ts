// Phase 4.6 — DraftEngine
// Manages draft templates + draft versions. A "draft" is a
// spk_form_template_versions row with is_published = false and
// snapshot.$lifecycle = "draft".
//
// Does NOT publish, does NOT mutate running SPK data.
import { supabase } from "@/integrations/supabase/client";
import { fail, ok, type ServiceResult } from "@/services/spk/types";
import type {
  BuilderActor,
  BuilderDraft,
  BuilderLifecycle,
  FormTemplateRow,
  FormVersionRow,
} from "./types";
import { StructureEngine } from "./StructureEngine";

function isoNow(): string {
  return new Date().toISOString();
}

function readLifecycle(v: FormVersionRow): BuilderLifecycle {
  if (v.is_published) return "published";
  const snap = (v.snapshot ?? null) as Record<string, unknown> | null;
  const lc = snap && typeof snap["$lifecycle"] === "string" ? (snap["$lifecycle"] as BuilderLifecycle) : null;
  return lc ?? "draft";
}

async function patchLifecycle(version_id: string, lifecycle: BuilderLifecycle): Promise<ServiceResult<FormVersionRow>> {
  const { data: current, error: readErr } = await supabase
    .from("spk_form_template_versions")
    .select("*")
    .eq("id", version_id)
    .maybeSingle();
  if (readErr) return fail(readErr.message);
  if (!current) return fail("version_not_found", "BUILDER_VER_MISSING");
  const snap = ((current.snapshot as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  snap["$lifecycle"] = lifecycle;
  snap["$updated_at"] = isoNow();
  const { data, error } = await supabase
    .from("spk_form_template_versions")
    .update({ snapshot: snap as never, updated_at: isoNow() })
    .eq("id", version_id)
    .select("*")
    .maybeSingle();
  if (error || !data) return fail(error?.message ?? "update_failed");
  return ok(data as FormVersionRow);
}

export const DraftEngine = {
  /** Create a brand new template with an initial empty draft version. */
  async createTemplate(
    input: { code: string; name: string; description?: string | null },
    actor: BuilderActor,
  ): Promise<ServiceResult<{ template: FormTemplateRow; version: FormVersionRow }>> {
    const { data: tpl, error: tplErr } = await supabase
      .from("spk_form_templates")
      .insert({
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        is_active: false, // becomes active on first publish
        created_by: actor.user_id,
      })
      .select("*")
      .maybeSingle();
    if (tplErr || !tpl) return fail(tplErr?.message ?? "template_create_failed");

    const { data: ver, error: verErr } = await supabase
      .from("spk_form_template_versions")
      .insert({
        template_id: tpl.id,
        version_number: 1,
        is_published: false,
        snapshot: { $lifecycle: "draft", $created_at: isoNow() } as never,
      })
      .select("*")
      .maybeSingle();
    if (verErr || !ver) return fail(verErr?.message ?? "version_create_failed");
    return ok({ template: tpl as FormTemplateRow, version: ver as FormVersionRow });
  },

  /** Load a draft (or any version) with sections/fields/rules attached. */
  async loadDraft(version_id: string): Promise<ServiceResult<BuilderDraft>> {
    const struct = await StructureEngine.readStructure(version_id);
    if (struct.ok === false) return fail(struct.error, struct.code);
    const s = struct.data;
    return ok({
      template: s.template,
      version: s.version,
      sections: s.sections,
      rules: s.rules,
      lifecycle: readLifecycle(s.version),
    });
  },

  /** Edit basic template attributes. Never toggles is_active — Publish/Archive engines own that. */
  async updateTemplate(
    template_id: string,
    patch: { name?: string; description?: string | null; code?: string },
  ): Promise<ServiceResult<FormTemplateRow>> {
    const { data, error } = await supabase
      .from("spk_form_templates")
      .update({ ...patch, updated_at: isoNow() })
      .eq("id", template_id)
      .select("*")
      .maybeSingle();
    if (error || !data) return fail(error?.message ?? "template_update_failed");
    return ok(data as FormTemplateRow);
  },

  /** Move draft → review (soft gate for compatibility validation before publish). */
  markForReview(version_id: string) {
    return patchLifecycle(version_id, "review");
  },

  /** Move review → draft (revert to editing). */
  markAsDraft(version_id: string) {
    return patchLifecycle(version_id, "draft");
  },

  readLifecycle,
};
