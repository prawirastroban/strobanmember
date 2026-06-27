import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/**
 * auth-signup — public endpoint.
 * Membuat akun via Admin API dengan `email_confirm: true` supaya semua
 * signup (email + sintetis phone) langsung aktif. Menggantikan
 * `supabase.auth.signUp` dari client yang sering meninggalkan akun
 * dalam status `email_confirmed_at = NULL` sehingga user tidak bisa login.
 */

const PHONE_EMAIL_DOMAIN = "phone.bengkelstroban.com";

function normPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).replace(/\D/g, "");
  if (!s) return null;
  if (s.startsWith("0")) s = "62" + s.slice(1);
  else if (s.startsWith("8")) s = "62" + s;
  if (!s.startsWith("62")) return null;
  if (s.length < 10 || s.length > 15) return null;
  return s;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = await req.json().catch(() => ({} as any));
    const email = String(body?.email || "").trim().toLowerCase();
    const password = String(body?.password || "");
    const fullName = String(body?.full_name || "").trim();
    const phoneRaw = String(body?.phone || "").trim();
    const mode = body?.mode === "phone" ? "phone" : "email";

    if (!email || !password) {
      return json({ ok: false, error: "Email dan kata sandi wajib diisi" }, 400);
    }
    if (password.length < 6) {
      return json({ ok: false, error: "Kata sandi minimal 6 karakter" }, 400);
    }
    const phoneDigits = normPhone(phoneRaw);
    if (mode === "phone" && !phoneDigits) {
      return json({ ok: false, error: "Nomor WhatsApp tidak valid" }, 400);
    }
    const phoneE164 = phoneDigits ? `+${phoneDigits}` : null;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );

    // Cek apakah akun sudah ada
    const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listErr) return json({ ok: false, error: listErr.message }, 500);
    const existing = list.users.find((u: any) => (u.email || "").toLowerCase() === email);

    if (existing) {
      // Bila belum dikonfirmasi → langsung konfirmasi. Tidak override password
      // supaya user lama tidak kehilangan akses.
      if (!existing.email_confirmed_at) {
        const { error: upErr } = await admin.auth.admin.updateUserById(existing.id, {
          email_confirm: true,
        });
        if (upErr) return json({ ok: false, error: upErr.message }, 500);
        return json({ ok: true, recovered: true });
      }
      return json({ ok: false, error: "Akun sudah terdaftar. Silakan login." }, 409);
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName || null,
        phone: phoneE164,
        registration_source: mode === "phone" ? "whatsapp" : "email",
      },
    });
    if (createErr) return json({ ok: false, error: createErr.message }, 400);

    // Trigger handle_new_user akan membuat row profiles + user_roles.
    return json({ ok: true, user_id: created.user?.id });
  } catch (e) {
    return json({ ok: false, error: (e as Error)?.message || "server_error" }, 500);
  }
});