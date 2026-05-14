import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  /** Numeric value in Rupiah (raw integer). Use `null` / `undefined` for empty. */
  value: number | null | undefined;
  /** Returns the raw numeric value (or `null` when input is cleared). */
  onValueChange: (value: number | null) => void;
  /** Whether to render the leading "Rp" prefix inside the input (default true). */
  showPrefix?: boolean;
}

const formatID = (n: number): string => n.toLocaleString("id-ID");

/**
 * CurrencyInput — input nominal dengan format Rupiah otomatis.
 * - Menampilkan "Rp 1.000.000" saat user mengetik angka.
 * - Menyimpan nilai numerik mentah lewat `onValueChange`.
 */
export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onValueChange, showPrefix = true, className, placeholder, ...rest }, ref) => {
    const display = React.useMemo(() => {
      if (value === null || value === undefined || value === ("" as unknown as number)) return "";
      const n = Number(value);
      if (!Number.isFinite(n)) return "";
      return formatID(n);
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/[^\d]/g, "");
      if (raw === "") {
        onValueChange(null);
        return;
      }
      const n = parseInt(raw, 10);
      onValueChange(Number.isFinite(n) ? n : null);
    };

    return (
      <div className="relative w-full">
        {showPrefix && (
          <span
            className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground"
            aria-hidden="true"
          >
            Rp
          </span>
        )}
        <Input
          ref={ref}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          onChange={handleChange}
          placeholder={placeholder ?? "0"}
          className={cn(showPrefix ? "pl-9" : undefined, className)}
          {...rest}
        />
      </div>
    );
  },
);
CurrencyInput.displayName = "CurrencyInput";

export default CurrencyInput;