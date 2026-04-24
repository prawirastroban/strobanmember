---
name: Unified Customer Management
description: /dashboard/customers merges customer list, vehicles, verification & roles. Staff has full action access; admin is read-only.
type: feature
---

# Customer Management (Unified)

The Dashboard Panel page **/dashboard/customers** is the single source of truth for managing people in the platform. Three previously-separate panels have been merged here:

- Customers & Vehicles list
- User Verification
- Users & Roles

## Table columns
Customer (name + customer_id) • Kontak (email + phone) • Vehicle count • Role badge • Verification badge • Actions menu.

## Filters
all • unverified • verified • with_vehicle • no_vehicle • staff (role = staff or admin)

## Role-based access (RBAC)
- **Staff** — full action menu: View Detail, View Vehicles, Edit Customer, Add Vehicle, Create Booking, Verify User, Change Role, Reset Password, Delete Account.
- **Admin** — read-only: only "View Detail" and "View Vehicles" appear in the actions menu. The header shows a `Admin (Read-Only)` badge.

## Backend
- Verify / Reset password / Delete user → edge function `admin-user-ops` with actions `verify_user`, `reset_password`, `delete_user`.
- Change role → direct RLS-protected mutations on `user_roles` (delete then insert single row to enforce 1:1 role).
- Realtime sync via Supabase channels on `profiles` and `user_roles`.

## Routes
- `/dashboard/customers` — unified list (CustomerList.tsx)
- `/dashboard/customers/:id` — detail page (CustomerDetail.tsx)
- `/dashboard/user-verification` and `/dashboard/users` redirect to `/dashboard/customers` for back-compat.
