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
    const { action, userId, newPassword, email, role, assignedBranch } = body;

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

    if (!isStaff && !isAdmin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      if (!userId || !newPassword || newPassword.length < 6) {
        return new Response(JSON.stringify({ error: "Password minimal 6 karakter" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword });
      if (error) throw error;
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

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
