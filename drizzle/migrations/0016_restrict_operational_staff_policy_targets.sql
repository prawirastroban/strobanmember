-- Stage 2C: only the 92 approved policy targets change; no production data writes.
DO $stage2c$
DECLARE
  before_snapshot jsonb;
  expected_snapshot jsonb;
  after_snapshot jsonb;
  inventory_fingerprint text;
  candidate_fingerprint text;
  retained_fingerprint text;
  targets text[];
  scope_tables text[] := ARRAY[
    'activity_logs','admin_audit_log','webhook_logs','internal_reports','rate_limits',
    'cashback_ledger','referral_balances','referral_commissions','referral_withdrawals',
    'referral_vouchers','referral_fraud_log','referral_ip_allowlist','referral_signups_meta',
    'manual_payment_proofs','manual_payment_accounts','manual_payment_qris',
    'loyalty_points','loyalty_transactions','rewards','reward_redemptions','promo_claims',
    'booking_reviews','booking_status_logs','customer_complaints','tire_orders','notifications',
    'service_categories','service_icons','app_settings','app_branding','legal_documents'
  ];
  public_targets text[] := ARRAY[
    'activity_logs.Anyone can view review activity logs',
    'manual_payment_accounts.Anyone can view active bank accounts',
    'manual_payment_qris.Anyone can view active qris',
    'customer_complaints.Submit own complaints',
    'service_categories.Anyone can view active categories',
    'service_icons.Anyone can view active icons',
    'app_settings.Public can read app version keys',
    'app_settings.Public can view cashback usage rules',
    'app_settings.Public can view home banner settings',
    'app_settings.Public can view loyalty_how_to_earn'
  ];
BEGIN
  -- Stronger complete inventory guard includes schema and permissive status.
  SELECT md5(string_agg(concat_ws('|',schemaname,tablename,policyname,permissive,cmd,roles::text,COALESCE(qual,'<NULL>'),COALESCE(with_check,'<NULL>')),E'\n' ORDER BY tablename,policyname))
  INTO inventory_fingerprint FROM pg_policies
  WHERE schemaname='public' AND tablename = ANY(scope_tables);
  IF inventory_fingerprint IS DISTINCT FROM '249e3cf00ec2a914a6cc51ecda85a446' THEN
    RAISE EXCEPTION 'Stage 2C stopped: complete inventory differs from the verified audit';
  END IF;

  -- Derive the approved inventory only after the complete fingerprint matches.
  SELECT array_agg(tablename || '.' || policyname ORDER BY tablename,policyname),
         md5(string_agg(concat_ws('.',tablename,policyname,cmd,array_to_string(roles,','),COALESCE(qual,''),COALESCE(with_check,'')),'|' ORDER BY tablename,policyname))
  INTO targets, candidate_fingerprint FROM pg_policies
  WHERE schemaname='public' AND tablename = ANY(scope_tables)
    AND roles=ARRAY['public']::name[]
    AND NOT (tablename || '.' || policyname) = ANY(public_targets);

  SELECT md5(string_agg(concat_ws('.',tablename,policyname,cmd,array_to_string(roles,','),COALESCE(qual,''),COALESCE(with_check,'')),'|' ORDER BY tablename,policyname))
  INTO retained_fingerprint FROM pg_policies
  WHERE schemaname='public' AND tablename = ANY(scope_tables)
    AND NOT (tablename || '.' || policyname) = ANY(targets);
  IF cardinality(targets) IS DISTINCT FROM 92
     OR candidate_fingerprint IS DISTINCT FROM 'af550200905197b0cb30b29750bf631f'
     OR retained_fingerprint IS DISTINCT FROM 'a7943c3b179187c8b76a3a1a30a9b855'
     OR (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename = ANY(scope_tables)) <> 108
     OR (SELECT count(*) FROM pg_policies WHERE schemaname='public' AND tablename = ANY(scope_tables) AND NOT (tablename || '.' || policyname) = ANY(targets)) <> 16 THEN
    RAISE EXCEPTION 'Stage 2C stopped: approved 92 candidates or 16 retained policies differ';
  END IF;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname),
         jsonb_agg(CASE WHEN (tablename || '.' || policyname) = ANY(targets)
           THEN to_jsonb(p) || jsonb_build_object('roles',ARRAY['authenticated']::name[])
           ELSE to_jsonb(p) END ORDER BY tablename,policyname)
  INTO before_snapshot, expected_snapshot FROM pg_policies p WHERE schemaname='public';

  ALTER POLICY "Staff can insert activity logs" ON public.activity_logs TO authenticated;
  ALTER POLICY "Staff can view all activity logs" ON public.activity_logs TO authenticated;
  ALTER POLICY "Owner can view audit log" ON public.admin_audit_log TO authenticated;
  ALTER POLICY "Staff can insert branding" ON public.app_branding TO authenticated;
  ALTER POLICY "Staff can update branding" ON public.app_branding TO authenticated;
  ALTER POLICY "Staff can insert app_settings" ON public.app_settings TO authenticated;
  ALTER POLICY "Staff can update app_settings" ON public.app_settings TO authenticated;
  ALTER POLICY "Staff can view app_settings" ON public.app_settings TO authenticated;
  ALTER POLICY "Staff manage booking reviews" ON public.booking_reviews TO authenticated;
  ALTER POLICY "Users view own booking reviews" ON public.booking_reviews TO authenticated;
  ALTER POLICY "Staff can view all status logs" ON public.booking_status_logs TO authenticated;
  ALTER POLICY "Staff or owner can insert status logs" ON public.booking_status_logs TO authenticated;
  ALTER POLICY "Users can view own booking status logs" ON public.booking_status_logs TO authenticated;
  ALTER POLICY "Staff view all cashback ledger" ON public.cashback_ledger TO authenticated;
  ALTER POLICY "Users view own cashback ledger" ON public.cashback_ledger TO authenticated;
  ALTER POLICY "Staff update complaints" ON public.customer_complaints TO authenticated;
  ALTER POLICY "Staff view all complaints" ON public.customer_complaints TO authenticated;
  ALTER POLICY "Users view own complaints" ON public.customer_complaints TO authenticated;
  ALTER POLICY "Internal users can view reports" ON public.internal_reports TO authenticated;
  ALTER POLICY "Owner staff can delete reports" ON public.internal_reports TO authenticated;
  ALTER POLICY "Owner staff can update any report" ON public.internal_reports TO authenticated;
  ALTER POLICY "Reporter can delete own open reports" ON public.internal_reports TO authenticated;
  ALTER POLICY "Reporter can update own open reports" ON public.internal_reports TO authenticated;
  ALTER POLICY "Reporters can view own reports" ON public.internal_reports TO authenticated;
  ALTER POLICY "Staff can insert legal documents" ON public.legal_documents TO authenticated;
  ALTER POLICY "Staff can update legal documents" ON public.legal_documents TO authenticated;
  ALTER POLICY "Staff can insert loyalty points" ON public.loyalty_points TO authenticated;
  ALTER POLICY "Staff can update loyalty points" ON public.loyalty_points TO authenticated;
  ALTER POLICY "Staff can view all loyalty points" ON public.loyalty_points TO authenticated;
  ALTER POLICY "Users can view own loyalty points" ON public.loyalty_points TO authenticated;
  ALTER POLICY "Staff can insert transactions" ON public.loyalty_transactions TO authenticated;
  ALTER POLICY "Staff can view all transactions" ON public.loyalty_transactions TO authenticated;
  ALTER POLICY "Users can view own transactions" ON public.loyalty_transactions TO authenticated;
  ALTER POLICY "Staff can delete bank accounts" ON public.manual_payment_accounts TO authenticated;
  ALTER POLICY "Staff can insert bank accounts" ON public.manual_payment_accounts TO authenticated;
  ALTER POLICY "Staff can update bank accounts" ON public.manual_payment_accounts TO authenticated;
  ALTER POLICY "Staff can view all bank accounts" ON public.manual_payment_accounts TO authenticated;
  ALTER POLICY "Admin cabang can update branch proofs" ON public.manual_payment_proofs TO authenticated;
  ALTER POLICY "Admin cabang can view branch proofs" ON public.manual_payment_proofs TO authenticated;
  ALTER POLICY "Staff update all proofs" ON public.manual_payment_proofs TO authenticated;
  ALTER POLICY "Staff view all proofs" ON public.manual_payment_proofs TO authenticated;
  ALTER POLICY "Users insert own proofs" ON public.manual_payment_proofs TO authenticated;
  ALTER POLICY "Users view own proofs" ON public.manual_payment_proofs TO authenticated;
  ALTER POLICY "Staff can delete qris" ON public.manual_payment_qris TO authenticated;
  ALTER POLICY "Staff can insert qris" ON public.manual_payment_qris TO authenticated;
  ALTER POLICY "Staff can update qris" ON public.manual_payment_qris TO authenticated;
  ALTER POLICY "Staff can view all qris" ON public.manual_payment_qris TO authenticated;
  ALTER POLICY "Staff can insert notifications" ON public.notifications TO authenticated;
  ALTER POLICY "Staff can view all notifications" ON public.notifications TO authenticated;
  ALTER POLICY "Users can update own notifications" ON public.notifications TO authenticated;
  ALTER POLICY "Users can view own notifications" ON public.notifications TO authenticated;
  ALTER POLICY "Staff can update claims" ON public.promo_claims TO authenticated;
  ALTER POLICY "Staff can view all claims" ON public.promo_claims TO authenticated;
  ALTER POLICY "Users can view own claims" ON public.promo_claims TO authenticated;
  ALTER POLICY "Staff can view rate limits" ON public.rate_limits TO authenticated;
  ALTER POLICY "Staff manage balances" ON public.referral_balances TO authenticated;
  ALTER POLICY "Staff view all balances" ON public.referral_balances TO authenticated;
  ALTER POLICY "Users view own balance" ON public.referral_balances TO authenticated;
  ALTER POLICY "Staff manage commissions" ON public.referral_commissions TO authenticated;
  ALTER POLICY "Staff view all commissions" ON public.referral_commissions TO authenticated;
  ALTER POLICY "Users view own commissions" ON public.referral_commissions TO authenticated;
  ALTER POLICY "Staff view fraud log" ON public.referral_fraud_log TO authenticated;
  ALTER POLICY "Staff delete ip allowlist" ON public.referral_ip_allowlist TO authenticated;
  ALTER POLICY "Staff insert ip allowlist" ON public.referral_ip_allowlist TO authenticated;
  ALTER POLICY "Staff view ip allowlist" ON public.referral_ip_allowlist TO authenticated;
  ALTER POLICY "Staff view signups meta" ON public.referral_signups_meta TO authenticated;
  ALTER POLICY "Staff manage vouchers" ON public.referral_vouchers TO authenticated;
  ALTER POLICY "Staff view all vouchers" ON public.referral_vouchers TO authenticated;
  ALTER POLICY "Users view own vouchers" ON public.referral_vouchers TO authenticated;
  ALTER POLICY "Staff manage withdrawals" ON public.referral_withdrawals TO authenticated;
  ALTER POLICY "Staff view all withdrawals" ON public.referral_withdrawals TO authenticated;
  ALTER POLICY "Users view own withdrawals" ON public.referral_withdrawals TO authenticated;
  ALTER POLICY "Staff can update redemptions" ON public.reward_redemptions TO authenticated;
  ALTER POLICY "Staff can view all redemptions" ON public.reward_redemptions TO authenticated;
  ALTER POLICY "Users can view own redemptions" ON public.reward_redemptions TO authenticated;
  ALTER POLICY "Staff can manage rewards" ON public.rewards TO authenticated;
  ALTER POLICY "Staff can delete categories" ON public.service_categories TO authenticated;
  ALTER POLICY "Staff can insert categories" ON public.service_categories TO authenticated;
  ALTER POLICY "Staff can update categories" ON public.service_categories TO authenticated;
  ALTER POLICY "Staff can view all categories" ON public.service_categories TO authenticated;
  ALTER POLICY "Staff can delete icons" ON public.service_icons TO authenticated;
  ALTER POLICY "Staff can insert icons" ON public.service_icons TO authenticated;
  ALTER POLICY "Staff can update icons" ON public.service_icons TO authenticated;
  ALTER POLICY "Staff can view all icons" ON public.service_icons TO authenticated;
  ALTER POLICY "Admin cabang can update branch tire orders" ON public.tire_orders TO authenticated;
  ALTER POLICY "Admin cabang can view branch tire orders" ON public.tire_orders TO authenticated;
  ALTER POLICY "Staff can insert tire orders" ON public.tire_orders TO authenticated;
  ALTER POLICY "Staff can update tire orders" ON public.tire_orders TO authenticated;
  ALTER POLICY "Staff can view all tire orders" ON public.tire_orders TO authenticated;
  ALTER POLICY "Users can create own tire orders" ON public.tire_orders TO authenticated;
  ALTER POLICY "Users can view own tire orders" ON public.tire_orders TO authenticated;
  ALTER POLICY "Staff can view webhook logs" ON public.webhook_logs TO authenticated;

  SELECT jsonb_agg(to_jsonb(p) ORDER BY tablename,policyname)
  INTO after_snapshot FROM pg_policies p WHERE schemaname='public';
  IF after_snapshot IS DISTINCT FROM expected_snapshot THEN
    RAISE EXCEPTION 'Stage 2C stopped: changes exceed the 92 approved target roles';
  END IF;
END
$stage2c$;

-- Rollback: review only; execute solely upon a separately approved rollback request.
-- ALTER POLICY "Staff can insert activity logs" ON public.activity_logs TO public;
-- ALTER POLICY "Staff can view all activity logs" ON public.activity_logs TO public;
-- ALTER POLICY "Owner can view audit log" ON public.admin_audit_log TO public;
-- ALTER POLICY "Staff can insert branding" ON public.app_branding TO public;
-- ALTER POLICY "Staff can update branding" ON public.app_branding TO public;
-- ALTER POLICY "Staff can insert app_settings" ON public.app_settings TO public;
-- ALTER POLICY "Staff can update app_settings" ON public.app_settings TO public;
-- ALTER POLICY "Staff can view app_settings" ON public.app_settings TO public;
-- ALTER POLICY "Staff manage booking reviews" ON public.booking_reviews TO public;
-- ALTER POLICY "Users view own booking reviews" ON public.booking_reviews TO public;
-- ALTER POLICY "Staff can view all status logs" ON public.booking_status_logs TO public;
-- ALTER POLICY "Staff or owner can insert status logs" ON public.booking_status_logs TO public;
-- ALTER POLICY "Users can view own booking status logs" ON public.booking_status_logs TO public;
-- ALTER POLICY "Staff view all cashback ledger" ON public.cashback_ledger TO public;
-- ALTER POLICY "Users view own cashback ledger" ON public.cashback_ledger TO public;
-- ALTER POLICY "Staff update complaints" ON public.customer_complaints TO public;
-- ALTER POLICY "Staff view all complaints" ON public.customer_complaints TO public;
-- ALTER POLICY "Users view own complaints" ON public.customer_complaints TO public;
-- ALTER POLICY "Internal users can view reports" ON public.internal_reports TO public;
-- ALTER POLICY "Owner staff can delete reports" ON public.internal_reports TO public;
-- ALTER POLICY "Owner staff can update any report" ON public.internal_reports TO public;
-- ALTER POLICY "Reporter can delete own open reports" ON public.internal_reports TO public;
-- ALTER POLICY "Reporter can update own open reports" ON public.internal_reports TO public;
-- ALTER POLICY "Reporters can view own reports" ON public.internal_reports TO public;
-- ALTER POLICY "Staff can insert legal documents" ON public.legal_documents TO public;
-- ALTER POLICY "Staff can update legal documents" ON public.legal_documents TO public;
-- ALTER POLICY "Staff can insert loyalty points" ON public.loyalty_points TO public;
-- ALTER POLICY "Staff can update loyalty points" ON public.loyalty_points TO public;
-- ALTER POLICY "Staff can view all loyalty points" ON public.loyalty_points TO public;
-- ALTER POLICY "Users can view own loyalty points" ON public.loyalty_points TO public;
-- ALTER POLICY "Staff can insert transactions" ON public.loyalty_transactions TO public;
-- ALTER POLICY "Staff can view all transactions" ON public.loyalty_transactions TO public;
-- ALTER POLICY "Users can view own transactions" ON public.loyalty_transactions TO public;
-- ALTER POLICY "Staff can delete bank accounts" ON public.manual_payment_accounts TO public;
-- ALTER POLICY "Staff can insert bank accounts" ON public.manual_payment_accounts TO public;
-- ALTER POLICY "Staff can update bank accounts" ON public.manual_payment_accounts TO public;
-- ALTER POLICY "Staff can view all bank accounts" ON public.manual_payment_accounts TO public;
-- ALTER POLICY "Admin cabang can update branch proofs" ON public.manual_payment_proofs TO public;
-- ALTER POLICY "Admin cabang can view branch proofs" ON public.manual_payment_proofs TO public;
-- ALTER POLICY "Staff update all proofs" ON public.manual_payment_proofs TO public;
-- ALTER POLICY "Staff view all proofs" ON public.manual_payment_proofs TO public;
-- ALTER POLICY "Users insert own proofs" ON public.manual_payment_proofs TO public;
-- ALTER POLICY "Users view own proofs" ON public.manual_payment_proofs TO public;
-- ALTER POLICY "Staff can delete qris" ON public.manual_payment_qris TO public;
-- ALTER POLICY "Staff can insert qris" ON public.manual_payment_qris TO public;
-- ALTER POLICY "Staff can update qris" ON public.manual_payment_qris TO public;
-- ALTER POLICY "Staff can view all qris" ON public.manual_payment_qris TO public;
-- ALTER POLICY "Staff can insert notifications" ON public.notifications TO public;
-- ALTER POLICY "Staff can view all notifications" ON public.notifications TO public;
-- ALTER POLICY "Users can update own notifications" ON public.notifications TO public;
-- ALTER POLICY "Users can view own notifications" ON public.notifications TO public;
-- ALTER POLICY "Staff can update claims" ON public.promo_claims TO public;
-- ALTER POLICY "Staff can view all claims" ON public.promo_claims TO public;
-- ALTER POLICY "Users can view own claims" ON public.promo_claims TO public;
-- ALTER POLICY "Staff can view rate limits" ON public.rate_limits TO public;
-- ALTER POLICY "Staff manage balances" ON public.referral_balances TO public;
-- ALTER POLICY "Staff view all balances" ON public.referral_balances TO public;
-- ALTER POLICY "Users view own balance" ON public.referral_balances TO public;
-- ALTER POLICY "Staff manage commissions" ON public.referral_commissions TO public;
-- ALTER POLICY "Staff view all commissions" ON public.referral_commissions TO public;
-- ALTER POLICY "Users view own commissions" ON public.referral_commissions TO public;
-- ALTER POLICY "Staff view fraud log" ON public.referral_fraud_log TO public;
-- ALTER POLICY "Staff delete ip allowlist" ON public.referral_ip_allowlist TO public;
-- ALTER POLICY "Staff insert ip allowlist" ON public.referral_ip_allowlist TO public;
-- ALTER POLICY "Staff view ip allowlist" ON public.referral_ip_allowlist TO public;
-- ALTER POLICY "Staff view signups meta" ON public.referral_signups_meta TO public;
-- ALTER POLICY "Staff manage vouchers" ON public.referral_vouchers TO public;
-- ALTER POLICY "Staff view all vouchers" ON public.referral_vouchers TO public;
-- ALTER POLICY "Users view own vouchers" ON public.referral_vouchers TO public;
-- ALTER POLICY "Staff manage withdrawals" ON public.referral_withdrawals TO public;
-- ALTER POLICY "Staff view all withdrawals" ON public.referral_withdrawals TO public;
-- ALTER POLICY "Users view own withdrawals" ON public.referral_withdrawals TO public;
-- ALTER POLICY "Staff can update redemptions" ON public.reward_redemptions TO public;
-- ALTER POLICY "Staff can view all redemptions" ON public.reward_redemptions TO public;
-- ALTER POLICY "Users can view own redemptions" ON public.reward_redemptions TO public;
-- ALTER POLICY "Staff can manage rewards" ON public.rewards TO public;
-- ALTER POLICY "Staff can delete categories" ON public.service_categories TO public;
-- ALTER POLICY "Staff can insert categories" ON public.service_categories TO public;
-- ALTER POLICY "Staff can update categories" ON public.service_categories TO public;
-- ALTER POLICY "Staff can view all categories" ON public.service_categories TO public;
-- ALTER POLICY "Staff can delete icons" ON public.service_icons TO public;
-- ALTER POLICY "Staff can insert icons" ON public.service_icons TO public;
-- ALTER POLICY "Staff can update icons" ON public.service_icons TO public;
-- ALTER POLICY "Staff can view all icons" ON public.service_icons TO public;
-- ALTER POLICY "Admin cabang can update branch tire orders" ON public.tire_orders TO public;
-- ALTER POLICY "Admin cabang can view branch tire orders" ON public.tire_orders TO public;
-- ALTER POLICY "Staff can insert tire orders" ON public.tire_orders TO public;
-- ALTER POLICY "Staff can update tire orders" ON public.tire_orders TO public;
-- ALTER POLICY "Staff can view all tire orders" ON public.tire_orders TO public;
-- ALTER POLICY "Users can create own tire orders" ON public.tire_orders TO public;
-- ALTER POLICY "Users can view own tire orders" ON public.tire_orders TO public;
-- ALTER POLICY "Staff can view webhook logs" ON public.webhook_logs TO public;
