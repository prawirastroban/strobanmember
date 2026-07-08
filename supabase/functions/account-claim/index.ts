import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");
    const token = String(body?.token || "").trim();

    if (!token || token.length < 16) {
      return json({ error: "Token tidak valid" }, 400);
    }

    // Rate limit by token
    const { data: rlOk } = await admin.rpc("check_rate_limit", {
      _key: `account-claim:${token}`,
      _max: 20,
      _window_seconds: 600,
    });
    if (rlOk === false) {
      return json({ error: "Terlalu banyak percobaan. Coba lagi nanti." }, 429);
    }

    const { data: claim, error: claimErr } = await admin
      .from("account_claim_tokens")
      .select("token, user_id, booking_id, booking_public_token, expires_at, used_at")
      .eq("token", token)
      .maybeSingle();

    if (claimErr || !claim) {
      return json({ error: "Link tidak ditemukan atau sudah kedaluwarsa." }, 404);
    }
    if (claim.used_at) {
      return json({ error: "Link sudah pernah digunakan. Silakan login lewat WhatsApp atau email Anda." }, 410);
    }
    if (new Date(claim.expires_at).getTime() < Date.now()) {
      return json({ error: "Link sudah kedaluwarsa. Hubungi admin untuk mendapatkan link baru." }, 410);
    }

    // Fetch user info
    const { data: userResp, error: userErr } = await admin.auth.admin.getUserById(claim.user_id);
    if (userErr || !userResp?.user) {
      return json({ error: "Akun tidak ditemukan." }, 404);
    }
    const user = userResp.user;
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", claim.user_id)
      .maybeSingle();

    if (action === "validate") {
      return json({
        success: true,
        full_name: profile?.full_name || user.user_metadata?.full_name || "Pelanggan",
        email: user.email,
        booking_public_token: claim.booking_public_token,
        booking_id: claim.booking_id,
      });
    }

    if (action === "claim") {
      const password = String(body?.password || "");
      if (password.length < 8) {
        return json({ error: "Kata sandi minimal 8 karakter." }, 400);
      }

      const { error: updErr } = await admin.auth.admin.updateUserById(claim.user_id, {
        password,
        email_confirm: true,
      });
      if (updErr) {
        return json({ error: updErr.message }, 400);
      }

      // Mark token used (single-use)
      await admin
        .from("account_claim_tokens")
        .update({ used_at: new Date().toISOString() })
        .eq("token", token);

      // Ensure verified profile
      await admin
        .from("profiles")
        .update({ is_verified: true })
        .eq("id", claim.user_id);

      return json({
        success: true,
        email: user.email,
        booking_public_token: claim.booking_public_token,
        booking_id: claim.booking_id,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message || "Internal error" }, 500);
  }
});