import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync("drizzle/migrations/0013_split_home_banners_public_staff_select.sql", "utf8")
  .replace(/^--.*$/gm, "")
  .trim();
const statements = sql.split(";").map((value) => value.trim()).filter(Boolean);

describe("home_banners SELECT policy migration", () => {
  it("allows anon and authenticated to read only active banners through the public policy", () => {
    expect(statements[0]).toMatch(/^ALTER POLICY "Anyone can view active banners"\s+ON public\.home_banners\s+TO anon, authenticated\s+USING \(is_active = true\)$/);
  });

  it("limits the separate all-banner SELECT to authenticated admin or staff", () => {
    expect(statements[1]).toMatch(/^CREATE POLICY "Staff can view all banners"\s+ON public\.home_banners\s+AS PERMISSIVE\s+FOR SELECT\s+TO authenticated\s+USING \(\s+public\.has_role\(auth\.uid\(\), 'admin'::public\.app_role\)\s+OR public\.has_role\(auth\.uid\(\), 'staff'::public\.app_role\)\s+\)$/);
  });

  it("changes only those two SELECT rules and leaves write policies and other objects untouched", () => {
    expect(statements).toHaveLength(2);
    expect(sql).not.toMatch(/\b(GRANT|REVOKE|INSERT|UPDATE|DELETE|FUNCTION|TABLE|DROP)\b/i);
  });
});