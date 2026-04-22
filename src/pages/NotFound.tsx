import { useLocation, useNavigate, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 — rute tidak ditemukan:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[280px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md rounded-3xl border border-border/60 bg-card/70 p-8 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-[0_0_40px_-8px_hsl(var(--primary))]">
          <Wrench className="h-8 w-8 text-primary" strokeWidth={2.2} />
        </div>

        <h1 className="bg-gradient-to-b from-foreground to-foreground/60 bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl">
          404
        </h1>
        <h2 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
          Halaman tidak ditemukan
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Rute <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">{location.pathname}</code> tidak tersedia atau sudah dipindahkan.
        </p>

        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Button>
          <Button asChild className="gap-2">
            <Link to="/">
              <Home className="h-4 w-4" />
              Ke Beranda
            </Link>
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 border-t border-border/60 pt-5 text-xs">
          <Link to="/booking" className="group flex flex-col items-center gap-1 rounded-lg p-2 transition hover:bg-muted/60">
            <Wrench className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <span className="text-muted-foreground group-hover:text-foreground">Pesan Servis</span>
          </Link>
          <Link to="/profile/history-perawatan" className="group flex flex-col items-center gap-1 rounded-lg p-2 transition hover:bg-muted/60">
            <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <span className="text-muted-foreground group-hover:text-foreground">Riwayat</span>
          </Link>
          <Link to="/loyalty" className="group flex flex-col items-center gap-1 rounded-lg p-2 transition hover:bg-muted/60">
            <Home className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <span className="text-muted-foreground group-hover:text-foreground">Loyalti</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
