import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Megaphone } from "lucide-react";

const MarketingDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Visitors", value: "—", icon: Users, color: "text-blue-500" },
          { label: "Conversions", value: "—", icon: TrendingUp, color: "text-green-500" },
          { label: "Campaigns", value: "—", icon: Megaphone, color: "text-orange-500" },
          { label: "Revenue", value: "—", icon: BarChart3, color: "text-purple-500" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Marketing Dashboard</CardTitle>
          <CardDescription>
            Marketing analytics and campaign management will be available here soon.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <div className="text-center space-y-2">
              <Megaphone className="h-12 w-12 mx-auto opacity-30" />
              <p className="text-lg font-medium">Coming Soon</p>
              <p className="text-sm">Marketing features are under development.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketingDashboard;
