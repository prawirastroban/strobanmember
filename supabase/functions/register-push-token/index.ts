import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const RegisterTokenSchema = z.object({
  token: z.string().min(10, "Token too short").max(500, "Token too long"),
  platform: z.enum(["ios", "android", "web"]),
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

      const { token, platform } = parseResult.data;

      const { data, error } = await supabase
        .from("push_tokens")
        .upsert(
          { user_id: user.id, token, platform },
          { onConflict: "token" }
        )
        .select()
        .single();

      if (error) {
        console.error("Error storing token:", error);
        return new Response(
          JSON.stringify({ error: "Failed to store token" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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
