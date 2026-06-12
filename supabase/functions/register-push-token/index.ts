import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RegisterTokenSchema = z.object({
  token: z.string().min(5, "Token too short").max(4096, "Token too long"),
  platform: z.enum(["ios", "android", "web"]),
  role: z.string().min(1).max(50).nullable().optional(),
  device_type: z.string().min(1).max(50).nullable().optional(),
  last_active: z.string().datetime().optional(),
  // When set, the client reports a registration FAILURE (e.g. getToken threw).
  // We log it to push_delivery_logs and skip writing to push_tokens.
  fail_reason: z.string().max(500).nullable().optional(),
});

const DeleteTokenSchema = z.object({
  token: z.string().min(10, "Token too short").max(500, "Token too long"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limit: 10 / hour per user
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: rlOk } = await adminClient.rpc("check_rate_limit", {
      _key: `push-token:${user.id}`,
      _max: 10,
      _window_seconds: 3600,
    });
    if (rlOk === false) {
      return new Response(
        JSON.stringify({ error: "Too many push token registrations" }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "POST") {
      const body = await req.json();
      const parseResult = RegisterTokenSchema.safeParse(body);
      if (!parseResult.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request", details: parseResult.error.flatten().fieldErrors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { token, platform, role, device_type, last_active } = parseResult.data;
      const failReason = parseResult.data.fail_reason ?? null;

      // Fail-only sync: log device_sync_failed and return without storing the bogus token.
      if (failReason) {
        await adminClient.from("push_delivery_logs").insert({
          user_id: user.id,
          platform,
          event_type: "device_sync_failed",
          detail: { reason: failReason, device_type: device_type ?? null },
        });
        return new Response(
          JSON.stringify({ success: false, logged: true, reason: failReason }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: roleRows } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .limit(1);
      const resolvedRole = roleRows?.[0]?.role ?? role ?? null;

      const { data, error } = await supabase
        .from("push_tokens")
        .upsert(
          {
            user_id: user.id,
            token,
            platform,
            role: resolvedRole,
            device_type: device_type ?? null,
            last_active: last_active ?? new Date().toISOString(),
            invalidated_at: null,
            invalid_reason: null,
          },
          { onConflict: "token" }
        )
        .select()
        .single();

      if (error) {
        console.error("Error storing token:", error);
        await adminClient.from("push_delivery_logs").insert({
          user_id: user.id,
          token,
          platform,
          event_type: "device_sync_failed",
          detail: { reason: error.message, stage: "upsert" },
        });
        return new Response(
          JSON.stringify({ error: "Failed to store token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient.from("push_delivery_logs").insert({
        user_id: user.id,
        token,
        platform,
        event_type: "device_sync",
        detail: {
          role: resolvedRole,
          device_type: device_type ?? null,
          last_active: last_active ?? null,
        },
      });

      return new Response(
        JSON.stringify({ success: true, data }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (req.method === "DELETE") {
      const body = await req.json();
      const parseResult = DeleteTokenSchema.safeParse(body);
      if (!parseResult.success) {
        return new Response(
          JSON.stringify({ error: "Invalid request", details: parseResult.error.flatten().fieldErrors }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { token } = parseResult.data;

      const { error } = await supabase
        .from("push_tokens")
        .delete()
        .eq("token", token)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error deleting token:", error);
        return new Response(
          JSON.stringify({ error: "Failed to delete token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
