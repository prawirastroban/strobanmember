import { supabase } from "@/integrations/supabase/client";

type AdminUserOpsBody = Record<string, unknown> & { action: string };

export async function invokeAdminUserOps<T = any>(body: AdminUserOpsBody): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;

  if (!accessToken) {
    throw new Error("Sesi habis. Silakan login ulang.");
  }

  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  if (!url || !anonKey) {
    throw new Error("Konfigurasi backend belum tersedia.");
  }

  const res = await fetch(`${url}/functions/v1/admin-user-ops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error || data?.success === false) {
    throw new Error(data?.error || data?.message || `Request gagal (${res.status})`);
  }

  return data as T;
}