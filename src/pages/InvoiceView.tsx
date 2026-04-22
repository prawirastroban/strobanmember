import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft, Printer, FileText, CheckCircle2, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

interface InvoiceData {
  id: string;
  invoice_number: string;
  booking_id: string;
  amount: number;
  items: Array<{ name: string; type: string; price: number; quantity: number }>;
  payment_status: string;
  payment_method: string | null;
  created_at: string;
}

interface BookingData {
  service_name: string;
  service_type: string;
  service_price: number;
  booking_date: string;
  booking_time: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  car_type: string | null;
  car_plate_number: string | null;
  branch: string | null;
  status: string;
}

const formatIDR = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

const statusIcon = (s: string) => {
  switch (s) {
    case "paid": case "success": return <CheckCircle2 className="h-5 w-5 text-emerald-400" />;
    case "pending": case "unpaid": return <Clock className="h-5 w-5 text-primary" />;
    case "failed": return <XCircle className="h-5 w-5 text-red-400" />;
    default: return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
};

const statusColor = (s: string) => {
  switch (s) {
    case "paid": case "success": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "pending": case "unpaid": return "bg-primary/20 text-primary border-primary/30";
    case "failed": return "bg-red-500/20 text-red-400 border-red-500/30";
    default: return "bg-muted text-muted-foreground";
  }
};

const InvoiceView = () => {
  const { bookingId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookingId || !user) return;
    const fetch = async () => {
      const [invoiceRes, bookingRes] = await Promise.all([
        supabase.from("invoices").select("*").eq("booking_id", bookingId).single(),
        supabase.from("bookings").select("service_name,service_type,service_price,booking_date,booking_time,customer_name,customer_email,customer_phone,car_type,car_plate_number,branch,status").eq("id", bookingId).single(),
      ]);
      if (invoiceRes.data) {
        const raw = invoiceRes.data as any;
        setInvoice({
          ...raw,
          items: Array.isArray(raw.items) ? raw.items : [],
        });
      }
      if (bookingRes.data) setBooking(bookingRes.data as BookingData);
      setLoading(false);
    };
    fetch();
  }, [bookingId, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!invoice || !booking) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground mb-4">Invoice tidak ditemukan</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Kembali</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-5 md:py-6 max-w-2xl pb-20">
        {/* Header — back handled by global Navbar */}
        <div className="flex items-center justify-end mb-4">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1 print:hidden">
            <Printer className="h-4 w-4" /> Print
          </Button>
        </div>

        {/* Invoice Card */}
        <Card className="bg-card/60 backdrop-blur-xl border-border/50 rounded-2xl overflow-hidden print:shadow-none print:border print:bg-white">
          <CardContent className="p-6 sm:p-8">
            {/* Invoice Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">INVOICE</h1>
                <p className="text-sm text-primary font-mono mt-1">{invoice.invoice_number}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 justify-end">
                  {statusIcon(invoice.payment_status)}
                  <Badge className={`${statusColor(invoice.payment_status)} text-xs border`}>
                    {invoice.payment_status.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {format(new Date(invoice.created_at), "dd MMM yyyy, HH:mm")}
                </p>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Customer & Vehicle Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Customer</p>
                <p className="font-semibold text-sm">{booking.customer_name}</p>
                <p className="text-xs text-muted-foreground">{booking.customer_email}</p>
                <p className="text-xs text-muted-foreground">{booking.customer_phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Kendaraan</p>
                <p className="font-semibold text-sm">{booking.car_type || "-"}</p>
                <p className="text-xs text-muted-foreground">{booking.car_plate_number || "-"}</p>
                {booking.branch && <p className="text-xs text-muted-foreground mt-1">Cabang: {booking.branch}</p>}
              </div>
            </div>

            {/* Booking Info */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-muted/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Tanggal</p>
                <p className="text-sm font-medium">{format(new Date(booking.booking_date), "dd MMM yyyy")}</p>
              </div>
              <div className="bg-muted/30 rounded-xl p-3">
                <p className="text-xs text-muted-foreground">Waktu</p>
                <p className="text-sm font-medium">{booking.booking_time}</p>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Items */}
            <div className="mb-6">
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Detail Layanan</p>
              <div className="space-y-2">
                {invoice.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 px-3 bg-muted/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{item.type} × {item.quantity}</p>
                    </div>
                    <p className="text-sm font-semibold">{formatIDR(Number(item.price) * (item.quantity || 1))}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="mb-4" />

            {/* Total */}
            <div className="flex items-center justify-between">
              <div>
                {invoice.payment_method && (
                  <p className="text-xs text-muted-foreground">Metode: <span className="capitalize font-medium">{invoice.payment_method}</span></p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-primary">{formatIDR(Number(invoice.amount))}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer note */}
        <p className="text-center text-xs text-muted-foreground mt-6 print:mt-4">
          Invoice ini digenerate otomatis oleh sistem. Terima kasih atas kepercayaan Anda.
        </p>
      </main>
    </div>
  );
};

export default InvoiceView;
