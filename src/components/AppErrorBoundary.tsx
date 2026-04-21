import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[AppErrorBoundary] Application crashed", error, errorInfo);
  }

  handleReload = () => {
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