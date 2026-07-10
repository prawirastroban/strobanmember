// Phase 4.2 — SPKService
// Owns lifecycle of spk_orders: create, update, close, cancel.
// All status changes MUST route through WorkflowService (§80, §85, §90).
// All activity MUST produce an event via EventService.
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { EventService } from "./EventService";
import { WorkflowService } from "./WorkflowService";
import {
  fail,
  ok,
  type ServiceResult,
  type SpkActor,
  type SpkCommandContext,
  type SpkOrderRow,
  type SpkPriority,
} from "./types";

export interface CreateSpkInput {
  branch_id: string;
  booking_id?: string | null;
  customer_id?: string | null;
  vehicle_id?: string | null;
  form_template_version_id?: string | null;
  priority?: SpkPriority;
  data?: Json;
  notes?: string | null;
  initial_owner_role?: SpkActor;
  ctx: SpkCommandContext;
}

export interface UpdateSpkInput {
  spk_id: string;
  patch: {
    data?: Json;
    notes?: string | null;
    priority?: SpkPriority;
    current_owner_role?: SpkActor;
    current_owner_user_id?: string | null;
  };
  ctx: SpkCommandContext;
}

/** Generate a globally unique SPK number: SPK/<BRANCH_CODE>/<YYYYMM>/<SEQ>. */
async function generateSpkNumber(branch_id: string): Promise<string> {
  const { data: br } = await supabase
    .from("branches")
    .select("name, slug")
    .eq("id", branch_id)
    .maybeSingle();
  const rawBranch = br?.slug || br?.name || branch_id;
  const normalizedBranch = rawBranch.toString().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const branchSuffix = branch_id.replace(/-/g, "").slice(0, 4).toUpperCase();
  const code = `${normalizedBranch.slice(0, 4) || "GEN"}${branchSuffix}`.slice(0, 8);
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const { count } = await supabase
    .from("spk_orders")
    .select("id", { count: "exact", head: true })
    .like("spk_number", `SPK/${code}/${ym}/%`);
  const seq = String((count ?? 0) + 1).padStart(4, "0");
  return `SPK/${code}/${ym}/${seq}`;
}

async function generateAvailableSpkNumber(branch_id: string): Promise<string> {
  let candidate = await generateSpkNumber(branch_id);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data: existing } = await supabase
      .from("spk_orders")
      .select("id")
      .eq("spk_number", candidate)
      .maybeSingle();
    if (!existing) return candidate;

    const parts = candidate.split("/");
    const next = String(Number(parts[parts.length - 1] || "0") + 1).padStart(4, "0");
    candidate = [...parts.slice(0, -1), next].join("/");
  }
  return candidate;
}

function normalizeBranchText(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export const SPKService = {
  async create(input: CreateSpkInput): Promise<ServiceResult<SpkOrderRow>> {
    const spk_number = await generateAvailableSpkNumber(input.branch_id);
    const { data, error } = await supabase
      .from("spk_orders")
      .insert({
        spk_number,
        branch_id: input.branch_id,
        booking_id: input.booking_id ?? null,
        customer_id: input.customer_id ?? null,
        vehicle_id: input.vehicle_id ?? null,
        form_template_version_id: input.form_template_version_id ?? null,
        priority: input.priority ?? "normal",
        data: (input.data ?? {}) as Json,
        notes: input.notes ?? null,
        created_by: input.ctx.actor.user_id,
        current_owner_role: input.initial_owner_role ?? input.ctx.actor.role,
        current_owner_user_id: input.ctx.actor.user_id,
      })
      .select("*")
      .single();
    if (error || !data) return fail(error?.message ?? "spk_create_failed", "SPK_CREATE");

    await EventService.append({
      spk_id: data.id,
      event_type: "spk_created",
      payload: {
        spk_number: data.spk_number,
        branch_id: data.branch_id,
        booking_id: data.booking_id,
        customer_id: data.customer_id,
        vehicle_id: data.vehicle_id,
      },
      ctx: input.ctx,
    });
    return ok(data as SpkOrderRow);
  },

  async update({ spk_id, patch, ctx }: UpdateSpkInput): Promise<ServiceResult<SpkOrderRow>> {
    // Never allow status here — must go via WorkflowService.
    const { data, error } = await supabase
      .from("spk_orders")
      .update(patch)
      .eq("id", spk_id)
      .select("*")
      .single();
    if (error || !data) return fail(error?.message ?? "spk_update_failed", "SPK_UPDATE");
    await EventService.append({ spk_id, event_type: "spk_updated", payload: patch as Json, ctx });
    return ok(data as SpkOrderRow);
  },

  async close(
    spk_id: string,
    workflow_code: string,
    ctx: SpkCommandContext,
  ): Promise<ServiceResult<{ from: string | null; to: string }>> {
    const t = await WorkflowService.transition({ spk_id, workflow_code, to_status: "closed", ctx });
    if (!t.ok) return t;
    await supabase.from("spk_orders").update({ closed_at: new Date().toISOString() }).eq("id", spk_id);
    await EventService.append({ spk_id, event_type: "spk_closed", payload: {}, ctx });
    return ok(t.data);
  },

  async cancel(
    spk_id: string,
    workflow_code: string,
    reason: string,
    ctx: SpkCommandContext,
  ): Promise<ServiceResult<{ from: string | null; to: string }>> {
    const t = await WorkflowService.transition({
      spk_id,
      workflow_code,
      to_status: "cancelled",
      reason,
      ctx,
    });
    if (!t.ok) return t;
    await supabase
      .from("spk_orders")
      .update({ cancelled_at: new Date().toISOString(), cancelled_reason: reason })
      .eq("id", spk_id);
    await EventService.append({ spk_id, event_type: "spk_cancelled", payload: { reason }, ctx });
    return ok(t.data);
  },

  async getById(spk_id: string): Promise<ServiceResult<SpkOrderRow | null>> {
    const { data, error } = await supabase.from("spk_orders").select("*").eq("id", spk_id).maybeSingle();
    if (error) return fail(error.message);
    return ok((data ?? null) as SpkOrderRow | null);
  },

  /** Idempotent: returns existing SPK for booking if present, otherwise creates one from booking snapshot. */
  async createFromBooking(booking_id: string, ctx: SpkCommandContext): Promise<ServiceResult<SpkOrderRow>> {
    // 1. Reuse only active SPK rows. Cancelled/deleted SPKs must not block
    // a workshop from re-creating an SPK when the booking is tested/reworked.
    const { data: existing } = await supabase
      .from("spk_orders")
      .select("*")
      .eq("booking_id", booking_id)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) return ok(existing as SpkOrderRow);

    // 2. Load booking + related profile
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .maybeSingle();
    if (bErr || !booking) return fail(bErr?.message ?? "booking_not_found", "SPK_FROM_BOOKING");

    // 3. Resolve branch_id — bookings.branch is a text name; find matching branches row
    let branch_id: string | null = null;
    if (booking.branch) {
      const branchKey = normalizeBranchText(booking.branch);
      const { data: branches } = await supabase
        .from("branches")
        .select("id, name, slug")
        .order("name", { ascending: true });
      const br = (branches ?? []).find((row) => {
        const nameKey = normalizeBranchText(row.name);
        const slugKey = normalizeBranchText(row.slug);
        return nameKey === branchKey || slugKey === branchKey || nameKey.endsWith(branchKey);
      });
      branch_id = br?.id ?? null;
    }
    if (!branch_id) {
      // Fallback: first branch
      const { data: anyBr } = await supabase.from("branches").select("id").limit(1).maybeSingle();
      branch_id = anyBr?.id ?? null;
    }
    if (!branch_id) return fail("no_branch_available", "SPK_FROM_BOOKING");

    // 4. Optional vehicle
    let vehicle_id: string | null = booking.vehicle_id ?? null;

    // 5. Snapshot data
    const initialData: Json = {
      customer_name: booking.customer_name ?? "",
      customer_phone: booking.customer_phone ?? "",
      customer_platform: "aplikasi",
      vehicle_merk: (booking.car_type ?? "").split(" ")[0] ?? "",
      vehicle_tipe: booking.car_type ?? "",
      vehicle_tahun: "",
      vehicle_plate: booking.car_plate_number ?? "",
      vehicle_mileage_now: "",
      complaint_note: booking.customer_notes ?? booking.service_name ?? "",
      complaint_estimasi: "",
      service_name: booking.service_name ?? "",
      service_price: booking.service_price ?? 0,
    } as unknown as Json;

    return this.create({
      branch_id,
      booking_id,
      customer_id: booking.user_id ?? null,
      vehicle_id,
      priority: "normal",
      data: initialData,
      notes: booking.customer_notes ?? null,
      initial_owner_role: ctx.actor.role,
      ctx,
    });
  },

  async getByBookingId(booking_id: string): Promise<ServiceResult<SpkOrderRow | null>> {
    const { data, error } = await supabase
      .from("spk_orders")
      .select("*")
      .eq("booking_id", booking_id)
      .maybeSingle();
    if (error) return fail(error.message);
    return ok((data ?? null) as SpkOrderRow | null);
  },
};
