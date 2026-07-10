import { useNavigate } from "react-router-dom";
import SPKPlaceholderPanel from "./SPKPlaceholderPanel";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SPKNewPage() {
  const navigate = useNavigate();
  return (
    <SPKPlaceholderPanel
      title="Buat SPK Baru"
      description="Intake SPK menggunakan Canvas + Runtime yang sudah ada."
      reuses="SPKService.create() + SPKCanvas (dynamic form runtime)"
    >
      <Button onClick={() => navigate("/spk?action=new")} size="lg" className="gap-2">
        <Plus className="h-4 w-4" /> Buka Intake SPK
      </Button>
    </SPKPlaceholderPanel>
  );
}