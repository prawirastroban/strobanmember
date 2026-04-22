import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { LoginDialogProvider } from "@/contexts/LoginDialogContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import LoginDialog from "@/components/LoginDialog";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import BottomNav from "@/components/BottomNav";
import Index from "./pages/Index";
import Booking from "./pages/Booking";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import MyVehicles from "./pages/MyVehicles";
import VehicleDetail from "./pages/VehicleDetail";
import CheckoutComingSoon from "./pages/CheckoutComingSoon";
import Checkout from "./pages/Checkout";
import ServiceHistoryPage from "./pages/ServiceHistory";
import HistoryPerawatan from "./pages/HistoryPerawatan";
import InvoiceView from "./pages/InvoiceView";
import BookingStatus from "./pages/BookingStatus";
import ServiceProgress from "./pages/ServiceProgress";
import ServiceCompleted from "./pages/ServiceCompleted";
import MyBooking from "./pages/MyBooking";
import ReminderService from "./pages/ReminderService";
import Loyalty from "./pages/Loyalty";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <LanguageProvider>
    <AuthProvider>
      <LoginDialogProvider>
      <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <LoginDialog />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/" element={<Index />} />
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
              element={
                <ProtectedRoute>
                  <ServiceHistoryPage />
                </ProtectedRoute>
              }
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
            <Route path="/checkout-coming-soon" element={<CheckoutComingSoon />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <Checkout />
                </ProtectedRoute>
              }
            />
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
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
      </CartProvider>
      </LoginDialogProvider>
    </AuthProvider>
    </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
