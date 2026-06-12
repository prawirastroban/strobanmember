import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SECRET = Deno.env.get("TURNSTILE_SECRET_KEY") ?? "";

// Domain di mana captcha boleh di-bypass (preview/dev) karena sitekey
// production tidak whitelist domain ini, sehingga widget tidak pernah
// menghasilkan token dan user terkunci.
function isDevOrigin(originOrReferer: string): boolean {
  if (!originOrReferer) return false;
  try {
    const u = new URL(originOrReferer);
    const h = u.hostname.toLowerCase();
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h.endsWith(".lovableproject.com") ||
      h.endsWith(".lovable.app") ||
      h.endsWith(".lovable.dev")
    );
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { token } = await req.json().catch(() => ({ token: "" }));
    const origin = req.headers.get("origin") ?? req.headers.get("referer") ?? "";
    const devBypass = isDevOrigin(origin);

    // Bypass: token sengaja "unavailable" (widget gagal render) atau request
    // berasal dari domain dev/preview. Production tetap wajib captcha.
    if (devBypass || token === "unavailable") {
      return new Response(
        JSON.stringify({ success: true, bypass: true, reason: devBypass ? "dev_origin" : "unavailable" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ success: false, error: "missing_token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!SECRET) {
      return new Response(JSON.stringify({ success: false, error: "secret_not_configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ip = req.headers.get("CF-Connecting-IP") ?? req.headers.get("x-forwarded-for") ?? "";
    const form = new FormData();
    form.append("secret", SECRET);
    form.append("response", token);
    if (ip) form.append("remoteip", ip.split(",")[0].trim());

    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const data = await resp.json();
    return new Response(
      JSON.stringify({ success: !!data.success, errors: data["error-codes"] ?? [] }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});