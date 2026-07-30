// Pemilih mekanik yang dipakai di form intake SPK dan Canvas.
// Mendukung akun mekanik terdaftar + opsi tulis manual (mis. hasil scan SPK
// fisik untuk mekanik yang belum punya akun).
import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMechanics } from "@/hooks/spk/useMechanics";
import { Wrench } from "lucide-react";

export const MANUAL_MECHANIC = "__manual__";
export const NO_MECHANIC = "__none__";

export interface MechanicValue {
  /** UUID akun mekanik, atau null bila manual/belum ditentukan. */
  id: string | null;
  /** Nama yang tersimpan ke `spk_orders.data.mechanic_name`. */
  name: string;
}

export function MechanicSelect({
  value,
  onChange,
  branch,
  disabled,
  className,
}: {
  value: MechanicValue;
  onChange: (next: MechanicValue) => void;
  branch?: string | null;
  disabled?: boolean;
  className?: string;
}) {
  const { forBranch, loading } = useMechanics();
  const options = useMemo(() => forBranch(branch), [forBranch, branch]);

  const selectValue = value.id
    ? value.id
    : value.name
      ? MANUAL_MECHANIC
      : NO_MECHANIC;

  const handleSelect = (next: string) => {
    if (next === NO_MECHANIC) return onChange({ id: null, name: "" });
    if (next === MANUAL_MECHANIC) return onChange({ id: null, name: value.name || "" });
    const hit = options.find((m) => m.id === next);
    onChange({ id: next, name: hit?.name ?? "" });
  };

  return (
    <div className={className}>
      <Select value={selectValue} onValueChange={handleSelect} disabled={disabled || loading}>
        <SelectTrigger className="h-11">
          <SelectValue placeholder={loading ? "Memuat mekanik…" : "Pilih mekanik"} />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          <SelectItem value={NO_MECHANIC}>Belum ditentukan</SelectItem>
          {options.map((m) => (
            <SelectItem key={m.id} value={m.id}>
              {m.name}
            </SelectItem>
          ))}
          <SelectItem value={MANUAL_MECHANIC}>Tulis manual…</SelectItem>
        </SelectContent>
      </Select>

      {selectValue === MANUAL_MECHANIC && (
        <Input
          value={value.name}
          onChange={(e) => onChange({ id: null, name: e.target.value })}
          placeholder="Nama mekanik"
          disabled={disabled}
          className="mt-2 h-11"
        />
      )}

      {!loading && options.length === 0 && (
        <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <Wrench className="h-3 w-3" /> Belum ada akun ber-role mekanik — gunakan "Tulis manual".
        </p>
      )}
    </div>
  );
}
