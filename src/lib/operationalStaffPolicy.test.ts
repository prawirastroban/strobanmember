import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("drizzle/migrations/0016_restrict_operational_staff_policy_targets.sql", "utf8");
const active = source.replace(/^--.*$/gm, "");
const codeOnly = active
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/'(?:''|[^'])*'/g, "''")
  .replace(/"(?:""|[^"])*"/g, '""');
// Independent approved inventory captured before applying Stage 2C.
const targets: string[][] = [
  [
    "activity_logs",
    "Staff can insert activity logs"
  ],
  [
    "activity_logs",
    "Staff can view all activity logs"
  ],
  [
    "admin_audit_log",
    "Owner can view audit log"
  ],
  [
    "app_branding",
    "Staff can insert branding"
  ],
  [
    "app_branding",
    "Staff can update branding"
  ],
  [
    "app_settings",
    "Staff can insert app_settings"
  ],
  [
    "app_settings",
    "Staff can update app_settings"
  ],
  [
    "app_settings",
    "Staff can view app_settings"
  ],
  [
    "booking_reviews",
    "Staff manage booking reviews"
  ],
  [
    "booking_reviews",
    "Users view own booking reviews"
  ],
  [
    "booking_status_logs",
    "Staff can view all status logs"
  ],
  [
    "booking_status_logs",
    "Staff or owner can insert status logs"
  ],
  [
    "booking_status_logs",
    "Users can view own booking status logs"
  ],
  [
    "cashback_ledger",
    "Staff view all cashback ledger"
  ],
  [
    "cashback_ledger",
    "Users view own cashback ledger"
  ],
  [
    "customer_complaints",
    "Staff update complaints"
  ],
  [
    "customer_complaints",
    "Staff view all complaints"
  ],
  [
    "customer_complaints",
    "Users view own complaints"
  ],
  [
    "internal_reports",
    "Internal users can view reports"
  ],
  [
    "internal_reports",
    "Owner staff can delete reports"
  ],
  [
    "internal_reports",
    "Owner staff can update any report"
  ],
  [
    "internal_reports",
    "Reporter can delete own open reports"
  ],
  [
    "internal_reports",
    "Reporter can update own open reports"
  ],
  [
    "internal_reports",
    "Reporters can view own reports"
  ],
  [
    "legal_documents",
    "Staff can insert legal documents"
  ],
  [
    "legal_documents",
    "Staff can update legal documents"
  ],
  [
    "loyalty_points",
    "Staff can insert loyalty points"
  ],
  [
    "loyalty_points",
    "Staff can update loyalty points"
  ],
  [
    "loyalty_points",
    "Staff can view all loyalty points"
  ],
  [
    "loyalty_points",
    "Users can view own loyalty points"
  ],
  [
    "loyalty_transactions",
    "Staff can insert transactions"
  ],
  [
    "loyalty_transactions",
    "Staff can view all transactions"
  ],
  [
    "loyalty_transactions",
    "Users can view own transactions"
  ],
  [
    "manual_payment_accounts",
    "Staff can delete bank accounts"
  ],
  [
    "manual_payment_accounts",
    "Staff can insert bank accounts"
  ],
  [
    "manual_payment_accounts",
    "Staff can update bank accounts"
  ],
  [
    "manual_payment_accounts",
    "Staff can view all bank accounts"
  ],
  [
    "manual_payment_proofs",
    "Admin cabang can update branch proofs"
  ],
  [
    "manual_payment_proofs",
    "Admin cabang can view branch proofs"
  ],
  [
    "manual_payment_proofs",
    "Staff update all proofs"
  ],
  [
    "manual_payment_proofs",
    "Staff view all proofs"
  ],
  [
    "manual_payment_proofs",
    "Users insert own proofs"
  ],
  [
    "manual_payment_proofs",
    "Users view own proofs"
  ],
  [
    "manual_payment_qris",
    "Staff can delete qris"
  ],
  [
    "manual_payment_qris",
    "Staff can insert qris"
  ],
  [
    "manual_payment_qris",
    "Staff can update qris"
  ],
  [
    "manual_payment_qris",
    "Staff can view all qris"
  ],
  [
    "notifications",
    "Staff can insert notifications"
  ],
  [
    "notifications",
    "Staff can view all notifications"
  ],
  [
    "notifications",
    "Users can update own notifications"
  ],
  [
    "notifications",
    "Users can view own notifications"
  ],
  [
    "promo_claims",
    "Staff can update claims"
  ],
  [
    "promo_claims",
    "Staff can view all claims"
  ],
  [
    "promo_claims",
    "Users can view own claims"
  ],
  [
    "rate_limits",
    "Staff can view rate limits"
  ],
  [
    "referral_balances",
    "Staff manage balances"
  ],
  [
    "referral_balances",
    "Staff view all balances"
  ],
  [
    "referral_balances",
    "Users view own balance"
  ],
  [
    "referral_commissions",
    "Staff manage commissions"
  ],
  [
    "referral_commissions",
    "Staff view all commissions"
  ],
  [
    "referral_commissions",
    "Users view own commissions"
  ],
  [
    "referral_fraud_log",
    "Staff view fraud log"
  ],
  [
    "referral_ip_allowlist",
    "Staff delete ip allowlist"
  ],
  [
    "referral_ip_allowlist",
    "Staff insert ip allowlist"
  ],
  [
    "referral_ip_allowlist",
    "Staff view ip allowlist"
  ],
  [
    "referral_signups_meta",
    "Staff view signups meta"
  ],
  [
    "referral_vouchers",
    "Staff manage vouchers"
  ],
  [
    "referral_vouchers",
    "Staff view all vouchers"
  ],
  [
    "referral_vouchers",
    "Users view own vouchers"
  ],
  [
    "referral_withdrawals",
    "Staff manage withdrawals"
  ],
  [
    "referral_withdrawals",
    "Staff view all withdrawals"
  ],
  [
    "referral_withdrawals",
    "Users view own withdrawals"
  ],
  [
    "reward_redemptions",
    "Staff can update redemptions"
  ],
  [
    "reward_redemptions",
    "Staff can view all redemptions"
  ],
  [
    "reward_redemptions",
    "Users can view own redemptions"
  ],
  [
    "rewards",
    "Staff can manage rewards"
  ],
  [
    "service_categories",
    "Staff can delete categories"
  ],
  [
    "service_categories",
    "Staff can insert categories"
  ],
  [
    "service_categories",
    "Staff can update categories"
  ],
  [
    "service_categories",
    "Staff can view all categories"
  ],
  [
    "service_icons",
    "Staff can delete icons"
  ],
  [
    "service_icons",
    "Staff can insert icons"
  ],
  [
    "service_icons",
    "Staff can update icons"
  ],
  [
    "service_icons",
    "Staff can view all icons"
  ],
  [
    "tire_orders",
    "Admin cabang can update branch tire orders"
  ],
  [
    "tire_orders",
    "Admin cabang can view branch tire orders"
  ],
  [
    "tire_orders",
    "Staff can insert tire orders"
  ],
  [
    "tire_orders",
    "Staff can update tire orders"
  ],
  [
    "tire_orders",
    "Staff can view all tire orders"
  ],
  [
    "tire_orders",
    "Users can create own tire orders"
  ],
  [
    "tire_orders",
    "Users can view own tire orders"
  ],
  [
    "webhook_logs",
    "Staff can view webhook logs"
  ]
];
const retained: string[][] = [
  [
    "activity_logs",
    "Anyone can view review activity logs"
  ],
  [
    "activity_logs",
    "Customers can log own review and booking actions"
  ],
  [
    "activity_logs",
    "Users can insert own review activity logs"
  ],
  [
    "app_branding",
    "Staff can view branding"
  ],
  [
    "app_settings",
    "Public can read app version keys"
  ],
  [
    "app_settings",
    "Public can view cashback usage rules"
  ],
  [
    "app_settings",
    "Public can view home banner settings"
  ],
  [
    "app_settings",
    "Public can view loyalty_how_to_earn"
  ],
  [
    "customer_complaints",
    "Submit own complaints"
  ],
  [
    "internal_reports",
    "Authenticated users can insert own reports"
  ],
  [
    "legal_documents",
    "Staff can view legal documents"
  ],
  [
    "manual_payment_accounts",
    "Anyone can view active bank accounts"
  ],
  [
    "manual_payment_qris",
    "Anyone can view active qris"
  ],
  [
    "rewards",
    "Authenticated users can view active rewards"
  ],
  [
    "service_categories",
    "Anyone can view active categories"
  ],
  [
    "service_icons",
    "Anyone can view active icons"
  ]
];

const statement = ([table, name]: string[], role: string) =>
  `ALTER POLICY "${name}" ON public.${table} TO ${role};`;

describe("Stage 2C operational policy target restrictions", () => {
  it("changes exactly 92 approved targets, without expression edits or unrelated SQL", () => {
    const statements = active.match(/ALTER POLICY[^;]+;/g) ?? [];
    expect(targets).toHaveLength(92);
    expect(new Set(targets.map(([table, name]) => `${table}.${name}`)).size).toBe(92);
    expect(statements).toHaveLength(92);
    expect(statements.sort()).toEqual(targets.map((target) => statement(target, "authenticated")).sort());
    expect(codeOnly).not.toMatch(/\b(GRANT|REVOKE|CREATE|DROP|INSERT|UPDATE|DELETE|TRUNCATE)\b/i);
    expect(active).not.toMatch(/ALTER POLICY[^;]*\b(USING|WITH CHECK)\b/i);
  });

  it("rejects complete inventory drift and compares every public policy with only approved roles replaced", () => {
    expect(active).toContain("inventory_fingerprint IS DISTINCT FROM '249e3cf00ec2a914a6cc51ecda85a446'");
    expect(active).toContain("candidate_fingerprint IS DISTINCT FROM 'af550200905197b0cb30b29750bf631f'");
    expect(active).toContain("retained_fingerprint IS DISTINCT FROM 'a7943c3b179187c8b76a3a1a30a9b855'");
    expect(active).toContain("cardinality(targets) IS DISTINCT FROM 92");
    expect(active).toContain("<> 108");
    expect(active).toContain("<> 16");
    expect(active).toContain("roles=ARRAY['public']::name[]");
    expect(active).toContain("schemaname,tablename,policyname,permissive,cmd,roles::text");
    expect(active).toContain("CASE WHEN (tablename || '.' || policyname) = ANY(targets)");
    expect(active).toContain("to_jsonb(p) || jsonb_build_object('roles',ARRAY['authenticated']::name[])");
    expect(active).toContain("ELSE to_jsonb(p) END");
    expect(active).toContain("after_snapshot IS DISTINCT FROM expected_snapshot");
    expect(active.match(/RAISE EXCEPTION/g)).toHaveLength(3);
    expect(active.match(/FROM pg_policies p WHERE schemaname='public'/g)).toHaveLength(2);
    const scope = active.match(/scope_tables text\[\] := ARRAY\[([\s\S]*?)\];/)?.[1];
    const tables = scope?.match(/'([^']+)'/g)?.map((value) => value.slice(1, -1));
    expect(tables).toHaveLength(31);
    expect(tables?.sort()).toEqual([...new Set([...targets, ...retained].map(([table]) => table))].sort());
  });

  it("preserves the ten public and six authenticated policies and provides an exact unexecuted rollback", () => {
    expect(retained).toHaveLength(16);
    for (const target of retained) {
      expect(active).not.toContain(statement(target, "authenticated"));
    }
    const publicInventory = active.match(/public_targets text\[\] := ARRAY\[([\s\S]*?)\];/)?.[1];
    const publicNames = publicInventory?.match(/'([^']+)'/g)?.map((value) => value.slice(1, -1));
    expect(publicNames).toHaveLength(10);
    expect(publicNames?.sort()).toEqual(retained.filter(([table, name]) =>
      name.startsWith("Anyone can view") || name.startsWith("Public can") ||
      (table === "customer_complaints" && name === "Submit own complaints")
    ).map(([table, name]) => `${table}.${name}`).sort());
    const rollback = source.split("\n").filter((line) => line.startsWith("-- ALTER POLICY"))
      .map((line) => line.slice(3));
    expect(rollback).toHaveLength(92);
    expect(rollback.sort()).toEqual(targets.map((target) => statement(target, "public")).sort());
    expect(active).not.toMatch(/ALTER POLICY[^;]+TO public;/);
  });
});
