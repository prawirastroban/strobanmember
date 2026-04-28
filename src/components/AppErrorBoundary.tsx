import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const RECOVERY_FLAG = "__app_error_recovered";

class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AppErrorBoundary] Application crashed", error, errorInfo);
    // Auto-recover ONCE per session: clear stale caches/SW that often cause a
    // blank screen on revisit, then reload. If we already tried, fall through
    // and show the manual reload UI so the user is never stuck on white.
    try {
      if (!sessionStorage.getItem(RECOVERY_FLAG)) {
        sessionStorage.setItem(RECOVERY_FLAG, "1");
        const cleanup = async () => {
          try {
            if ("serviceWorker" in navigator) {
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
            }
            if ("caches" in window) {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k).catch(() => false)));
            }
          } catch {/* ignore */}
          window.location.reload();
        };
        // Don't await — schedule and let render() show fallback meanwhile.
        void cleanup();
      }
    } catch {/* ignore */}
  }

  handleReload = () => {
    try { sessionStorage.removeItem(RECOVERY_FLAG); } catch {/* ignore */}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 text-center shadow-lg">
            <h1 className="text-lg font-semibold">Aplikasi sedang dimuat ulang</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Terjadi gangguan sementara. Tekan tombol di bawah untuk memuat ulang dengan aman.
            </p>
            <Button onClick={this.handleReload} className="mt-5 h-12 w-full rounded-xl text-base font-semibold">
              Muat Ulang
            </Button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;