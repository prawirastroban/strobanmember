## Objective

Wire **Role Profiles**, **Workflow**, and **Approval Matrix** into one reactive Operational Configuration graph. When Owner edits any of the three in `/dashboard/spk/configuration`, every dependent scope (Canvas sections, `useSPKWorkflow` action bar, ApprovalCard visibility, Workflow viewer badges) revises itself automatically — no reload, no code change, no schema migration.

## Current gap

- `useSPKWorkflow` loads the approval matrix once on mount; changing it in the UI does not refresh open Canvases.
- `WorkflowService.availableTransitions` filters DB transitions by a single `actor_role` value, but seeded transitions use **legacy actor keys** (`reception`, `qc`, `cashier`) that no longer map to the simplified 5-role model. Result: `admin_cabang`/`mekanik` see fewer transitions than intended.
- `ApprovalCard` (section `approval`) is visible based only on role profile — it doesn't hide when Owner disables `qc_required` / `final_approval` in the Approval Matrix.
- `OperationalConfigService.saveRaw` invalidates its own cache but doesn't tell React consumers to re-read; only Role Profiles has a subscription channel.

## Design (no schema changes, no new engines)

### 1. Role → Workflow actor alias map (metadata)

Extend the `spk.role_profiles` payload with an optional `workflow_roles: string[]` per role. Defaults inherit the legacy actor set that each simplified role effectively performs:

```
owner        → [owner, admin, admin_cabang, reception, mechanic, qc, cashier]
admin        → [admin, reception, qc, cashier]
admin_cabang → [admin_cabang, reception, qc, cashier]
mechanic     → [mechanic]
system       → []            (customer, read-only)
```

- Persisted in the same `app_settings` row — no migration needed.
- Editable later, but the default is what makes the current seeded workflow work end-to-end for the simplified role set.

### 2. `WorkflowService.availableTransitions` accepts alias list

Change the actor filter from `eq("actor_role", role)` to `in("actor_role", aliases)` and de-duplicate the returned `to_status` list. `useSPKWorkflow` resolves aliases via a new `RoleProfiles.getWorkflowRoles(actor)` helper that reads from the active (hydrated) config cache with the defaults above as fallback.

### 3. Approval Matrix ↔ Workflow ↔ Approval section

`useSPKWorkflow.filterByApproval` already gates `qc_*` and `closed` targets. Two fixes:

- Also gate `invoice_issued` / `invoice_paid` behind `final_approval` (current bug: closing without final approval still shows invoice steps).
- Expose the effective matrix from FormRuntimeProvider so `ApprovalCard` can hide its QC-approval checks when `qc_required=false` and the whole section when `final_approval=false` **and** the role profile makes it optional. Canvas stays a pure renderer — visibility flows through `useSectionBinding`.

### 4. Reactive propagation via RuntimeBus

Add a new bus channel `config-updated` with a payload `{ key: SpkConfigKey }`.

- `OperationalConfigService.saveRaw()` publishes `config-updated` after a successful upsert and calls `load({ force: true })` so `RoleProfiles.setRoleProfiles` fires its existing subscribers.
- `useSPKWorkflow` subscribes to `config-updated` (for keys `spk.approval_matrix` and `spk.role_profiles`) → re-runs `load()`.
- `FormRuntimeProvider` (already subscribed to `subscribeRoleProfiles`) additionally subscribes to `config-updated:spk.approval_matrix` and exposes the matrix in context so ApprovalCard reads it.
- `SPKConfigurationPanel`'s Workflow tab subscribes to `config-updated` to re-render its badges (showing which roles now inherit which transitions).

### 5. UI cross-references in the Config Panel

Purely presentational, so Owners see the coupling:

- Role Profiles editor: for each role row, show a small "→ workflow roles: reception, qc, cashier" hint pulled from the alias map.
- Approval Matrix editor: add a live warning line per switch, e.g. "QC Required OFF → transitions `qc_pending`, `qc_passed`, `qc_failed` hidden; ApprovalCard QC checks hidden."
- Workflow viewer: tag each transition badge with the **effective simplified roles** (derived from the alias map) alongside the raw DB `actor_role`.

## Files touched

- `src/runtime/form/RoleProfiles.ts` — add `WorkflowRoleMap`, `DEFAULT_WORKFLOW_ROLES`, `getWorkflowRoles()`, extend `normaliseRoleProfilesPayload` to accept optional `workflow_roles`.
- `src/runtime/spk/RuntimeBus.ts` — declare new `config-updated` event.
- `src/services/spk/OperationalConfigService.ts` — publish `config-updated` inside `saveRaw` (+ `load` for `spk.approval_matrix` cache so consumers can read it without re-querying).
- `src/services/spk/WorkflowService.ts` — accept `SpkActor | SpkActor[]`, use `.in("actor_role", aliases)`, de-dupe results.
- `src/hooks/spk/useSPKWorkflow.ts` — resolve aliases, subscribe to `config-updated`, extend `filterByApproval` for invoice steps.
- `src/hooks/spk/FormRuntimeProvider.tsx` — expose approval matrix in context; propagate to `useSectionBinding("approval")`.
- `src/components/spk/canvas/ApprovalCard.tsx` — read matrix from context; hide QC checks / whole section per flags.
- `src/components/admin/system/spk/SPKConfigurationPanel.tsx` — alias hint per role, live warnings on Approval switches, workflow viewer badges from alias map.

## Explicit non-goals

- No DB migration, no new tables, no new enum values.
- No re-seed of `spk_workflow_transitions`; legacy actor keys stay and are reached via the alias map.
- WorkflowEngine / StateEngine / AutomationEngine / EventEngine untouched.
- Canvas stays a pure renderer — every new coupling flows through Runtime metadata.

## Verification

1. Open two tabs on `/dashboard/spk/configuration` and a Canvas.
2. Toggle "QC Required" off → Canvas action bar drops `qc_pending/qc_passed/qc_failed` and ApprovalCard QC checks disappear within one tick (no reload).
3. Uncheck a section for `mechanic` in Role Profiles → open Canvas immediately hides it via `subscribeRoleProfiles`.
4. Switch `?role=mekanik` → action bar shows only transitions whose `actor_role` is in `[mechanic]`; switch `?role=admin_cabang` → includes reception/qc/cashier hops as expected.
