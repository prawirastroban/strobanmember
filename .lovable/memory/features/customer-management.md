---
name: Unified Customer Management
description: /dashboard/customers merges customer list, vehicles, verification & roles via admin-user-ops. Canonical roles include mekanik.
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
all • unverified • verified • with_vehicle • no_vehicle • staff_or_admin • role filters for customer, cs pusat, admin cabang, mekanik cabang, staff.

## Role-based access (RBAC)
- Canonical roles are **staff**, **admin** (CS Pusat), **admin_cabang**, **mekanik**, and **customer**.
- Roles remain 1:1 via `user_roles`; branch-scoped roles (**admin_cabang**, **mekanik**) require `profiles.assigned_branch`.
- **Staff** — full action menu: View Detail, View Vehicles, Edit Customer, Add Vehicle, Create Booking, Verify User, Change Role, Reset Password, Delete Account.
- **Admin / CS Pusat** — operational admin access where allowed by current RBAC; keep sensitive user mutations routed through the admin backend function.

## Backend
- User/account mutations must go through edge function `admin-user-ops` via `invokeAdminUserOps`: create customer, update profile/email, add vehicle, verify, reset password/OTP, delete account, change role.
- Do not mutate `profiles`, `user_roles`, or admin-created `vehicles` directly from admin UI for account-management flows.
- Realtime sync via Supabase channels on `profiles` and `user_roles`.

## Routes
- `/dashboard/customers` — unified list (CustomerList.tsx)
- `/dashboard/customers/:id` — detail page (CustomerDetail.tsx)
- `/dashboard/user-verification` and `/dashboard/users` redirect to `/dashboard/customers` for back-compat.
