---
name: Branch Payment Info
description: After picking transfer/QRIS on MyBooking, inline panel shows rekening + QRIS filtered by booking.branch (fallback to global)
type: feature
---
- Component: `src/components/payment/BranchPaymentInfo.tsx` — used on `/my-booking/:id` after user picks transfer/qris.
- Filter rule: prefer entries where `branch === booking.branch`; fallback to entries with `branch IS NULL` (global).
- Tables: `manual_payment_accounts.branch` (text, added 2026-05-19) and `manual_payment_qris.branch`.
- Admin: `ManualPaymentManager.tsx` BankAccountsTab uses a Select pulling `branches.slug` (mirrors QrisTab).
- `branch_label` retained as optional secondary descriptor in bank account form.
- `ManualPayment.tsx` upload page also filters accounts by booking branch with the same fallback.
