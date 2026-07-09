import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePresenceTracker } from "@/hooks/usePresence";
import { usePresenceHeartbeat } from "@/hooks/usePresenceHeartbeat";
import { useInstallTracker } from "@/hooks/useInstallTracker";
import { useClientVersionTracker } from "@/hooks/useClientVersionTracker";
import { useClientCommands } from "@/hooks/useClientCommands";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { LoginDialogProvider } from "@/contexts/LoginDialogContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { OverlayQueueProvider } from "@/contexts/OverlayQueueContext";
import { VersionCheckProvider } from "@/contexts/VersionCheckContext";
import { UpdateDialogHost } from "@/components/update/UpdateDialogHost";
import { UpdateAvailableToast } from "@/components/update/UpdateAvailableToast";
import { VersionEnforcementGate } from "@/components/update/VersionEnforcementGate";
import LoginDialog from "@/components/LoginDialog";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import BottomNav from "@/components/BottomNav";
import FloatingCartPill from "@/components/FloatingCartPill";
import InstallAppBanner from "@/components/InstallAppBanner";
import NotificationBridge from "@/components/NotificationBridge";
import StandaloneNotifPrompt from "@/components/StandaloneNotifPrompt";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import VersionGate from "@/components/VersionGate";
import UpdatePopup from "@/components/UpdatePopup";
import MaintenanceGate from "@/components/MaintenanceGate";
import SwipeBackProvider from "@/components/SwipeBackProvider";
import ScrollManager from "@/components/ScrollManager";
import BrandingSync from "@/components/BrandingSync";
import SEOMeta from "@/components/SEOMeta";
import GAPageviewTracker from "@/components/GAPageviewTracker";
import WhatsAppRequiredGate from "@/components/WhatsAppRequiredGate";
import AndroidBackHandler from "@/components/AndroidBackHandler";
import NativeAuthBridge from "@/components/NativeAuthBridge";
import Index from "./pages/Index";
import Booking from "./pages/Booking";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import ResetPasswordWA from "./pages/ResetPasswordWA";
import AuthCallback from "./pages/AuthCallback";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import MyVehicles from "./pages/MyVehicles";
import VehicleDetail from "./pages/VehicleDetail";
import HistoryPerawatan from "./pages/HistoryPerawatan";
import InvoiceView from "./pages/InvoiceView";
import BookingStatus from "./pages/BookingStatus";
import ServiceProgress from "./pages/ServiceProgress";
import ServiceCompleted from "./pages/ServiceCompleted";
import MyBooking from "./pages/MyBooking";
import ManualPayment from "./pages/ManualPayment";
import ReminderService from "./pages/ReminderService";
import Loyalty from "./pages/Loyalty";
import Promo from "./pages/Promo";
import Cabang from "./pages/Cabang";
import Katalog from "./pages/Katalog";
import Referral from "./pages/Referral";
import LegalPage from "./pages/LegalPage";
import PublicReviewForm from "./pages/PublicReviewForm";
import PublicBookingTracker from "./pages/PublicBookingTracker";
import ClaimAccount from "./pages/ClaimAccount";
import Feedback from "./pages/Feedback";
import CashbackHistory from "./pages/CashbackHistory";
import NotificationCenter from "./pages/NotificationCenter";
import UpdateCenter from "./pages/UpdateCenter";
import OAuthBrokerFallback from "./pages/OAuthBrokerFallback";
import SPKDetail from "./pages/spk/SPKDetail";
import LegacyRedirect from "@/components/LegacyRedirect";

const queryClient = new QueryClient();

// Track the user's last visited page so the auth flow can return them there.
const RouteTracker = () => {
  const location = useLocation();
  useEffect(() => {
    const path = location.pathname + location.search;
    if (path.startsWith("/auth") || path.startsWith("/reset-password")) return;
    // (also covers /auth/callback)
    try {
      sessionStorage.setItem("lastVisitedPath", path);
    } catch {
      /* ignore storage errors */
    }
  }, [location.pathname, location.search]);
  return null;
};

// Capture ?ref=CODE on any landing and persist for post-signup attach.
const ReferralCapture = () => {
  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const code = params.get("ref");
    if (code && /^[A-Za-z0-9-]{3,20}$/.test(code)) {
      try { localStorage.setItem("pending_ref_code", code.toUpperCase()); } catch {}
    }
  }, [location.search]);
  return null;
};

// Marks the logged-in user as online in the global presence channel.
const PresenceTracker = () => {
  usePresenceTracker();
  return null;
};

// Per-route heartbeat used by the notification engine to skip push when the
// user is already viewing the related page (smart delivery).
const PresenceRouteBeat = () => {
  usePresenceHeartbeat();
  return null;
};

// Logs a one-time install event when the app is opened in standalone mode.
const InstallTracker = () => {
  useInstallTracker();
  return null;
};

const ClientVersionTracker = () => { useClientVersionTracker(); return null; };
const ClientCommandsListener = () => { useClientCommands(); return null; };

// Listens for `push-navigate` custom events (fired by native/web push handlers
// when the user taps a notification) and performs SPA navigation.
const PushNavigateBridge = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: Event) => {
      const route = (e as CustomEvent).detail?.route;
      if (typeof route === "string" && route.startsWith("/")) {
        navigate(route);
      }
    };
    window.addEventListener("push-navigate", handler);
    return () => window.removeEventListener("push-navigate", handler);
  }, [navigate]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <LanguageProvider>
    <AuthProvider>
      <LoginDialogProvider>
      <CartProvider>
      <OverlayQueueProvider>
      <VersionCheckProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <UpdateDialogHost />
          <UpdateAvailableToast />
          <LoginDialog />
          <RouteTracker />
          <ReferralCapture />
          <PresenceTracker />
          <PresenceRouteBeat />
          <InstallTracker />
          <ClientVersionTracker />
          <ClientCommandsListener />
          <PushNavigateBridge />
          <ScrollManager />
          <BrandingSync />
          <SEOMeta />
          <GAPageviewTracker />
          <WhatsAppRequiredGate />
          <AndroidBackHandler />
          <NativeAuthBridge />
          <SwipeBackProvider>
          <VersionEnforcementGate>
          <Routes>
            <Route path="/~oauth/*" element={<OAuthBrokerFallback />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/auth/native-callback" element={<AuthCallback />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/reset-password-wa" element={<ResetPasswordWA />} />
            <Route path="/" element={<Index />} />
            <Route path="/promo" element={<Promo />} />
            <Route path="/cabang" element={<Cabang />} />
            <Route path="/katalog" element={<Katalog />} />
            <Route
              path="/booking"
              element={
                <ProtectedRoute>
                  <Booking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard/*"
              element={
                <AdminRoute>
                  <Admin />
                </AdminRoute>
              }
            />
            {/* Legacy redirects */}
            <Route path="/admin/*" element={<Navigate to="/dashboard" replace />} />
            <Route path="/staff-setting" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/history"
              element={<LegacyRedirect to="/profile/history-perawatan" />}
            />
            <Route
              path="/profile/history-perawatan"
              element={
                <ProtectedRoute>
                  <HistoryPerawatan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoice/:bookingId"
              element={
                <ProtectedRoute>
                  <InvoiceView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-vehicles"
              element={
                <ProtectedRoute>
                  <MyVehicles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-vehicles/:id"
              element={
                <ProtectedRoute>
                  <VehicleDetail />
                </ProtectedRoute>
              }
            />
            {/* Legacy cart/checkout routes redirect to booking */}
            <Route path="/checkout-coming-soon" element={<Navigate to="/booking" replace />} />
            <Route path="/checkout" element={<Navigate to="/booking" replace />} />
            <Route
              path="/booking/status/:bookingId"
              element={
                <ProtectedRoute>
                  <BookingStatus />
                </ProtectedRoute>
              }
            />
            <Route
              path="/service/progress/:bookingId"
              element={
                <ProtectedRoute>
                  <ServiceProgress />
                </ProtectedRoute>
              }
            />
            <Route
              path="/service/completed/:bookingId"
              element={
                <ProtectedRoute>
                  <ServiceCompleted />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-booking/:bookingId"
              element={
                <ProtectedRoute>
                  <MyBooking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment/manual/:bookingId"
              element={
                <ProtectedRoute>
                  <ManualPayment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reminder-service"
              element={
                <ProtectedRoute>
                  <ReminderService />
                </ProtectedRoute>
              }
            />
            <Route
              path="/loyalty"
              element={
                <ProtectedRoute>
                  <Loyalty />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cashback-history"
              element={
                <ProtectedRoute>
                  <CashbackHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/referral"
              element={
                <ProtectedRoute>
                  <Referral />
                </ProtectedRoute>
              }
            />
            <Route path="/legal/:slug" element={<LegalPage />} />
            <Route path="/review/:token" element={<PublicReviewForm />} />
            <Route path="/t/:token" element={<PublicBookingTracker />} />
            <Route path="/claim/:token" element={<ClaimAccount />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/update-center" element={<UpdateCenter />} />
            <Route
              path="/spk/:id"
              element={
                <ProtectedRoute>
                  <SPKDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <NotificationCenter />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </VersionEnforcementGate>
          </SwipeBackProvider>
          <BottomNav />
          <FloatingCartPill />
          <InstallAppBanner />
          <NotificationBridge />
          <StandaloneNotifPrompt />
          <CookieConsentBanner />
          <VersionGate />
          <UpdatePopup />
          <MaintenanceGate />
        </BrowserRouter>
      </TooltipProvider>
      </VersionCheckProvider>
      </OverlayQueueProvider>
      </CartProvider>
      </LoginDialogProvider>
    </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
