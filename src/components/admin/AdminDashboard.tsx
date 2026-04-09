import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarCheck, Users, Car, Trophy } from "lucide-react";

const AdminDashboard = () => {
  const [stats, setStats] = useState({ bookings: 0, customers: 0, vehicles: 0, points: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [bookingsRes, profilesRes, vehiclesRes, pointsRes] = await Promise.all([
        supabase.from("bookings").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("loyalty_points").select("total_points"),
      ]);

      setStats({
        bookings: bookingsRes.count || 0,
        customers: profilesRes.count || 0,
        vehicles: vehiclesRes.count || 0,
        points: pointsRes.data?.reduce((sum, r) => sum + r.total_points, 0) || 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    { label: "Total Bookings", value: stats.bookings, icon: CalendarCheck, color: "text-blue-500" },
    { label: "Total Customers", value: stats.customers, icon: Users, color: "text-green-500" },
    { label: "Total Vehicles", value: stats.vehicles, icon: Car, color: "text-orange-500" },
    { label: "Total Loyalty Points", value: stats.points.toLocaleString(), icon: Trophy, color: "text-purple-500" },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => (
        <Card key={c.label}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-bold">{c.value}</p>
              </div>
              <c.icon className={`h-8 w-8 ${c.color}`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminDashboard;
