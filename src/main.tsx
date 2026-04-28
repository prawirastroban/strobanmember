import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import "./index.css";

// Mount React as early and as safely as possible. We deliberately avoid
// touching localStorage, serviceWorker, or caches before render — every one
// of those calls has, at some point, hung or thrown inside the preview iframe
// and left the user staring at a blank white screen.
const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  );
}
