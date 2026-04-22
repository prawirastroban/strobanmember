import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Check, UserCheck, CalendarCheck, Info, CreditCard, Activity, Receipt } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  metadata: { redirect_to?: string; reference_id?: string; [k: string]: any } | null;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  new_registration: UserCheck,
  verification: Check,
  booking: CalendarCheck,
  booking_created: CalendarCheck,
  payment_success: CreditCard,
  service_progress: Activity,
  invoice_ready: Receipt,
  info: Info,
};

// Map notification type → default route when metadata.redirect_to is missing
const resolveRedirect = (n: Notification): string => {
  if (n.metadata?.redirect_to) return n.metadata.redirect_to;
  const id = n.metadata?.reference_id;
  switch (n.type) {
    case "payment_success": return "/profile/history-perawatan";
    case "booking_created":
    case "booking": return "/profile/history-perawatan";
    case "service_progress": return "/";
    case "invoice_ready": return id ? `/invoice/${id}` : "/profile/history-perawatan";
    case "verification":
    case "new_registration": return "/dashboard/user-verification";
    default: return "/";
  }
};

const NotificationBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    setNotifications((data as Notification[]) || []);
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-bell-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => {
            const next = [payload.new as Notification, ...prev.filter((item) => item.id !== payload.new.id)];
            return next.slice(0, 20);
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          fetchNotifications();
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleClick = async (notif: Notification) => {
    if (!notif.is_read) await markAsRead(notif.id);
    setOpen(false);
    const target = resolveRedirect(notif);
    navigate(target);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground animate-pulse ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[92vw] sm:w-80 p-0 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifikasi</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
              Tandai semua dibaca
            </Button>
          )}
        </div>
        <ScrollArea className="flex-1 h-[60vh] sm:h-[360px] [&_[data-radix-scroll-area-scrollbar]]:hidden">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Tidak ada notifikasi
            </div>
          ) : (
            notifications.map((notif) => {
              const IconComp = typeIcons[notif.type] || Info;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`group w-full text-left px-4 py-3 border-b last:border-0 transition-all duration-200 hover:bg-muted/60 hover:scale-[1.01] hover:border-l-2 hover:border-l-primary cursor-pointer ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 p-1.5 rounded-lg ${!notif.is_read ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <IconComp className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${!notif.is_read ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <span className="mt-1 h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
