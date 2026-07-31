// Pemicu analisis kesehatan AI (best-effort, sekali per SPK).
import { supabase } from "@/integrations/supabase/client";

const inFlight = new Set<string>();

/** Jalankan analisis AI bila SPK belum punya laporan. Tidak pernah melempar. */
export async function ensureHealthAnalysis(spkId: string): Promise<void> {
  if (!spkId || inFlight.has(spkId)) return;
  inFlight.add(spkId);
  try {
    const { data } = await supabase
      .from("spk_orders")
      .select("ai_health_report")
      .eq("id", spkId)
      .maybeSingle();
    if (data && (data as any).ai_health_report) return;
    await supabase.functions.invoke("spk-health-analysis", { body: { spk_id: spkId } });
  } catch {
    /* best-effort */
  } finally {
    inFlight.delete(spkId);
  }
}
