import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, userId, newPassword, email, newEmail, role, assignedBranch, phone, channel } = body;

    // Public action: confirm email for verified users (no auth required)
    if (action === "confirm_email_by_email") {
      if (!email) {
        return new Response(JSON.stringify({ error: "email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit: 5 attempts per 10 min per email
      const { data: rlOk } = await supabaseAdmin.rpc("check_rate_limit", {
        _key: `confirm-email:${email.toLowerCase()}`,
        _max: 5,
        _window_seconds: 600,
      });
      if (rlOk === false) {
        return new Response(
          JSON.stringify({ error: "Terlalu banyak percobaan. Coba lagi nanti." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Find user by email
      const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) throw listError;

      const targetUser = userList.users.find((u: any) => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ success: false, error: "User not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Check if user is admin-verified in profiles
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("is_verified")
        .eq("id", targetUser.id)
        .single();

      if (!profile || !profile.is_verified) {
        return new Response(JSON.stringify({ success: false, error: "User not verified" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Confirm email
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
        email_confirm: true,
      });
      if (confirmError) throw confirmError;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Not authenticated", code: "no_auth_header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Decode JWT payload locally — tolerates revoked refresh sessions as long as the
    // access token itself hasn't expired. Authorization is then enforced by checking
    // the user's role in `user_roles` (server-trusted, RLS-bypassed).
    let callerId: string | null = null;
    try {
      const parts = token.split(".");
      if (parts.length === 3) {
        const padded = parts[1] + "=".repeat((4 - (parts[1].length % 4)) % 4);
        const json = JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
        if (typeof json?.exp === "number" && json.exp * 1000 > Date.now()) {
          callerId = (json.sub as string | undefined) ?? null;
        }
      }
    } catch (_e) {
      callerId = null;
    }
    if (!callerId) {
      return new Response(JSON.stringify({ error: "Not authenticated", code: "session_expired" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const caller = { id: callerId } as { id: string };

    // Check caller has staff or admin role
    const { data: callerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    
    const roles = (callerRoles || []).map((r: any) => r.role);
    const isStaff = roles.includes("staff");
    const isAdmin = roles.includes("admin");
    const isAdminCabang = roles.includes("admin_cabang");
    const canManageCustomer = isStaff || isAdmin || isAdminCabang;

    if (!isStaff && !isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_customer") {
      if (!canManageCustomer) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const fullName = (body.fullName || body.full_name || "").toString().trim();
      const emailIn = (email || "").toString().trim().toLowerCase();
      const phoneIn = (phone || "").toString().trim() || null;
      if (!fullName || !emailIn) {
        return new Response(JSON.stringify({ error: "Nama dan email wajib diisi" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Reuse existing auth user if email already registered
      let targetId: string | null = null;
      const { data: existingList } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const existing = existingList?.users?.find((u: any) => (u.email || "").toLowerCase() === emailIn);
      if (existing) {
        targetId = existing.id;
      } else {
        const tempPassword = crypto.randomUUID().replace(/-/g, "") + "Aa1!";
        const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
          email: emailIn,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { full_name: fullName, phone: phoneIn, created_by_staff: true },
        });
        if (createErr) {
          return new Response(JSON.stringify({ error: createErr.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        targetId = created.user!.id;
      }

      // Upsert profile (trigger may have already created one)
      await supabaseAdmin.from("profiles").upsert({
        id: targetId,
        full_name: fullName,
        phone: phoneIn,
        is_verified: true,
      }, { onConflict: "id" });

      // Ensure customer role exists
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: targetId, role: "customer" },
        { onConflict: "user_id,role" },
      );

      return new Response(JSON.stringify({
        success: true,
        customer: { id: targetId, full_name: fullName, email: emailIn, phone: phoneIn },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list_emails") {
      // Returns map of userId -> email for all auth users (paginated)
      const all: Record<string, string> = {};
      let page = 1;
      const perPage = 1000;
      // Fetch up to 5 pages (5000 users) — sufficient for app scale
      for (let i = 0; i < 5; i++) {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
        if (error) throw error;
        const users = (data?.users || []) as any[];
        for (const u of users) {
          if (u?.id && u?.email) all[u.id] = u.email;
        }
        if (users.length < perPage) break;
        page++;
      }
      return new Response(JSON.stringify({ success: true, emails: all }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "set_role") {
      if (!isStaff) {
        return new Response(JSON.stringify({ error: "Unauthorized: only staff can change roles" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!userId || !role) {
        return new Response(JSON.stringify({ error: "userId and role required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (userId === caller.id && role !== "staff") {
        return new Response(JSON.stringify({ error: "Tidak bisa menurunkan role akun sendiri" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allowedRoles = ["customer", "admin_cabang", "admin", "staff"];
      if (!allowedRoles.includes(role)) {
        return new Response(JSON.stringify({ error: "Role tidak valid" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (role === "admin_cabang" && !assignedBranch) {
        return new Response(JSON.stringify({ error: "Cabang wajib dipilih untuk Admin Cabang" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: deleteRolesError } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", userId);
      if (deleteRolesError) throw deleteRolesError;

      const { error: insertRoleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: userId, role });
      if (insertRoleError) throw insertRoleError;

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ assigned_branch: role === "admin_cabang" ? assignedBranch : null })
        .eq("id", userId);
      if (profileError) throw profileError;

      // Audit log
      await callerClient.rpc("log_admin_audit", {
        _action: "user.role_change",
        _target_type: "user",
        _target_id: userId,
        _target_label: null,
        _before: null,
        _after: { role, assigned_branch: assignedBranch ?? null },
        _metadata: {},
      });

      return new Response(JSON.stringify({ success: true, role, assignedBranch: role === "admin_cabang" ? assignedBranch : null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "reset_password") {
      if (!userId || !newPassword || newPassword.length < 8) {
        return new Response(JSON.stringify({ error: "Password minimal 8 karakter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) {
        const msg = (error.message || "").toLowerCase();
        if (msg.includes("weak") || msg.includes("pwned") || msg.includes("known")) {
          return new Response(JSON.stringify({ error: "Password terlalu lemah atau pernah bocor. Gunakan kombinasi huruf besar, angka, dan simbol (min. 8 karakter)." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await callerClient.rpc("log_admin_audit", {
        _action: "user.password_reset",
        _target_type: "user",
        _target_id: userId,
        _target_label: null,
        _before: null,
        _after: null,
        _metadata: {},
      });
      return new Response(JSON.stringify({ success: true, message: "Password berhasil diubah" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_user") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (userId === caller.id) {
        return new Response(JSON.stringify({ error: "Tidak bisa menghapus akun sendiri" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // capture before snapshot
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles").select("full_name,phone").eq("id", userId).maybeSingle();
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (error) throw error;
      await callerClient.rpc("log_admin_audit", {
        _action: "user.delete",
        _target_type: "user",
        _target_id: userId,
        _target_label: (targetProfile as any)?.full_name ?? null,
        _before: targetProfile ?? null,
        _after: null,
        _metadata: {},
      });
      return new Response(JSON.stringify({ success: true, message: "User berhasil dihapus" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "confirm_email") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ success: true, message: "Email confirmed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_user") {
      if (!userId) {
        return new Response(JSON.stringify({ error: "userId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // First confirm auth email
      const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      });
      if (confirmError) throw confirmError;

      // Then set is_verified and create notifications
      const { data, error: verifyError } = await callerClient.rpc("verify_user", { _user_id: userId });
      if (verifyError) throw verifyError;

      await callerClient.rpc("log_admin_audit", {
        _action: "user.verify",
        _target_type: "user",
        _target_id: userId,
        _target_label: null,
        _before: { is_verified: false },
        _after: { is_verified: true },
        _metadata: {},
      });

      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Update customer email (staff/admin/admin_cabang) ----
    if (action === "update_email") {
      if (!canManageCustomer) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!userId || !newEmail) {
        return new Response(JSON.stringify({ error: "userId and newEmail required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const cleanEmail = String(newEmail).trim().toLowerCase();
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
      if (!emailRe.test(cleanEmail) || cleanEmail.length > 255) {
        return new Response(JSON.stringify({ error: "Format email tidak valid" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Uniqueness check via admin listUsers (paginated up to 1k — sufficient for this app scale)
      const { data: existing, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) throw listErr;
      const conflict = existing.users.find((u: any) => u.email?.toLowerCase() === cleanEmail && u.id !== userId);
      if (conflict) {
        return new Response(JSON.stringify({ error: "Email sudah digunakan akun lain" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: cleanEmail,
        email_confirm: true,
      });
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await callerClient.rpc("log_admin_audit", {
        _action: "user.email_change",
        _target_type: "user",
        _target_id: userId,
        _target_label: cleanEmail,
        _before: null,
        _after: { email: cleanEmail },
        _metadata: {},
      });
      return new Response(JSON.stringify({ success: true, email: cleanEmail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Verify customer phone via WhatsApp (Fonnte) ----
    if (action === "verify_phone_wa") {
      if (!canManageCustomer) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!userId || !phone) {
        return new Response(JSON.stringify({ error: "userId and phone required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN");
      if (!FONNTE_TOKEN) {
        return new Response(JSON.stringify({ error: "FONNTE_TOKEN belum dikonfigurasi" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Normalize phone — must be 628xxxxxxxx, 11–15 digits, not dummy
      const normalize = (raw: string): string | null => {
        let p = String(raw).replace(/\D/g, "");
        if (p.startsWith("0")) p = "62" + p.slice(1);
        if (p.startsWith("8")) p = "62" + p;
        if (!p.startsWith("628")) return null;
        if (p.length < 11 || p.length > 15) return null;
        const tail = p.slice(2);
        if (/^(\d)\1+$/.test(tail)) return null;
        if (tail.startsWith("000") || tail.startsWith("8000000")) return null;
        return p;
      };
      const normalized = normalize(phone);
      if (!normalized) {
        return new Response(JSON.stringify({ error: "Nomor WhatsApp tidak valid (harus format 08xx / 628xx)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Uniqueness — reject if another verified profile already owns this phone
      const { data: dupes } = await supabaseAdmin
        .from("profiles")
        .select("id, phone_verified")
        .eq("phone", normalized)
        .neq("id", userId);
      if ((dupes || []).some((d: any) => d.phone_verified)) {
        return new Response(JSON.stringify({ error: "Nomor sudah dipakai akun terverifikasi lain" }), {
          status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Save normalized phone first (so later steps see canonical form)
      await supabaseAdmin.from("profiles")
        .update({ phone: normalized })
        .eq("id", userId);

      // Send Fonnte verification message
      const message = "Halo, nomor WhatsApp ini telah diverifikasi sebagai kontak resmi akun Sahabat Stroban Service Anda.\n\nAbaikan pesan ini jika bukan Anda yang melakukan verifikasi.";
      const fd = new FormData();
      fd.append("target", normalized);
      fd.append("message", message);
      fd.append("countryCode", "62");
      let waOk = false;
      let waReason = "";
      try {
        const res = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { Authorization: FONNTE_TOKEN },
          body: fd,
        });
        const j = await res.json().catch(() => ({}));
        if (res.ok && (j.status === true || j.status === "true")) {
          waOk = true;
        } else {
          waReason = String(j?.reason || j?.message || "Fonnte gagal").slice(0, 200);
        }
      } catch (e: any) {
        waReason = e?.message || "Network error";
      }
      if (!waOk) {
        return new Response(JSON.stringify({ success: false, error: `WA gagal terkirim: ${waReason}` }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Mark verified
      await supabaseAdmin.from("profiles")
        .update({ phone_verified: true, phone_verified_at: new Date().toISOString() })
        .eq("id", userId);
      await callerClient.rpc("log_admin_audit", {
        _action: "user.phone_verified",
        _target_type: "user",
        _target_id: userId,
        _target_label: normalized,
        _before: null,
        _after: { phone: normalized, phone_verified: true },
        _metadata: { provider: "fonnte" },
      });
      return new Response(JSON.stringify({ success: true, phone: normalized }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Trigger password reset OTP (WA) or magic link (email) on behalf of user ----
    if (action === "trigger_password_reset_otp") {
      if (!canManageCustomer) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!userId || !channel || (channel !== "whatsapp" && channel !== "email")) {
        return new Response(JSON.stringify({ error: "userId dan channel (whatsapp|email) wajib" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Load target user (auth + profile)
      const { data: targetAuth, error: getErr } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (getErr || !targetAuth?.user) {
        return new Response(JSON.stringify({ error: "User tidak ditemukan" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const targetEmail = (targetAuth.user.email || "").toLowerCase();
      const isPhoneEmail = targetEmail.endsWith("@phone.local");

      if (channel === "email") {
        if (!targetEmail || isPhoneEmail) {
          return new Response(JSON.stringify({ error: "User tidak punya email valid. Gunakan kanal WhatsApp." }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const siteUrl = req.headers.get("origin") || Deno.env.get("SUPABASE_URL") || "";
        const { error: resetErr } = await supabaseAdmin.auth.resetPasswordForEmail(targetEmail, {
          redirectTo: `${siteUrl}/reset-password`,
        });
        if (resetErr) {
          return new Response(JSON.stringify({ error: "Gagal mengirim email reset: " + resetErr.message }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        await callerClient.rpc("log_admin_audit", {
          _action: "user.password_reset_otp_sent",
          _target_type: "user",
          _target_id: userId,
          _target_label: targetEmail,
          _before: null,
          _after: null,
          _metadata: { channel: "email", triggered_by: caller.id },
        });
        const masked = targetEmail.replace(/^(.{2}).*(@.*)$/, "$1***$2");
        return new Response(JSON.stringify({ success: true, channel: "email", masked }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // channel === "whatsapp"
      const { data: targetProfile } = await supabaseAdmin
        .from("profiles").select("phone").eq("id", userId).maybeSingle();
      const rawPhone: string =
        (targetProfile as any)?.phone ||
        (isPhoneEmail ? targetEmail.split("@")[0] : "");
      const normalizePhone = (raw: string): string | null => {
        let p = String(raw || "").replace(/\D/g, "");
        if (!p) return null;
        if (p.startsWith("0")) p = "62" + p.slice(1);
        else if (p.startsWith("8")) p = "62" + p;
        if (!p.startsWith("62")) return null;
        if (p.length < 10 || p.length > 15) return null;
        return p;
      };
      const phoneE164 = normalizePhone(rawPhone);
      if (!phoneE164) {
        return new Response(JSON.stringify({ error: "User tidak punya nomor WhatsApp valid. Gunakan kanal Email." }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const FONNTE_TOKEN = Deno.env.get("FONNTE_TOKEN");
      if (!FONNTE_TOKEN) {
        return new Response(JSON.stringify({ error: "FONNTE_TOKEN belum dikonfigurasi" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate OTP + salt; store hashed in wa_password_resets
      const sha256Hex = async (input: string) => {
        const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
        return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
      };
      const randomDigits = (n: number) => {
        const arr = new Uint32Array(n);
        crypto.getRandomValues(arr);
        return Array.from(arr).map((v) => (v % 10).toString()).join("");
      };
      const randomToken = () => {
        const arr = new Uint8Array(16);
        crypto.getRandomValues(arr);
        return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
      };

      const otp = randomDigits(6);
      const salt = randomToken();
      const otpHash = await sha256Hex(otp + ":" + salt);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "admin-trigger";
      const ipHash = await sha256Hex(ip + (Deno.env.get("SUPABASE_URL") || ""));

      const { error: insErr } = await supabaseAdmin.from("wa_password_resets").insert({
        user_id: userId,
        phone_e164: phoneE164,
        otp_hash: otpHash,
        otp_salt: salt,
        ip_hash: ipHash,
        expires_at: expiresAt,
        triggered_by_admin: caller.id,
      });
      if (insErr) {
        return new Response(JSON.stringify({ error: "Gagal menyimpan OTP: " + insErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const message =
        `Permintaan reset password akun Sahabat Stroban Service Anda.\n\n` +
        `Kode OTP: *${otp}* (berlaku 10 menit).\n\n` +
        `Buka link berikut untuk reset password:\n` +
        `https://www.bengkelstroban.com/reset-password-wa?phone=${phoneE164}\n\n` +
        `JANGAN bagikan kode ini ke siapa pun, termasuk admin kami.`;
      const fd = new FormData();
      fd.append("target", phoneE164);
      fd.append("message", message);
      fd.append("countryCode", "62");
      try {
        const r = await fetch("https://api.fonnte.com/send", {
          method: "POST",
          headers: { Authorization: FONNTE_TOKEN },
          body: fd,
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || !(j.status === true || j.status === "true")) {
          return new Response(JSON.stringify({ error: "Gagal mengirim WA: " + (j?.reason || j?.message || "unknown") }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e: any) {
        return new Response(JSON.stringify({ error: "Network error WA: " + (e?.message || String(e)) }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await callerClient.rpc("log_admin_audit", {
        _action: "user.password_reset_otp_sent",
        _target_type: "user",
        _target_id: userId,
        _target_label: phoneE164,
        _before: null,
        _after: null,
        _metadata: { channel: "whatsapp", triggered_by: caller.id },
      });

      const masked = phoneE164.length >= 6
        ? phoneE164.slice(0, 4) + "***" + phoneE164.slice(-3)
        : phoneE164;
      return new Response(JSON.stringify({ success: true, channel: "whatsapp", masked }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
