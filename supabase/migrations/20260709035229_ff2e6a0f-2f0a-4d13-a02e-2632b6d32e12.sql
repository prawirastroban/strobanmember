
-- =========================================================================
-- PHASE 4.1 — DIGITAL SPK DATABASE FOUNDATION
-- Additive only. Tidak menyentuh tabel existing.
-- =========================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.spk_status AS ENUM (
    'draft',
    'awaiting_customer_approval',
    'approved',
    'assigned',
    'in_progress',
    'work_completed',
    'qc_pending',
    'qc_passed',
    'qc_failed',
    'invoice_issued',
    'invoice_paid',
    'closed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.spk_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.spk_event_status AS ENUM ('committed','reverted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.spk_approval_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.spk_form_field_type AS ENUM (
    'text','textarea','number','currency','boolean','toggle',
    'checklist','radio','select','multiselect',
    'date','datetime','time',
    'photo','signature','file',
    'scan_qr','scan_barcode','scan_vin',
    'voice','ocr'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.spk_workflow_actor AS ENUM (
    'reception','mechanic','qc','cashier','owner','admin','admin_cabang','system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- HELPER: staff-or-admin check (compatible with existing has_role) ----------
CREATE OR REPLACE FUNCTION public.is_spk_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin','staff','admin_cabang')
  );
$$;

-- =========================================================================
-- 1. MASTER SPK
-- =========================================================================
CREATE TABLE public.spk_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_number TEXT NOT NULL UNIQUE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE RESTRICT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  form_template_version_id UUID, -- FK ditambahkan setelah tabel dibuat
  status public.spk_status NOT NULL DEFAULT 'draft',
  priority public.spk_priority NOT NULL DEFAULT 'normal',
  current_owner_role public.spk_workflow_actor NOT NULL DEFAULT 'reception',
  current_owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_reason TEXT,
  deleted_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_spk_orders_branch ON public.spk_orders(branch_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_spk_orders_status ON public.spk_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_spk_orders_customer ON public.spk_orders(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_spk_orders_vehicle ON public.spk_orders(vehicle_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_spk_orders_booking ON public.spk_orders(booking_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_spk_orders_opened_at ON public.spk_orders(opened_at DESC);
CREATE INDEX idx_spk_orders_owner ON public.spk_orders(current_owner_role, current_owner_user_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spk_orders TO authenticated;
GRANT ALL ON public.spk_orders TO service_role;
ALTER TABLE public.spk_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "spk_orders staff read"
  ON public.spk_orders FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_orders staff insert"
  ON public.spk_orders FOR INSERT TO authenticated
  WITH CHECK (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_orders staff update"
  ON public.spk_orders FOR UPDATE TO authenticated
  USING (public.is_spk_staff(auth.uid()))
  WITH CHECK (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_orders admin delete"
  ON public.spk_orders FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_spk_orders_updated_at
  BEFORE UPDATE ON public.spk_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- SPK STATUS HISTORY ----------
CREATE TABLE public.spk_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID NOT NULL REFERENCES public.spk_orders(id) ON DELETE CASCADE,
  from_status public.spk_status,
  to_status public.spk_status NOT NULL,
  actor_role public.spk_workflow_actor,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reason TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spk_status_history_spk ON public.spk_status_history(spk_id, occurred_at DESC);
CREATE INDEX idx_spk_status_history_to ON public.spk_status_history(to_status);

GRANT SELECT, INSERT ON public.spk_status_history TO authenticated;
GRANT ALL ON public.spk_status_history TO service_role;
ALTER TABLE public.spk_status_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_status_history staff read"
  ON public.spk_status_history FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_status_history staff insert"
  ON public.spk_status_history FOR INSERT TO authenticated
  WITH CHECK (public.is_spk_staff(auth.uid()));

-- =========================================================================
-- 2. DYNAMIC FORM METADATA
-- =========================================================================
CREATE TABLE public.spk_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_version_id UUID,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spk_form_templates_active ON public.spk_form_templates(is_active);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spk_form_templates TO authenticated;
GRANT ALL ON public.spk_form_templates TO service_role;
ALTER TABLE public.spk_form_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_form_templates staff read"
  ON public.spk_form_templates FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_form_templates admin write"
  ON public.spk_form_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_spk_form_templates_updated_at
  BEFORE UPDATE ON public.spk_form_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.spk_form_template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.spk_form_templates(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_id, version_number)
);
CREATE INDEX idx_spk_form_template_versions_template ON public.spk_form_template_versions(template_id, version_number DESC);

GRANT SELECT, INSERT, UPDATE ON public.spk_form_template_versions TO authenticated;
GRANT ALL ON public.spk_form_template_versions TO service_role;
ALTER TABLE public.spk_form_template_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_form_template_versions staff read"
  ON public.spk_form_template_versions FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_form_template_versions admin write"
  ON public.spk_form_template_versions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_spk_form_template_versions_updated_at
  BEFORE UPDATE ON public.spk_form_template_versions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Now that versions exist, add FK on spk_orders
ALTER TABLE public.spk_orders
  ADD CONSTRAINT spk_orders_template_version_fk
  FOREIGN KEY (form_template_version_id)
  REFERENCES public.spk_form_template_versions(id) ON DELETE SET NULL;

ALTER TABLE public.spk_form_templates
  ADD CONSTRAINT spk_form_templates_current_version_fk
  FOREIGN KEY (current_version_id)
  REFERENCES public.spk_form_template_versions(id) ON DELETE SET NULL;

CREATE TABLE public.spk_form_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id UUID NOT NULL REFERENCES public.spk_form_template_versions(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_collapsible BOOLEAN NOT NULL DEFAULT false,
  default_collapsed BOOLEAN NOT NULL DEFAULT false,
  visible_when JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (template_version_id, code)
);
CREATE INDEX idx_spk_form_sections_version ON public.spk_form_sections(template_version_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spk_form_sections TO authenticated;
GRANT ALL ON public.spk_form_sections TO service_role;
ALTER TABLE public.spk_form_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_form_sections staff read"
  ON public.spk_form_sections FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_form_sections admin write"
  ON public.spk_form_sections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_spk_form_sections_updated_at
  BEFORE UPDATE ON public.spk_form_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.spk_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id UUID NOT NULL REFERENCES public.spk_form_sections(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label TEXT NOT NULL,
  helper_text TEXT,
  field_type public.spk_form_field_type NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_locked_after_snapshot BOOLEAN NOT NULL DEFAULT false,
  options JSONB,
  validation JSONB,
  default_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (section_id, code)
);
CREATE INDEX idx_spk_form_fields_section ON public.spk_form_fields(section_id, display_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spk_form_fields TO authenticated;
GRANT ALL ON public.spk_form_fields TO service_role;
ALTER TABLE public.spk_form_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_form_fields staff read"
  ON public.spk_form_fields FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_form_fields admin write"
  ON public.spk_form_fields FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_spk_form_fields_updated_at
  BEFORE UPDATE ON public.spk_form_fields
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.spk_form_conditional_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_version_id UUID NOT NULL REFERENCES public.spk_form_template_versions(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('section','field')),
  target_id UUID NOT NULL,
  rule JSONB NOT NULL,
  effect TEXT NOT NULL CHECK (effect IN ('show','hide','require','optional','lock','unlock')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spk_form_conditional_rules_version ON public.spk_form_conditional_rules(template_version_id);
CREATE INDEX idx_spk_form_conditional_rules_target ON public.spk_form_conditional_rules(target_type, target_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spk_form_conditional_rules TO authenticated;
GRANT ALL ON public.spk_form_conditional_rules TO service_role;
ALTER TABLE public.spk_form_conditional_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_form_conditional_rules staff read"
  ON public.spk_form_conditional_rules FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_form_conditional_rules admin write"
  ON public.spk_form_conditional_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_spk_form_conditional_rules_updated_at
  BEFORE UPDATE ON public.spk_form_conditional_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 3. WORKFLOW METADATA
-- =========================================================================
CREATE TABLE public.spk_workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spk_workflow_definitions TO authenticated;
GRANT ALL ON public.spk_workflow_definitions TO service_role;
ALTER TABLE public.spk_workflow_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_workflow_definitions staff read"
  ON public.spk_workflow_definitions FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_workflow_definitions admin write"
  ON public.spk_workflow_definitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_spk_workflow_definitions_updated_at
  BEFORE UPDATE ON public.spk_workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.spk_workflow_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.spk_workflow_definitions(id) ON DELETE CASCADE,
  from_status public.spk_status,
  to_status public.spk_status NOT NULL,
  actor_role public.spk_workflow_actor NOT NULL,
  requires_approval BOOLEAN NOT NULL DEFAULT false,
  pre_condition JSONB,
  post_action JSONB,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workflow_id, from_status, to_status, actor_role)
);
CREATE INDEX idx_spk_workflow_transitions_from ON public.spk_workflow_transitions(workflow_id, from_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spk_workflow_transitions TO authenticated;
GRANT ALL ON public.spk_workflow_transitions TO service_role;
ALTER TABLE public.spk_workflow_transitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_workflow_transitions staff read"
  ON public.spk_workflow_transitions FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_workflow_transitions admin write"
  ON public.spk_workflow_transitions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_spk_workflow_transitions_updated_at
  BEFORE UPDATE ON public.spk_workflow_transitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 4. EVENT FOUNDATION (append-only)
-- =========================================================================
CREATE TABLE public.spk_event_type_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  category TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  schema JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spk_event_type_registry TO authenticated;
GRANT ALL ON public.spk_event_type_registry TO service_role;
ALTER TABLE public.spk_event_type_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_event_type_registry staff read"
  ON public.spk_event_type_registry FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_event_type_registry admin write"
  ON public.spk_event_type_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_spk_event_type_registry_updated_at
  BEFORE UPDATE ON public.spk_event_type_registry
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.spk_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID NOT NULL REFERENCES public.spk_orders(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor_role public.spk_workflow_actor,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  correlation_id UUID,
  causation_id UUID,
  status public.spk_event_status NOT NULL DEFAULT 'committed',
  reverted_by_event_id UUID REFERENCES public.spk_events(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spk_events_spk ON public.spk_events(spk_id, occurred_at DESC);
CREATE INDEX idx_spk_events_type ON public.spk_events(event_type);
CREATE INDEX idx_spk_events_correlation ON public.spk_events(correlation_id);
CREATE INDEX idx_spk_events_actor ON public.spk_events(actor_user_id);

GRANT SELECT, INSERT ON public.spk_events TO authenticated;
GRANT ALL ON public.spk_events TO service_role;
ALTER TABLE public.spk_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_events staff read"
  ON public.spk_events FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_events staff append"
  ON public.spk_events FOR INSERT TO authenticated
  WITH CHECK (public.is_spk_staff(auth.uid()));
-- No UPDATE / DELETE policies → append-only from client.

-- =========================================================================
-- 5. TIMELINE FOUNDATION (projection)
-- =========================================================================
CREATE TABLE public.spk_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID NOT NULL REFERENCES public.spk_orders(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.spk_events(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  actor_role public.spk_workflow_actor,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  icon TEXT,
  meta JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spk_timeline_spk ON public.spk_timeline(spk_id, occurred_at DESC);

GRANT SELECT, INSERT ON public.spk_timeline TO authenticated;
GRANT ALL ON public.spk_timeline TO service_role;
ALTER TABLE public.spk_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_timeline staff read"
  ON public.spk_timeline FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_timeline staff insert"
  ON public.spk_timeline FOR INSERT TO authenticated
  WITH CHECK (public.is_spk_staff(auth.uid()));

-- =========================================================================
-- 6. ANALYTICS FOUNDATION (projection)
-- =========================================================================
CREATE TABLE public.spk_analytics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
  bucket_date DATE NOT NULL,
  metric_code TEXT NOT NULL,
  metric_value NUMERIC NOT NULL DEFAULT 0,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (branch_id, bucket_date, metric_code)
);
CREATE INDEX idx_spk_analytics_daily_date ON public.spk_analytics_daily(bucket_date DESC);
CREATE INDEX idx_spk_analytics_daily_branch_metric ON public.spk_analytics_daily(branch_id, metric_code);

GRANT SELECT ON public.spk_analytics_daily TO authenticated;
GRANT ALL ON public.spk_analytics_daily TO service_role;
ALTER TABLE public.spk_analytics_daily ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_analytics_daily staff read"
  ON public.spk_analytics_daily FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));

CREATE TRIGGER trg_spk_analytics_daily_updated_at
  BEFORE UPDATE ON public.spk_analytics_daily
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- 7. APPROVAL FOUNDATION
-- =========================================================================
CREATE TABLE public.spk_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spk_id UUID NOT NULL REFERENCES public.spk_orders(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approver_role public.spk_workflow_actor NOT NULL DEFAULT 'owner',
  approver_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approval_type TEXT NOT NULL,
  status public.spk_approval_status NOT NULL DEFAULT 'pending',
  payload JSONB,
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_spk_approvals_spk ON public.spk_approvals(spk_id, status);
CREATE INDEX idx_spk_approvals_status ON public.spk_approvals(status, requested_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.spk_approvals TO authenticated;
GRANT ALL ON public.spk_approvals TO service_role;
ALTER TABLE public.spk_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spk_approvals staff read"
  ON public.spk_approvals FOR SELECT TO authenticated
  USING (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_approvals staff insert"
  ON public.spk_approvals FOR INSERT TO authenticated
  WITH CHECK (public.is_spk_staff(auth.uid()));
CREATE POLICY "spk_approvals admin update"
  ON public.spk_approvals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_spk_approvals_updated_at
  BEFORE UPDATE ON public.spk_approvals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
