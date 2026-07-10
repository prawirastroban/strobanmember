import { Link } from "react-router-dom";
import { Printer } from "lucide-react";

export function SPKPrintLink({ spkId }: { spkId: string }) {
  return (
    <Link
      to={`/spk/${spkId}/print`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/80 px-3 py-1.5 text-[11px] font-medium hover:bg-muted"
    >
      <Printer className="h-3.5 w-3.5" />
      Lihat / Cetak SPK
    </Link>
  );
}