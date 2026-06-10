import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Bell, Check, UserCheck, CalendarCheck, Info, CreditCard, Activity, Receipt } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { resolveNotificationRoute } from "@/lib/notificationRoute";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  metadata: {
    redirect_to?: string;
    reference_id?: string;
    registered_user_id?: string;
    customer_user_id?: string;
    booking_id?: string;
    [k: string]: any;
  } | null;
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

const resolveRedirect = (n: Notification, isStaffSide: boolean): string =>
  resolveNotificationRoute(n, isStaffSide);

const NotificationBell = () => {
  const { user } = useAuth();
  const { isAdminOrStaff } = useUserRole();
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
    const target = resolveRedirect(notif, isAdminOrStaff);
    navigate(target);
  };

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 overflow-visible">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="pointer-events-none absolute top-1 right-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-destructive text-[10px] font-bold leading-none text-destructive-foreground ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[340px] max-w-[calc(100vw-24px)] p-0 rounded-2xl border-border/60 shadow-xl overflow-hidden flex flex-col max-h-[70vh]"
      >
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 shrink-0">
          <h4 className="font-semibold text-[13px] tracking-tight">Notifikasi</h4>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-[11px] h-6 px-2 rounded-full" onClick={markAllRead}>
              Tandai dibaca
            </Button>
          )}
        </div>
        <div
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-[12px] text-muted-foreground">
              Tidak ada notifikasi
            </div>
          ) : (
            notifications.map((notif) => {
              const IconComp = typeIcons[notif.type] || Info;
              return (
                <button
                  key={notif.id}
                  onClick={() => handleClick(notif)}
                  className={`w-full text-left px-3.5 py-2.5 border-b border-border/50 last:border-0 transition-colors hover:bg-white/5 ${
                    !notif.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${!notif.is_read ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                      <IconComp className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[12.5px] leading-snug tracking-tight truncate ${!notif.is_read ? "font-semibold" : "font-medium"}`}>{notif.title}</p>
                      <p className="text-[11.5px] text-muted-foreground leading-snug line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {!notif.is_read && (
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
        <div className="border-t border-border/60 px-3.5 py-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-[12px] h-7"
            onClick={() => { setOpen(false); navigate("/notifications"); }}
          >
            Lihat semua notifikasi
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
