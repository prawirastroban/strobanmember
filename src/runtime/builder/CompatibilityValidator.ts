// Phase 4.6 — CompatibilityValidator
// Pure metadata validator. Runs before Publish to prevent broken schemas
// from becoming active. No IO beyond a single StructureEngine.readStructure.
import { ConditionEvaluator } from "@/runtime/form/ConditionEvaluator";
import { fail, ok, type ServiceResult } from "@/services/spk/types";
import { StructureEngine } from "./StructureEngine";
import type { CompatibilityIssue, CompatibilityReport } from "./types";

export const CompatibilityValidator = {
  async validate(version_id: string): Promise<ServiceResult<CompatibilityReport>> {
    const struct = await StructureEngine.readStructure(version_id);
    if (struct.ok === false) return fail(struct.error, struct.code);
    const s = struct.data;
    const issues: CompatibilityIssue[] = [];

    if (s.sections.length === 0) {
      issues.push({ code: "NO_SECTIONS", severity: "error", message: "Template has no sections." });
    }

    const sectionCodes = new Set<string>();
    const fieldCodes = new Set<string>();
    const validIds = new Set<string>();
    const fieldCodeById = new Map<string, string>();

    for (const sec of s.sections) {
      if (sectionCodes.has(sec.code)) {
        issues.push({
          code: "DUP_SECTION_CODE",
          severity: "error",
          message: `Duplicate section code: ${sec.code}`,
          ref: sec.id,
        });
      }
      sectionCodes.add(sec.code);
      validIds.add(sec.id);

      if (sec.fields.length === 0) {
        issues.push({
          code: "EMPTY_SECTION",
          severity: "warning",
          message: `Section "${sec.code}" has no fields.`,
          ref: sec.id,
        });
      }

      for (const f of sec.fields) {
        if (fieldCodes.has(f.code)) {
          issues.push({
            code: "DUP_FIELD_CODE",
            severity: "error",
            message: `Duplicate field code across template: ${f.code}`,
            ref: f.id,
          });
        }
        fieldCodes.add(f.code);
        validIds.add(f.id);
        fieldCodeById.set(f.id, f.code);

        if (!f.section_id || f.section_id !== sec.id) {
          issues.push({
            code: "ORPHAN_FIELD",
            severity: "error",
            message: `Field "${f.code}" has no valid parent section.`,
            ref: f.id,
          });
        }
      }
    }

    for (const rule of s.rules) {
      if (!validIds.has(rule.target_id)) {
        issues.push({
          code: "RULE_UNKNOWN_TARGET",
          severity: "error",
          message: `Rule ${rule.id} targets a missing ${rule.target_type}.`,
          ref: rule.id,
        });
      }
      const deps = ConditionEvaluator.collectDeps(rule.rule);
      deps.forEach((code) => {
        if (!fieldCodes.has(code)) {
          issues.push({
            code: "RULE_UNKNOWN_FIELD_REF",
            severity: "error",
            message: `Rule ${rule.id} references unknown field code "${code}".`,
            ref: rule.id,
          });
        }
      });
    }

    const hasErrors = issues.some((i) => i.severity === "error");
    return ok({ ok: !hasErrors, issues });
  },
};
