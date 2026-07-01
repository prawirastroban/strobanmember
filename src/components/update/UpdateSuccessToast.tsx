import { useEffect } from "react";
import { toast } from "sonner";
import { UPDATE_MARKER_KEY } from "@/services/updateProcess";

/**
 * Fires a one-shot success toast when the app loads after a successful
 * smart update. Reads a marker written just before reload; clears it so
 * the toast only shows once.
 */
export const UpdateSuccessToast = () => {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(UPDATE_MARKER_KEY);
      if (!raw) return;
      localStorage.removeItem(UPDATE_MARKER_KEY);
      // eslint-disable-next-line no-console
      console.debug("[UpdateProcess] reload_completed", raw);
      toast.success("Aplikasi berhasil diperbarui", { duration: 3000 });
    } catch { /* noop */ }
  }, []);
  return null;
};

export default UpdateSuccessToast;