import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FONNTE_URL = "https://api.fonnte.com/send";
const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_PHONE_15M = 4;
const PHONE_EMAIL_DOMAIN = "phone.bengkelstroban.com";
const LEGACY_DOMAIN = "phone.local";

function normalizePhone(raw: string): string | null {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return null;
  let p = digits;
  if (p.startsWith("0")) p = "62" + p.slice(1);
  else if (p.startsWith("8")) p = "62" + p;
  if (!p.startsWith("62")) return null;
  if (p.length < 10 || p.length > 15) return null;
  return p;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomDigits(n: number): string {
  const arr = new Uint32Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((v) => (v % 10).toString()).join("");
}

function maskPhone(p: string): string {
  if (p.length < 6) return p;
  return p.slice(0, 4) + "***" + p.slice(-3);
}

async function sendWa(phone: string, message: string) {
  const token = Deno.env.get("FONNTE_TOKEN");
  if (!token) return { ok: false, reason: "no_token" };
  const fd = new FormData();
  fd.append("target", phone);
  fd.append("message", message);
  fd.append("countryCode", "62");
  try {
    const res = await fetch(FONNTE_URL, {
      method: "POST",
      headers: { Authorization: token },
      body: fd,
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, reason: (e as Error)?.message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  let body: any;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const action = String(body?.action || "");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    // -------- REQUEST OTP --------
    if (action === "request") {
      const phone = normalizePhone(String(body?.phone || ""));
      if (!phone) return json({ error: "Nomor WhatsApp tidak valid" }, 400);

      // Rate limit per phone (last 15 min)
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("phone_otp_codes")
        .select("id", { count: "exact", head: true })
        .eq("phone", phone)
        .gte("created_at", since);
      if ((count ?? 0) >= MAX_REQUESTS_PER_PHONE_15M) {
        return json({ ok: true, masked: maskPhone(phone) });
      }

      const otp = randomDigits(6);
      const hash = await sha256Hex(otp + ":" + phone);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

      await supabase.from("phone_otp_codes").insert({
        phone,
        code_hash: hash,
        expires_at: expiresAt,
        ip,
      });

      const message =
        `Kode login *Bengkel Mobil Stroban Service*: *${otp}*\n` +
        `Berlaku 5 menit. JANGAN bagikan kode ini ke siapa pun.`;
      await sendWa(phone, message);

      return json({ ok: true, masked: maskPhone(phone) });
    }

    // -------- VERIFY OTP --------
    if (action === "verify") {
      const phone = normalizePhone(String(body?.phone || ""));
      const code = String(body?.code || "").replace(/\D/g, "");
      if (!phone || code.length !== 6) return json({ error: "Input tidak valid" }, 400);

      const { data: row } = await supabase
        .from("phone_otp_codes")
        .select("*")
        .eq("phone", phone)
        .is("consumed_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!row) return json({ error: "Kode tidak ditemukan atau sudah dipakai" }, 400);
      if (new Date(row.expires_at).getTime() < Date.now()) {
        return json({ error: "Kode sudah kedaluwarsa. Minta kode baru." }, 400);
      }
      if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
        return json({ error: "Terlalu banyak percobaan. Minta kode baru." }, 429);
      }

      const candidate = await sha256Hex(code + ":" + phone);
      if (candidate !== row.code_hash) {
        await supabase
          .from("phone_otp_codes")
          .update({ attempts: (row.attempts ?? 0) + 1 })
          .eq("id", row.id);
        return json({ error: "Kode OTP salah" }, 400);
      }

      // Mark consumed
      await supabase
        .from("phone_otp_codes")
        .update({ consumed_at: new Date().toISOString() })
        .eq("id", row.id);

      // Find or create user
      const newEmail = `${phone}@${PHONE_EMAIL_DOMAIN}`;
      const legacyEmail = `${phone}@${LEGACY_DOMAIN}`;
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      let user = list?.users?.find((u: any) => {
        const e = (u.email || "").toLowerCase();
        return e === newEmail || e === legacyEmail;
      });

      if (!user) {
        const tempPassword = crypto.randomUUID().replace(/-/g, "") + "Aa1!";
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: newEmail,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { phone, full_name: "", created_via: "phone_otp" },
        });
        if (createErr) return json({ error: createErr.message }, 400);
        user = created.user!;
        // Ensure profile
        await supabase.from("profiles").upsert({
          id: user.id,
          phone,
          full_name: "",
          is_verified: false,
          acquisition_source: "phone_otp",
        }, { onConflict: "id" });
        await supabase.from("user_roles").upsert(
          { user_id: user.id, role: "customer" },
          { onConflict: "user_id,role" },
        );
      }

      // Generate magic link for session bootstrap
      const siteUrl = Deno.env.get("SITE_URL") || "https://www.bengkelstroban.com";
      const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: user.email!,
        options: { redirectTo: `${siteUrl}/auth/callback` },
      });
      if (linkErr || !linkData?.properties?.action_link) {
        return json({ error: linkErr?.message || "Gagal membuat sesi" }, 500);
      }

      return json({ ok: true, action_link: linkData.properties.action_link });
    }

    return json({ error: "Action tidak dikenal" }, 400);
  } catch (e) {
    console.error("phone-otp-login error", e);
    return json({ error: (e as Error)?.message || "Server error" }, 500);
  }
});