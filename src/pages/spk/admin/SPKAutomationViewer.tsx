// SPK Automation viewer — read-only over AutomationEngine registrations.
import SPKPlaceholderPanel from "./SPKPlaceholderPanel";
import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

const RULES = [
  { event: "status_changed",       action: "runtime-refresh + queue-refresh + progress-refresh" },
  { event: "spk_created",          action: "queue-refresh" },
  { event: "spk_closed",           action: "queue-refresh + progress-refresh" },
  { event: "approval_requested",   action: "notification-trigger + progress-refresh" },
  { event: "approval_decided",     action: "runtime-refresh + progress-refresh" },
  { event: "inspection_updated",   action: "progress-refresh" },
  { event: "timeline.appended",    action: "timeline-refresh" },
];

export default function SPKAutomationViewer() {
  return (
    <SPKPlaceholderPanel
      title="Automation Rules"
      description="Trigger side-effects setelah event SPK. Ditentukan pada AutomationBootstrap; halaman ini presentasi saja."
      reuses="AutomationEngine + RuntimeBus (spk_created, status_changed, approval_*, timeline.appended)"
    >
      <div className="grid gap-2">
        {RULES.map((r) => (
          <Card key={r.event}>
            <CardContent className="p-3 flex items-start gap-3">
              <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.event}</p>
                <p className="text-xs text-muted-foreground">{r.action}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </SPKPlaceholderPanel>
  );
}