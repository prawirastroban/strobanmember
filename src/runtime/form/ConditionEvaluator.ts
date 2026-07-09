// Phase 4.5 — ConditionEvaluator
// Pure evaluator for JSON conditional expressions used by section visibility
// (spk_form_sections.visible_when) and conditional rules (spk_form_conditional_rules.rule).
// No IO. Deterministic. Unknown shapes → false (fail-closed for visibility).
import type { BinaryOp, ConditionExpr, ExprValue, FormRuntimeContext } from "./types";

function resolve(v: ExprValue, ctx: FormRuntimeContext): unknown {
  if (v === null) return null;
  if (typeof v !== "object") return v;
  if ("var" in v) return ctx.values[v.var];
  if ("state" in v) return ctx.workflow_state;
  if ("role" in v) return ctx.role;
  if ("flag" in v) return ctx.flags?.[v.flag];
  if ("const" in v) return v.const;
  return undefined;
}

function cmp(op: BinaryOp, a: unknown, b: unknown): boolean {
  switch (op) {
    case "eq":
      return a === b;
    case "ne":
      return a !== b;
    case "gt":
      return typeof a === "number" && typeof b === "number" && a > b;
    case "gte":
      return typeof a === "number" && typeof b === "number" && a >= b;
    case "lt":
      return typeof a === "number" && typeof b === "number" && a < b;
    case "lte":
      return typeof a === "number" && typeof b === "number" && a <= b;
    case "in":
      return Array.isArray(b) && b.includes(a);
    case "not_in":
      return Array.isArray(b) && !b.includes(a);
    case "contains":
      if (Array.isArray(a)) return a.includes(b);
      if (typeof a === "string" && typeof b === "string") return a.includes(b);
      return false;
  }
}

export const ConditionEvaluator = {
  /** Evaluate an expression to a boolean. `null`/`undefined` → true (no condition). */
  evaluate(expr: ConditionExpr, ctx: FormRuntimeContext): boolean {
    if (expr === null || expr === undefined) return true;
    if (typeof expr !== "object") return false;

    if ("all" in expr) return expr.all.every((e) => ConditionEvaluator.evaluate(e, ctx));
    if ("any" in expr) return expr.any.some((e) => ConditionEvaluator.evaluate(e, ctx));
    if ("not" in expr) return !ConditionEvaluator.evaluate(expr.not, ctx);
    if ("truthy" in expr) return Boolean(resolve(expr.truthy, ctx));
    if ("falsy" in expr) return !resolve(expr.falsy, ctx);
    if ("op" in expr) return cmp(expr.op, resolve(expr.left, ctx), resolve(expr.right, ctx));
    return false;
  },

  /** Extract field codes referenced via `{var: "code"}` for reactive re-evaluation. */
  collectDeps(expr: unknown, out: Set<string> = new Set()): Set<string> {
    if (!expr || typeof expr !== "object") return out;
    if (Array.isArray(expr)) {
      expr.forEach((e) => ConditionEvaluator.collectDeps(e, out));
      return out;
    }
    const anyExpr = expr as Record<string, unknown>;
    if (typeof anyExpr.var === "string") out.add(anyExpr.var);
    for (const k of Object.keys(anyExpr)) {
      ConditionEvaluator.collectDeps(anyExpr[k], out);
    }
    return out;
  },
};