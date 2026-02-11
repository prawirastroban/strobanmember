import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/i18n/LanguageContext";

const ServiceReminder = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const daysUntilService = 12;
  const nextServiceDate = "November 20, 2025";
  const serviceType = "Oil Change & Inspection";

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            {t.serviceReminder.title}
          </CardTitle>
          <Badge variant="default" className="bg-accent">
            {daysUntilService} {t.common.days}
          </Badge>
        </div>
        <CardDescription>{t.serviceReminder.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg">
          <Wrench className="h-5 w-5 text-primary mt-1" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">{serviceType}</p>
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{nextServiceDate}</span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.serviceReminder.currentMileage}</span>
            <span className="font-semibold">45,234 mi</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t.serviceReminder.serviceMileage}</span>
            <span className="font-semibold">48,000 mi</span>
          </div>
        </div>

        <Button 
          className="w-full" 
          size="lg"
          onClick={() => navigate("/booking")}
        >
          {t.serviceReminder.scheduleService}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ServiceReminder;
