import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  category: "bug" | "revisi" | "masukan";
  title: string;
  description: string;
  page_url?: string;
  image_data_url?: string | null; // base64 data URL (optional)
  image_mime?: string | null;
  reporter_name?: string;
  reporter_email?: string;
  reporter_phone?: string;
  user_agent?: string;
}

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

function bad(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return bad(405, "Method not allowed");

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return bad(400, "Invalid JSON");
  }

  // Validate
  const category = ["bug", "revisi", "masukan"].includes(body.category) ? body.category : null;
  if (!category) return bad(400, "Kategori tidak valid");
  const title = (body.title || "").trim();
  const description = (body.description || "").trim();
  if (title.length < 5 || title.length > 120) return bad(400, "Judul harus 5-120 karakter");
  if (description.length < 10 || description.length > 2000) return bad(400, "Deskripsi harus 10-2000 karakter");
  const reporter_name = (body.reporter_name || "").trim().slice(0, 120) || null;
  const reporter_email = (body.reporter_email || "").trim().slice(0, 200) || null;
  const reporter_phone = (body.reporter_phone || "").trim().slice(0, 32) || null;
  if (reporter_email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(reporter_email)) {
    return bad(400, "Email tidak valid");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  // Determine source: if Authorization header w/ valid user -> 'customer', else 'guest'
  let reporter_id: string | null = null;
  let source: "customer" | "guest" = "guest";
  let resolvedName = reporter_name;
  let resolvedEmail = reporter_email;

  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
      if (claims?.claims?.sub) {
        reporter_id = claims.claims.sub as string;
        source = "customer";
        resolvedEmail = resolvedEmail || (claims.claims.email as string | undefined) || null;
        // fetch profile name
        const { data: prof } = await admin
          .from("profiles")
          .select("full_name, phone")
          .eq("id", reporter_id)
          .maybeSingle();
        resolvedName = resolvedName || prof?.full_name || null;
      }
    } catch {
      // fall through as guest
    }
  }

  // Guest must supply at least name + (email or phone)
  if (source === "guest") {
    if (!resolvedName) return bad(400, "Nama wajib diisi");
    if (!resolvedEmail && !reporter_phone) return bad(400, "Email atau nomor WA wajib diisi");
  }

  // Rate limit (simple): 5 / hour per ip OR per user
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rlKey = `feedback:${reporter_id || ip}`;
  try {
    const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: existing } = await admin
      .from("rate_limits")
      .select("key, count, window_start")
      .eq("key", rlKey)
      .maybeSingle();
    if (existing && new Date(existing.window_start as string) > new Date(sinceIso)) {
      if ((existing.count as number) >= 5) return bad(429, "Terlalu banyak permintaan. Coba lagi nanti.");
      await admin.from("rate_limits").update({ count: (existing.count as number) + 1, updated_at: new Date().toISOString() }).eq("key", rlKey);
    } else {
      await admin.from("rate_limits").upsert({ key: rlKey, count: 1, window_start: new Date().toISOString(), updated_at: new Date().toISOString() });
    }
  } catch (_) { /* non-fatal */ }

  // Optional image upload
  let image_url: string | null = null;
  if (body.image_data_url && body.image_mime) {
    if (!ALLOWED_MIME.includes(body.image_mime)) return bad(400, "Format gambar tidak didukung");
    try {
      const base64 = body.image_data_url.includes(",")
        ? body.image_data_url.split(",")[1]
        : body.image_data_url;
      const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
      if (bin.byteLength > MAX_IMAGE_BYTES) return bad(400, "Gambar maksimal 5MB");
      const ext = body.image_mime.split("/")[1] || "jpg";
      const folder = reporter_id || "guest";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await admin.storage.from("internal-reports").upload(path, bin, {
        contentType: body.image_mime,
        upsert: false,
      });
      if (upErr) return bad(500, `Upload gambar gagal: ${upErr.message}`);
      const { data: pub } = admin.storage.from("internal-reports").getPublicUrl(path);
      image_url = pub.publicUrl;
    } catch (e) {
      return bad(400, "Gagal memproses gambar");
    }
  }

  const { error } = await admin.from("internal_reports").insert({
    reporter_id,
    reporter_name: resolvedName,
    reporter_role: source === "customer" ? "Customer" : "Guest",
    reporter_email: resolvedEmail,
    reporter_phone,
    category,
    title,
    description,
    page_url: (body.page_url || "").trim().slice(0, 500) || null,
    image_url,
    user_agent: (body.user_agent || req.headers.get("user-agent") || "").slice(0, 500) || null,
    source,
    status: "open",
  });

  if (error) return bad(500, error.message);
  return new Response(JSON.stringify({ ok: true, source }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});