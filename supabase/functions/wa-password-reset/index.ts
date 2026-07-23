import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const FONNTE_URL = "https://api.fonnte.com/send";
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const TOKEN_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAX_ATTEMPTS = 5;
const MAX_REQUESTS_PER_PHONE_15M = 3;

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
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomDigits(n: number): string {
  const arr = new Uint32Array(n);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((v) => (v % 10).toString()).join("");
}

function randomToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sendWa(phone: string, message: string): Promise<{ ok: boolean; status?: number; error?: string }> {
  const token = Deno.env.get("FONNTE_TOKEN");
  if (!token) return { ok: false, error: "no_token" };
  const fd = new FormData();
  fd.append("target", phone);
  fd.append("message", message);
  fd.append("countryCode", "62");
  try {
    const res = await fetch(FONNTE_URL, { method: "POST", headers: { Authorization: token }, body: fd });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: (e as Error)?.message || String(e) };
  }
}

function maskPhone(p: string): string {
  if (p.length < 6) return p;
  return p.slice(0, 4) + "***" + p.slice(-3);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  let body: any;
  try { body = await req.json(); } catch { body = {}; }
  const action = String(body?.action || "");

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const ipHash = await sha256Hex(ip + (Deno.env.get("SUPABASE_URL") || ""));

  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    // ---------- REQUEST OTP ----------
    if (action === "request") {
      const phone = normalizePhone(String(body?.phone || ""));
      if (!phone) return json({ error: "Nomor WhatsApp tidak valid" }, 400);

      // Rate limit per phone
      const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from("wa_password_resets")
        .select("id", { count: "exact", head: true })
        .eq("phone_e164", phone)
        .gte("requested_at", since);
      if ((count ?? 0) >= MAX_REQUESTS_PER_PHONE_15M) {
        return json({ ok: true, masked: maskPhone(phone) }); // generic success
      }

      // Look up user by phone-derived email. Support both the new valid-format
      // domain (`phone.bengkelstroban.com`) and the legacy `.local` domain so
      // accounts created before the email migration still work.
      const newEmail = `${phone}@phone.bengkelstroban.com`;
      const legacyEmail = `${phone}@phone.local`;
      const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const user = list?.users?.find((u: any) => {
        const e = (u.email || "").toLowerCase();
        return e === newEmail || e === legacyEmail;
      });

      // Always respond generically; only send WA if user exists
      if (!user) {
        return json({ ok: true, masked: maskPhone(phone) });
      }

      const otp = randomDigits(6);
      const salt = randomToken().slice(0, 16);
      const otpHash = await sha256Hex(otp + ":" + salt);
      const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

      await supabase.from("wa_password_resets").insert({
        user_id: user.id,
        phone_e164: phone,
        otp_hash: otpHash,
        otp_salt: salt,
        ip_hash: ipHash,
        expires_at: expiresAt,
      });

      const message =
        `Kode reset password Bengkel Mobil Stroban Service Anda: *${otp}*\n` +
        `Berlaku 10 menit. JANGAN bagikan kode ini ke siapa pun, termasuk admin kami.`;
      await sendWa(phone, message);

      return json({ ok: true, masked: maskPhone(phone) });
    }

    // ---------- VERIFY OTP ----------
    if (action === "verify") {
      const phone = normalizePhone(String(body?.phone || ""));
      const otp = String(body?.otp || "").replace(/\D/g, "");
      if (!phone || otp.length !== 6) return json({ error: "Input tidak valid" }, 400);

      const { data: row } = await supabase
        .from("wa_password_resets")
        .select("*")
        .eq("phone_e164", phone)
        .eq("status", "pending")
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!row) return json({ error: "OTP tidak ditemukan atau sudah kedaluwarsa" }, 400);
      if (new Date(row.expires_at).getTime() < Date.now()) {
        await supabase.from("wa_password_resets").update({ status: "expired" }).eq("id", row.id);
        return json({ error: "OTP sudah kedaluwarsa. Minta kode baru." }, 400);
      }
      if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
        await supabase.from("wa_password_resets").update({ status: "expired" }).eq("id", row.id);
        return json({ error: "Terlalu banyak percobaan. Minta kode baru." }, 429);
      }

      const candidate = await sha256Hex(otp + ":" + row.otp_salt);
      if (candidate !== row.otp_hash) {
        await supabase
          .from("wa_password_resets")
          .update({ attempts: (row.attempts ?? 0) + 1 })
          .eq("id", row.id);
        return json({ error: "Kode OTP salah" }, 400);
      }

      const resetToken = randomToken();
      const resetTokenHash = await sha256Hex(resetToken);
      const tokenExpires = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

      await supabase
        .from("wa_password_resets")
        .update({
          status: "verified",
          verified_at: new Date().toISOString(),
          reset_token_hash: resetTokenHash,
          expires_at: tokenExpires,
        })
        .eq("id", row.id);

      return json({ ok: true, reset_token: resetToken });
    }

    // ---------- CONFIRM (set new password) ----------
    if (action === "confirm") {
      const phone = normalizePhone(String(body?.phone || ""));
      const resetToken = String(body?.reset_token || "");
      const newPassword = String(body?.new_password || "");
      if (!phone || !resetToken) return json({ error: "Token tidak valid" }, 400);
      if (newPassword.length < 8) {
        return json({ error: "Password terlalu pendek. Gunakan minimal 8 karakter." }, 400);
      }
      if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return json({ error: "Password harus mengandung huruf dan angka." }, 400);
      }
      const WEAK = new Set([
        "password","password1","password123","12345678","123456789","1234567890",
        "qwerty123","qwertyui","qwerty1234","abcdefg1","abc12345","admin123",
        "admin1234","11111111","00000000","test1234","test12345","welcome1",
        "iloveyou","letmein1","football1","monkey123","stroban123","bengkel123",
      ]);
      if (WEAK.has(newPassword.toLowerCase())) {
        return json({ error: "Password ini terlalu umum dan mudah ditebak. Gunakan kombinasi yang unik (huruf besar/kecil, angka, simbol)." }, 400);
      }

      const tokenHash = await sha256Hex(resetToken);
      const { data: row } = await supabase
        .from("wa_password_resets")
        .select("*")
        .eq("phone_e164", phone)
        .eq("status", "verified")
        .eq("reset_token_hash", tokenHash)
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!row || !row.user_id) return json({ error: "Token tidak valid" }, 400);
      if (new Date(row.expires_at).getTime() < Date.now()) {
        await supabase.from("wa_password_resets").update({ status: "expired" }).eq("id", row.id);
        return json({ error: "Token kedaluwarsa. Mulai ulang reset password." }, 400);
      }

      const { error: updErr } = await supabase.auth.admin.updateUserById(row.user_id, {
        password: newPassword,
      });
      if (updErr) {
        const msg = (updErr.message || "").toLowerCase();
        let friendly = "Password belum memenuhi kriteria keamanan. Coba kombinasi yang lebih kuat (huruf besar/kecil, angka, dan simbol).";
        if (msg.includes("pwned") || msg.includes("leaked") || msg.includes("compromised") || msg.includes("breach")) {
          friendly = "Password ini pernah bocor di internet. Demi keamanan akun, gunakan password lain yang unik.";
        } else if (msg.includes("weak") || msg.includes("strength")) {
          friendly = "Password terlalu lemah. Tambahkan huruf besar, angka, dan simbol.";
        } else if (msg.includes("at least") || msg.includes("length") || msg.includes("short")) {
          friendly = "Password terlalu pendek. Gunakan minimal 8 karakter.";
        } else if (msg.includes("same") && msg.includes("old")) {
          friendly = "Password baru tidak boleh sama dengan password lama.";
        }
        return json({ error: friendly }, 400);
      }

      await supabase
        .from("wa_password_resets")
        .update({ status: "consumed", consumed_at: new Date().toISOString(), reset_token_hash: null })
        .eq("id", row.id);

      // Optional WA confirmation
      await sendWa(
        phone,
        "Password akun Bengkel Mobil Stroban Service Anda berhasil diperbarui. Jika bukan Anda yang melakukan, segera hubungi admin: wa.me/628973700800",
      );

      return json({ ok: true });
    }

    return json({ error: "Action tidak dikenal" }, 400);
  } catch (e) {
    return json({ error: (e as Error)?.message || "Server error" }, 500);
  }
});