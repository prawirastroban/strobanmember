import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const src = readFileSync("drizzle/migrations/0017_restrict_storage_policy_targets.sql", "utf8");
const code = src.replace(/^--.*$/gm, "").replace(/'(?:''|[^'])*'/g, "''");

describe("Stage 2D storage policy migration", () => {
  it("allowlists exactly 25 policies", () => {
    const block = src.match(/allow text\[\] := ARRAY\[([\s\S]*?)\];/)![1];
    expect(block.match(/'[^']+'/g)!.length).toBe(25);
  });
  it("only alters targets to authenticated, no DML or grants", () => {
    expect(src).toMatch(/ALTER POLICY %I ON storage\.objects TO authenticated/);
    expect(code).not.toMatch(/\b(GRANT|REVOKE|CREATE|DROP|INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
  });
});
