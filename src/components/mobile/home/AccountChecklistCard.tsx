import { useNavigate } from "react-router-dom";
import { Car, Check, MessageCircle, ChevronRight } from "lucide-react";
import { useOnboarding } from "@/hooks/useOnboarding";

export default function AccountChecklistCard() {
  const navigate = useNavigate();
  const { loading, isCustomer, hasPhone, hasVehicle } = useOnboarding();

  if (loading || !isCustomer) return null;
  if (hasPhone && hasVehicle) return null;

  const items = [
    {
      key: "phone",
      done: hasPhone,
      icon: MessageCircle,
      label: "Lengkapi nomor WhatsApp",
      to: "/profile",
    },
    {
      key: "vehicle",
      done: hasVehicle,
      icon: Car,
      label: "Tambahkan data kendaraan",
      to: "/my-vehicles",
    },
  ];

  return (
    <section className="px-4" style={{ marginTop: 20 }}>
      <div className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-3">
        <p className="text-[12.5px] font-semibold mb-2">Lengkapi akun Anda</p>
        <ul className="space-y-1.5">
          {items.map(({ key, done, icon: Icon, label, to }) => (
            <li key={key}>
              <button
                onClick={() => navigate(to)}
                disabled={done}
                className="w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 bg-muted/40 disabled:opacity-60 hover:bg-muted/70 transition-colors text-left"
              >
                <span
                  className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                    done ? "bg-emerald-500/15" : "bg-primary/12"
                  }`}
                >
                  {done ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 text-primary" />
                  )}
                </span>
                <span className="flex-1 text-[12.5px]">{label}</span>
                {!done && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
