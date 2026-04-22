import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MIDTRANS_SERVER_KEY = Deno.env.get("MIDTRANS_SERVER_KEY")!;
const SNAP_URL = "https://app.sandbox.midtrans.com/snap/v1/transactions";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

interface ServiceItem {
  service_id: string; name: string; category: string; duration: number; unit_price: number;
}
interface TireItem {
  tire_id: string; brand: string; type: string; size: string; quantity: number; unit_price: number;
}
interface Body {
  services: ServiceItem[];
  tires: TireItem[];
  customer: { name: string; email: string; phone: string };
  branch: string;
  vehicle_id: string | null;
  car_type: string | null;
  car_plate_number: string | null;
  // Single shared schedule when there are services (or installation)
  schedule_date: string | null;   // YYYY-MM-DD
  schedule_time: string | null;   // HH:MM
  // For tire-only checkout
  tire_fulfillment: "pickup" | "installation";
  notes: string | null;
  payment_method?: "midtrans" | "pay_at_workshop" | "transfer" | "qris";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!MIDTRANS_SERVER_KEY) return json({ error: "Server payment misconfigured" }, 500);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body) return json({ error: "Invalid input" }, 400);

    const services = Array.isArray(body.services) ? body.services : [];
    const tires = Array.isArray(body.tires) ? body.tires : [];
    if (services.length === 0 && tires.length === 0) return json({ error: "Cart kosong" }, 400);
    if (!body.customer?.name || !body.customer?.email || !body.customer?.phone) {
      return json({ error: "Data customer tidak lengkap" }, 400);
    }
    if (!body.branch) return json({ error: "Cabang wajib dipilih" }, 400);

    // If services exist, schedule is required (used for booking + tire install)
    const hasService = services.length > 0;
    if (hasService && (!body.schedule_date || !body.schedule_time)) {
      return json({ error: "Jadwal wajib dipilih untuk service" }, 400);
    }

    // Effective tire fulfillment: if there's any service, force installation on the same schedule
    const tireFulfillment: "pickup" | "installation" = hasService ? "installation" : (body.tire_fulfillment || "installation");
    if (tires.length > 0 && tireFulfillment === "installation" && !hasService) {
      if (!body.schedule_date || !body.schedule_time) {
        return json({ error: "Jadwal pemasangan ban wajib dipilih" }, 400);
      }
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const paymentMethod = body.payment_method || "midtrans";
    const isManual = paymentMethod !== "midtrans";
    const isPayLater = paymentMethod === "pay_at_workshop";
    const bookingPaymentStatus = isPayLater ? "pay_later" : isManual ? "awaiting_confirmation" : "pending";

    const createdBookingIds: string[] = [];
    let createdTireOrderId: string | null = null;
    let createdTireOrderNumber: string | null = null;

    // 1) Create one booking per service
    for (const s of services) {
      const { data: bk, error } = await admin.from("bookings").insert({
        user_id: user.id,
        service_type: s.category || "service",
        service_name: s.name,
        service_price: s.unit_price,
        service_duration: s.duration,
        booking_date: body.schedule_date!,
        booking_time: body.schedule_time!,
        customer_name: body.customer.name,
        customer_email: body.customer.email,
        customer_phone: body.customer.phone,
        branch: body.branch,
        vehicle_id: body.vehicle_id || null,
        car_type: body.car_type || null,
        car_plate_number: body.car_plate_number || null,
        status: "pending",
        payment_status: bookingPaymentStatus,
      }).select("id").single();
      if (error || !bk) {
        console.error("[cart-checkout] booking insert failed", error);
        return json({ error: `Gagal buat booking: ${error?.message}` }, 500);
      }
      createdBookingIds.push(bk.id);
    }

    // 2) Create a single tire_order with all tires (if any)
    let tireSubtotal = 0;
    let tireQty = 0;
    if (tires.length > 0) {
      const orderItems = tires.map(t => {
        const sub = Number(t.unit_price) * t.quantity;
        tireSubtotal += sub;
        tireQty += t.quantity;
        return {
          tire_id: t.tire_id, brand: t.brand, type: t.type, size: t.size,
          quantity: t.quantity, unit_price: Number(t.unit_price), subtotal: sub,
        };
      });
      const installFee = tireFulfillment === "installation" ? tireQty * 50000 : 0;
      const tireTotal = tireSubtotal + installFee;

      const { data: order, error } = await admin.from("tire_orders").insert({
        user_id: user.id,
        order_number: "",
        customer_name: body.customer.name,
        customer_email: body.customer.email,
        customer_phone: body.customer.phone,
        items: orderItems,
        quantity_total: tireQty,
        subtotal: tireSubtotal,
        installation_fee: installFee,
        total_amount: tireTotal,
        fulfillment_type: tireFulfillment,
        branch: body.branch,
        vehicle_id: tireFulfillment === "installation" ? (body.vehicle_id || null) : null,
        car_type: tireFulfillment === "installation" ? (body.car_type || null) : null,
        car_plate_number: tireFulfillment === "installation" ? (body.car_plate_number || null) : null,
        install_date: tireFulfillment === "installation" ? body.schedule_date : null,
        install_time: tireFulfillment === "installation" ? body.schedule_time : null,
        notes: body.notes || null,
        status: "pending",
        payment_status: "pending",
        payment_method: "midtrans",
      }).select("id, order_number").single();
      if (error || !order) {
        console.error("[cart-checkout] tire_order insert failed", error);
        return json({ error: `Gagal buat pesanan ban: ${error?.message}` }, 500);
      }
      createdTireOrderId = order.id;
      createdTireOrderNumber = order.order_number;
    }

    // 3) Build a single Midtrans transaction covering everything
    const serviceTotal = services.reduce((s, x) => s + Number(x.unit_price), 0);
    const installFee = tireFulfillment === "installation" ? tireQty * 50000 : 0;
    const grossAmount = Math.round(serviceTotal + tireSubtotal + installFee);
    const orderRef = `CART-${user.id.slice(0, 8)}-${Date.now()}`;

    const itemDetails: { id: string; price: number; quantity: number; name: string }[] = [];
    for (const s of services) {
      itemDetails.push({
        id: `SVC-${s.service_id}`.substring(0, 50),
        price: Math.round(Number(s.unit_price)), quantity: 1,
        name: s.name.substring(0, 50),
      });
    }
    for (const t of tires) {
      itemDetails.push({
        id: `TIRE-${t.tire_id}`.substring(0, 50),
        price: Math.round(Number(t.unit_price)), quantity: t.quantity,
        name: `${t.brand} ${t.type} ${t.size}`.substring(0, 50),
      });
    }
    if (installFee > 0) {
      itemDetails.push({ id: "INSTALL", price: Math.round(installFee), quantity: 1, name: "Biaya Pemasangan Ban" });
    }

    const phoneClean = String(body.customer.phone).replace(/\D/g, "").slice(0, 19);
    const payload = {
      transaction_details: { order_id: orderRef, gross_amount: grossAmount },
      item_details: itemDetails,
      customer_details: {
        first_name: body.customer.name.substring(0, 50),
        email: body.customer.email.substring(0, 50),
        phone: phoneClean || "0000000000",
      },
      credit_card: { secure: true },
      custom_field1: createdBookingIds.join(","),
      custom_field2: createdTireOrderId ?? "",
    };

    const auth = btoa(`${MIDTRANS_SERVER_KEY}:`);
    const resp = await fetch(SNAP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Basic ${auth}` },
      body: JSON.stringify(payload),
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.token) {
      console.error("[cart-checkout] midtrans rejected", { status: resp.status, data });
      return json({ error: data?.error_messages?.join(", ") || "Midtrans error" }, 502);
    }

    // Record one payment row per booking, all linked to the same midtrans order
    for (const bid of createdBookingIds) {
      const svc = services[createdBookingIds.indexOf(bid)];
      await admin.from("payments").insert({
        user_id: user.id, booking_id: bid,
        amount: Number(svc?.unit_price || 0),
        payment_method: "midtrans",
        payment_status: "pending",
        midtrans_order_id: orderRef,
      });
    }
    if (createdTireOrderId) {
      await admin.from("tire_orders").update({
        midtrans_order_id: orderRef,
      }).eq("id", createdTireOrderId);
    }

    return json({
      snap_token: data.token,
      redirect_url: data.redirect_url,
      order_ref: orderRef,
      booking_ids: createdBookingIds,
      tire_order_id: createdTireOrderId,
      tire_order_number: createdTireOrderNumber,
      client_key: Deno.env.get("MIDTRANS_CLIENT_KEY"),
    });
  } catch (err) {
    console.error("[cart-checkout] unexpected", err);
    return json({ error: String((err as Error)?.message || err) }, 500);
  }
});
