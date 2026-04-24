---
name: Promos Manager
description: Staff-only CRUD for /promo content via Dashboard → Marketing → Promos
type: feature
---
Staff/admin manage all `/promo` page content from Dashboard Panel → Marketing → Promos (`/dashboard/marketing/promos`). The `PromosManager` component performs full CRUD on the `promos` table (title, description, badge, discount_type/value, min_purchase, max_claims, voucher_prefix, starts_at, ends_at, terms, image_url, sort_order, is_active). Uses existing RLS — staff have full access, public sees only active promos within date window. Toggling `is_active` instantly hides/shows the promo on `/promo`. The customer-facing `/promo` page remains read-only and reflects changes in real time on next load.
