import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("drizzle/migrations/0014_restrict_transaction_staff_policy_targets.sql", "utf8");
const active = source.replace(/^--.*$/gm, "");
// SQL that actually executes: block comments, single-quoted string literals and
// double-quoted identifiers are blanked out, so keyword checks never see policy names.
const codeOnly = active
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/'(?:''|[^'])*'/g, "''")
  .replace(/"(?:""|[^"])*"/g, '""');
const targets = [
  ["bookings", "Owner staff can delete bookings"],
  ["bookings", "Staff can insert bookings"],
  ["bookings", "Staff can update all bookings"],
  ["bookings", "Staff can view all bookings"],
  ["invoices", "Staff can insert invoices"],
  ["invoices", "Staff can update invoices"],
  ["invoices", "Staff can view all invoices"],
  ["payments", "Staff can insert payments"],
  ["payments", "Staff can update all payments"],
  ["payments", "Staff can view all payments"],
  ["user_roles", "Staff and admin can view all roles"],
];

describe("Stage 2A transaction staff policy restrictions", () => {
  it("changes exactly the 11 approved policy targets to authenticated without other DDL or data writes", () => {
    const statements = active.match(/ALTER POLICY[^;]+;/g) ?? [];
    expect(statements.sort()).toEqual(targets.map(([table, name]) =>
      `ALTER POLICY "${name}" ON public.${table} TO authenticated;`).sort());
    expect(codeOnly).not.toMatch(/\b(GRANT|REVOKE|CREATE|DROP|INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
  });

  it("aborts on audit drift and validates the entire public policy snapshot with only roles replaced", () => {
    expect(active).toContain("inventory_fingerprint IS DISTINCT FROM '5db49502470a59c9d38e3e2bb615261a'");
    expect(active).toContain("to_jsonb(p) || jsonb_build_object('roles',ARRAY['authenticated']::name[])");
    expect(active).toContain("after_snapshot IS DISTINCT FROM expected_snapshot");
    expect(active.match(/RAISE EXCEPTION/g)).toHaveLength(2);
    expect(active).not.toMatch(/ALTER POLICY[^;]*\b(USING|WITH CHECK)\b/i);
  });

  it("provides a commented exact inverse for all 11 policies, without executing rollback", () => {
    const rollback = source.split("\n").filter((line) => line.startsWith("-- ALTER POLICY"))
      .map((line) => line.slice(3));
    expect(rollback.sort()).toEqual(targets.map(([table, name]) =>
      `ALTER POLICY "${name}" ON public.${table} TO public;`).sort());
    expect(active).not.toMatch(/ALTER POLICY[^;]+TO public;/);
  });
});