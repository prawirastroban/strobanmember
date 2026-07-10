import { supabase } from "@/integrations/supabase/client";

type AdminUserOpsBody = Record<string, unknown> & { action: string };

const ADMIN_USER_OPS_TIMEOUT_MS = 25_000;

async function parseResponse(res: Response) {
  const text = await res.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 300) };
  }
}

function normalizeError(error: unknown, fallback = "Request gagal") {
  const message = error instanceof Error ? error.message : String(error || fallback);
  if (message === "Failed to fetch" || message.includes("Load failed") || message.includes("NetworkError")) {
    return "Koneksi ke backend gagal. Silakan coba lagi; jika masih gagal, refresh halaman dan login ulang.";
  }
  if (message.includes("aborted") || message.includes("AbortError")) {
    return "Request backend terlalu lama. Silakan coba lagi.";
  }
  return message || fallback;
}

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

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), ADMIN_USER_OPS_TIMEOUT_MS);

  try {
    const res = await fetch(`${url}/functions/v1/admin-user-ops`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
        apikey: anonKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const data = await parseResponse(res);
    if (!res.ok || data?.error || data?.success === false) {
      throw new Error(data?.error || data?.message || `Request gagal (${res.status})`);
    }

    return data as T;
  } catch (directError) {
    // Fallback through the official client invoke path. This protects admin
    // flows from browser/network differences around preflight handling while
    // preserving the same in-function JWT verification.
    try {
      const { data, error } = await supabase.functions.invoke("admin-user-ops", {
        body,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (error || (data as any)?.error || (data as any)?.success === false) {
        throw new Error((data as any)?.error || (data as any)?.message || error?.message || "Request gagal");
      }
      return data as T;
    } catch (fallbackError) {
      throw new Error(normalizeError(fallbackError, normalizeError(directError)));
    }
  } finally {
    window.clearTimeout(timeout);
  }
}