import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MessageCircle } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function StepWhatsApp({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <span className="h-10 w-10 rounded-full bg-[#25D366]/15 flex items-center justify-center shrink-0">
          <MessageCircle className="h-5 w-5 text-[#25D366]" />
        </span>
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight">Nomor WhatsApp Anda</h3>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Dipakai untuk konfirmasi booking, reminder servis, dan reset password.
          </p>
        </div>
      </div>

      <div>
        <Label htmlFor="onb-phone" className="text-[11px] text-muted-foreground">
          Nomor WhatsApp aktif <span className="text-[#ff2b2b] font-semibold">• Wajib</span>
        </Label>
        <div className="flex mt-1">
          <div className="flex items-center justify-center px-3 border border-r-0 rounded-l-xl bg-muted text-muted-foreground text-sm">
            +62
          </div>
          <Input
            id="onb-phone"
            type="tel"
            inputMode="numeric"
            autoFocus
            placeholder="812 3456 7890"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ""))}
            maxLength={13}
            className="rounded-l-none rounded-r-xl h-11 text-sm"
          />
        </div>
        <p className="text-[10.5px] text-muted-foreground mt-1.5">
          Tanpa angka 0 di depan. Contoh: 81234567890
        </p>
      </div>
    </div>
  );
}