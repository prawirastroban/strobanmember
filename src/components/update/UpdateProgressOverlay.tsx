import { ArrowUpCircle, Loader2 } from "lucide-react";

/**
 * Phase 4 — Full-screen loading overlay shown while the smart update
 * flow runs. Not dismissible. No fake progress.
 */
export const UpdateProgressOverlay = ({ open }: { open: boolean }) => {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md"
      role="alertdialog"
      aria-live="assertive"
      aria-modal="true"
    >
      <div className="mx-6 w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-950/90 p-6 text-center shadow-2xl">
        <div
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full"
          style={{ background: "rgba(255,43,43,0.15)", color: "#ff2b2b" }}
        >
          <ArrowUpCircle className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="mt-4 text-base font-semibold text-white">
          Memperbarui Aplikasi
        </h2>
        <p className="mt-1 text-sm text-neutral-300">
          Sedang mengunduh versi terbaru...
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Mohon jangan menutup aplikasi.
        </p>
        <div className="mt-4 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "#ff2b2b" }} aria-hidden />
        </div>
      </div>
    </div>
  );
};

export default UpdateProgressOverlay;