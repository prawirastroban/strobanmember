import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, History } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const ServiceHistory = () => {
  const { t } = useLanguage();
  const services = [
    { id: 1, type: "Tire Rotation", date: "October 15, 2025", mileage: "43,500 mi", points: 100 },
    { id: 2, type: "Oil Change", date: "August 8, 2025", mileage: "40,200 mi", points: 100 },
    { id: 3, type: "Brake Inspection", date: "June 3, 2025", mileage: "38,000 mi", points: 100 },
  ];

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          {t.serviceHistory.title}
        </CardTitle>
        <CardDescription>{t.serviceHistory.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-colors"
            >
              <CheckCircle2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{service.type}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                  <span>{service.date}</span>
                  <span>{service.mileage}</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-accent">+{service.points}</p>
                <p className="text-xs text-muted-foreground">{t.common.points}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceHistory;
