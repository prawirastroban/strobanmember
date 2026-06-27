import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import type { PluginListenerHandle } from "@capacitor/core";
import { isNative } from "@/lib/platform";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Hardware back-button handler for Android:
 * - On any non-home route → navigate(-1)
 * - On home (`/`) → confirm exit
 * No-op on web.
 */
const AndroidBackHandler = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmExit, setConfirmExit] = useState(false);
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    if (!isNative()) return;

    let handle: PluginListenerHandle | undefined;

    CapApp.addListener("backButton", ({ canGoBack }) => {
      const path = locationRef.current.pathname;
      const atHome = path === "/" || path === "";

      if (atHome) {
        setConfirmExit(true);
        return;
      }

      if (canGoBack && window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/", { replace: true });
      }
    }).then((h) => {
      handle = h;
    });

    return () => {
      handle?.remove?.();
    };
  }, [navigate]);

  return (
    <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Keluar dari Stroban?</AlertDialogTitle>
          <AlertDialogDescription>
            Anda akan menutup aplikasi. Notifikasi tetap aktif di latar belakang.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              CapApp.exitApp().catch(() => {
                /* exitApp may be blocked on some OEMs — ignore */
              });
            }}
          >
            Keluar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AndroidBackHandler;