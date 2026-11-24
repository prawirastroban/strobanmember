import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("drizzle/migrations/0015_restrict_master_data_staff_policy_targets.sql", "utf8");
const active = source.replace(/^--.*$/gm, "");
const codeOnly = active
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/'(?:''|[^'])*'/g, "''")
  .replace(/"(?:""|[^"])*"/g, '""');
const targets = ["branches", "promos", "services", "tires"].flatMap((table) =>
  ["delete", "insert", "update", "view all"].map((action) => [table, `Staff can ${action} ${table}`]));

describe("Stage 2B master data staff policy restrictions", () => {
  it("changes exactly the 16 approved internal targets without expression edits or unrelated SQL", () => {
    const statements = active.match(/ALTER POLICY[^;]+;/g) ?? [];
    expect(statements).toHaveLength(16);
    expect(statements.sort()).toEqual(targets.map(([table, name]) =>
      `ALTER POLICY "${name}" ON public.${table} TO authenticated;`).sort());
    expect(codeOnly).not.toMatch(/\b(GRANT|REVOKE|CREATE|DROP|INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
    expect(active).not.toMatch(/ALTER POLICY[^;]*\b(USING|WITH CHECK)\b/i);
  });

  it("rejects audit drift and compares every public policy with only approved targets replaced", () => {
    expect(active).toContain("inventory_fingerprint IS DISTINCT FROM '40f2363acd5b2a1f5cb45f334428f09c'");
    expect(active).toContain("(tablename || '.' || policyname) = ANY(targets)");
    expect(active).toContain("to_jsonb(p) || jsonb_build_object('roles',ARRAY['authenticated']::name[])");
    expect(active).toContain("ELSE to_jsonb(p) END");
    expect(active).toContain("after_snapshot IS DISTINCT FROM expected_snapshot");
    expect(active.match(/RAISE EXCEPTION/g)).toHaveLength(2);
    expect(active.match(/FROM pg_policies p WHERE schemaname='public'/g)).toHaveLength(2);
    const inventory = active.match(/targets text\[\] := ARRAY\[([\s\S]*?)\];/)?.[1];
    expect(inventory?.match(/'([^']+)'/g)?.sort()).toEqual(targets.map(([table, name]) => `'${table}.${name}'`).sort());
  });

  it("preserves all four public policies and provides an unexecuted exact inverse for the 16 targets", () => {
    expect(active).not.toMatch(/ALTER POLICY "Anyone can view active/);
    const rollback = source.split("\n").filter((line) => line.startsWith("-- ALTER POLICY"))
      .map((line) => line.slice(3));
    expect(rollback.sort()).toEqual(targets.map(([table, name]) =>
      `ALTER POLICY "${name}" ON public.${table} TO public;`).sort());
    expect(active).not.toMatch(/ALTER POLICY[^;]+TO public;/);
  });
});