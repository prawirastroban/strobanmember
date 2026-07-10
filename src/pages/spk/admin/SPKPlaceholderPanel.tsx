// Shared shell for SPK admin surfaces that mount existing runtime services.
// UI-only wrapper — no business logic added.
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import { ReactNode } from "react";

interface Props {
  title: string;
  description: string;
  reuses: string;
  children?: ReactNode;
}

export default function SPKPlaceholderPanel({ title, description, reuses, children }: Props) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">{description}</p>
          <div className="flex items-start gap-2 rounded-md border border-border/60 bg-muted/30 p-3">
            <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">Reuses:</strong> {reuses}
            </p>
          </div>
        </CardContent>
      </Card>
      {children}
    </div>
  );
}