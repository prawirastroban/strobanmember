// Phase 4.6 — PublishEngine
// Activates a version as the template's current published version.
// Published versions are frozen (structural edits should be refused by callers).
// Older versions remain intact and continue to serve SPKs already referencing them
// via their own version snapshot — publish only steers NEW SPKs to the new version.
//
// Rollback = re-publish a previous version. The DB does not delete history.
import { supabase } from "@/integrations/supabase/client";
import { fail, ok, type ServiceResult } from "@/services/spk/types";
import { CompatibilityValidator } from "./CompatibilityValidator";
import type { BuilderActor, CompatibilityReport, FormTemplateRow, FormVersionRow } from "./types";

function isoNow(): string {
  return new Date().toISOString();
}

async function tagLifecycle(
  version_id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { data: cur } = await supabase
    .from("spk_form_template_versions")
    .select("snapshot")
    .eq("id", version_id)
    .maybeSingle();
  const snap = ((cur?.snapshot as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  Object.assign(snap, patch);
  await supabase
    .from("spk_form_template_versions")
    .update({ snapshot: snap as never, updated_at: isoNow() })
    .eq("id", version_id);
}

export const PublishEngine = {
  /**
   * Publish `version_id` as the current version for its template.
   * Runs the CompatibilityValidator first; refuses if errors exist.
   */
  async publish(
    version_id: string,
    actor: BuilderActor,
    opts?: { skipValidation?: boolean; rollback?: boolean },
  ): Promise<ServiceResult<{ template: FormTemplateRow; version: FormVersionRow; report: CompatibilityReport | null }>> {
    let report: CompatibilityReport | null = null;
    if (!opts?.skipValidation) {
      const r = await CompatibilityValidator.validate(version_id);
      if (r.ok === false) return fail(r.error, r.code);
      if (!r.data.ok) return fail("compatibility_failed", "PUBLISH_INCOMPATIBLE");
      report = r.data;
    }

    const { data: ver, error: verErr } = await supabase
      .from("spk_form_template_versions")
      .update({
        is_published: true,
        published_at: isoNow(),
        published_by: actor.user_id,
        updated_at: isoNow(),
      })
      .eq("id", version_id)
      .select("*")
      .maybeSingle();
    if (verErr || !ver) return fail(verErr?.message ?? "publish_failed");

    // Mark older published versions of the same template as superseded — they
    // remain readable (running SPKs), but is_published flips off to steer new
    // SPK creation to the new version.
    await supabase
      .from("spk_form_template_versions")
      .update({ is_published: false, updated_at: isoNow() })
      .eq("template_id", ver.template_id)
      .neq("id", version_id);

    const { data: tpl, error: tplErr } = await supabase
      .from("spk_form_templates")
      .update({
        current_version_id: ver.id,
        is_active: true,
        updated_at: isoNow(),
      })
      .eq("id", ver.template_id)
      .select("*")
      .maybeSingle();
    if (tplErr || !tpl) return fail(tplErr?.message ?? "template_activate_failed");

    await tagLifecycle(version_id, {
      $lifecycle: opts?.rollback ? "rollback" : "published",
      $published_at: isoNow(),
      $published_by: actor.user_id ?? null,
    });

    return ok({ template: tpl as FormTemplateRow, version: ver as FormVersionRow, report });
  },

  /** Roll back to a previous version. Uses the same publish path with a rollback tag. */
  async rollback(version_id: string, actor: BuilderActor) {
    return PublishEngine.publish(version_id, actor, { skipValidation: false, rollback: true });
  },

  /** Archive a template (soft): flips is_active off. Existing SPKs unaffected. */
  async archive(template_id: string): Promise<ServiceResult<FormTemplateRow>> {
    const { data, error } = await supabase
      .from("spk_form_templates")
      .update({ is_active: false, updated_at: isoNow() })
      .eq("id", template_id)
      .select("*")
      .maybeSingle();
    if (error || !data) return fail(error?.message ?? "archive_failed");
    return ok(data as FormTemplateRow);
  },

  /** Restore a soft-archived template. */
  async restore(template_id: string): Promise<ServiceResult<FormTemplateRow>> {
    const { data, error } = await supabase
      .from("spk_form_templates")
      .update({ is_active: true, updated_at: isoNow() })
      .eq("id", template_id)
      .select("*")
      .maybeSingle();
    if (error || !data) return fail(error?.message ?? "restore_failed");
    return ok(data as FormTemplateRow);
  },
};
