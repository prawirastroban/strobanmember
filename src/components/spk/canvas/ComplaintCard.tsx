// Phase 5.3 — Customer Complaint (Catatan Customer + Waktu Estimasi/Konfirmasi).
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Clock, Check } from "lucide-react";
import { CanvasSection, FieldLabel } from "./CanvasSection";

interface ComplaintCardProps {
  complaint: string;
  estimasi: string;
  konfirmasi: string;
}

export function ComplaintCard({ complaint, estimasi, konfirmasi }: ComplaintCardProps) {
  return (
    <CanvasSection index={4} title="Customer Complaint" role="sa">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <FieldLabel>Catatan Customer</FieldLabel>
          <Textarea
            defaultValue={complaint}
            placeholder="Keluhan customer, temuan awal, permintaan khusus…"
            className="min-h-[100px] resize-y bg-background"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <FieldLabel>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> Waktu Estimasi
              </span>
            </FieldLabel>
            <Input defaultValue={estimasi} className="h-11" placeholder="mis. 2 jam" />
          </div>
          <div className="space-y-1.5">
            <FieldLabel>
              <span className="inline-flex items-center gap-1">
                <Check className="h-3 w-3" /> Waktu Konfirmasi
              </span>
            </FieldLabel>
            <Input defaultValue={konfirmasi} className="h-11" placeholder="mis. 14:30" />
          </div>
        </div>
      </div>
    </CanvasSection>
  );
}