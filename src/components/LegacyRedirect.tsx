import { useEffect, useRef } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";

interface LegacyRedirectProps {
  to: string;
  /** Tampilkan toast "Halaman telah diperbarui ke versi terbaru" (default: true). */
  notify?: boolean;
  /** Override pesan toast. */
  message?: string;
}

/**
 * Wrapper untuk halaman lama (DEPRECATED/REDIRECTED).
 * - Memberi tahu user lewat toast bahwa halaman telah dipindah.
 * - Mengarahkan otomatis ke versi terbaru via <Navigate replace />.
 * - Aman bagi user yang membuka bookmark/history lama: tanpa blank page, tanpa 404.
 */
const LegacyRedirect = ({
  to,
  notify = true,
  message = "Halaman telah diperbarui ke versi terbaru.",
}: LegacyRedirectProps) => {
  const firedRef = useRef(false);

  useEffect(() => {
    if (!notify || firedRef.current) return;
    firedRef.current = true;
    try {
      toast(message, { duration: 3500 });
    } catch {
      /* sonner not mounted yet — silent */
    }
  }, [notify, message]);

  return <Navigate to={to} replace />;
};

export default LegacyRedirect;