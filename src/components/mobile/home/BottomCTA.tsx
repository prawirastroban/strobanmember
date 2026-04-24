import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginDialog } from "@/contexts/LoginDialogContext";

const BottomCTA = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { openLoginDialog } = useLoginDialog();

  const onClick = () => {
    if (!user) { openLoginDialog("/booking"); return; }
    navigate("/booking");
  };

  return (
    <section className="lg:hidden mt-8 px-4 mb-6">
      <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground p-5 text-center">
        <h3 className="text-lg font-bold leading-tight">Siap servis mobil Anda?</h3>
        <p className="text-sm opacity-90 mt-1">Booking online dalam 30 detik.</p>
        <Button
          onClick={onClick}
          variant="secondary"
          className="mt-4 w-full h-12 text-base font-semibold bg-background text-foreground hover:bg-background/90"
        >
          Booking Sekarang <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </section>
  );
};

export default BottomCTA;