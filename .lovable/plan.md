## Diagnosis (from logs + DB)

| Layer | State | Evidence |
|---|---|---|
| Token registration | ✅ 5 active tokens | `push_tokens` count |
| DB triggers → `notifications` insert | ✅ Already cover booking, payment, registration, invoice, tire order, vehicle, loyalty | `pg_trigger` audit |
| `trg_dispatch_notification` AFTER INSERT → calls edge function | ✅ Fires (2 `trigger` logs in last hour) | `push_delivery_logs` |
| Edge function `dispatch-notification` | ❌ **Crashes on `JSON.parse(FCM_SERVICE_ACCOUNT_JSON)` — "Unexpected non-whitespace character at position 6"** | edge logs |
| Result | 0 `sent` events ever, 47 `skipped`, all real pushes lost | `push_delivery_logs` |
| Notification Center / Badge / Click routing | ✅ Already realtime-subscribed and route-aware | `useAppBadge`, `NotificationCenter`, `notificationRoute.ts`, SW `notificationclick` |
| Permission-grant toast / device-count realtime | ❌ Missing | code review |
| Business events missing notification triggers | Promo claim, reward redemption, referral commission to customer, internal bug report ack | DB scan |

The headline issue is **one bad secret**, not architecture. Most "lifecycle" items the user lists are already implemented and will start working the moment FCM can authenticate.

---

## Plan

### 1. Fix the root cause: re-supply `FCM_SERVICE_ACCOUNT_JSON`
The current secret value is not valid JSON. We will request the user to re-paste the Firebase service-account JSON (the full file content downloaded from Firebase Console → Project settings → Service accounts → "Generate new private key"). This is the single change that unblocks all 5 devices receiving every existing event.

### 2. Harden `dispatch-notification` against bad secret values
- Trim BOM/whitespace and surrounding quotes before `JSON.parse`.
- On parse failure, write a clear `push_delivery_logs` row (`event_type='failed'`, reason `bad_fcm_credentials`) instead of throwing a generic 500, so the PWA Settings panel can surface it.

### 3. Visual feedback on permission grant
In `StandaloneNotifPrompt.tsx` / `useWebPush.ts`, after `registerWebPushNow()` returns `{ok:true}` (whether triggered by the iOS one-tap prompt or by silent re-grant), fire a toast:
> "Perangkat berhasil terhubung dan siap menerima notifikasi."

### 4. Live device count in PWA Settings
Add a realtime subscription on `push_tokens` filtered by `user_id` in `PwaSettingsManager.tsx` so the "Total perangkat" badge increments without a reload.

### 5. Close the event-coverage gap
Add DB notification inserts for the four events that currently bypass `notifications` (and therefore bypass the dispatcher):

| Event | Source table | Notify whom |
|---|---|---|
| Promo digunakan | `promo_claims` AFTER INSERT | customer + staff |
| Voucher/reward digunakan | `reward_redemptions` AFTER INSERT | customer + staff |
| Referral commission awarded | `referral_commissions` AFTER UPDATE (status→awarded) | customer (referrer) |
| Bug & masukan baru | `internal_reports` AFTER INSERT | staff |

These reuse the existing `create_notification()` helper, so they automatically get push + Notification Center + badge + click-routing for free.

### 6. Verify with real business events (not the test button)
After the secret is replaced, run a real flow and confirm:
- Insert a test booking from a customer → `push_delivery_logs.event_type='sent'` appears.
- iPhone PWA (locked screen) receives the notification with brand icon.
- Tap → opens `/dashboard/customers/{id}` for staff or `/profile/history-perawatan` for customer.
- Badge count on Home Screen icon matches `unread`.

---

## Out of scope (per user request)
- No DB schema changes beyond the 4 new triggers above.
- No changes to token registration, VAPID key, or service-worker file structure.
- No dummy/simulated notifications.

---

## Required from user
Re-supply the **`FCM_SERVICE_ACCOUNT_JSON`** secret. Paste the full contents of the service-account JSON file exactly as downloaded — must start with `{` and end with `}`, no surrounding quotes, no triple-backticks, no truncation.

I will request it via the secrets tool the moment you approve this plan.
