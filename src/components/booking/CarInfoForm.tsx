import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Car, MapPin } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const BRANCHES = [
  { id: "bandung", name: "Bandung" },
  { id: "tasikmalaya", name: "Tasikmalaya" },
  { id: "cirebon", name: "Cirebon" },
  { id: "yogyakarta", name: "Yogyakarta" },
];

interface CarInfoFormProps {
  carType: string;
  carPlateNumber: string;
  branch: string;
  onCarTypeChange: (value: string) => void;
  onCarPlateNumberChange: (value: string) => void;
  onBranchChange: (value: string) => void;
}

const CarInfoForm = ({
  carType,
  carPlateNumber,
  branch,
  onCarTypeChange,
  onCarPlateNumberChange,
  onBranchChange,
}: CarInfoFormProps) => {
  const { t } = useLanguage();
  const isComplete = carType.trim() !== "" && carPlateNumber.trim() !== "" && branch !== "";

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                4
              </div>
              {t.booking.vehicleBranch}
            </CardTitle>
            <CardDescription>{t.booking.vehicleBranchDesc}</CardDescription>
          </div>
          {isComplete && (
            <Badge variant="default" className="bg-accent text-primary-foreground">
              <Check className="h-3 w-3 mr-1" />
              {t.common.complete}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="branch" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {t.booking.branchLocation}
            </Label>
            <Select value={branch} onValueChange={onBranchChange}>
              <SelectTrigger id="branch" className="bg-background">
                <SelectValue placeholder={t.booking.selectBranch} />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                {BRANCHES.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="carType" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              {t.booking.carType}
            </Label>
            <Input
              id="carType"
              placeholder={t.booking.carTypePlaceholder}
              value={carType}
              onChange={(e) => onCarTypeChange(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carPlateNumber" className="flex items-center gap-2">
              <span className="text-sm">🚗</span>
              {t.booking.plateNumber}
            </Label>
            <Input
              id="carPlateNumber"
              placeholder={t.booking.plateNumberPlaceholder}
              value={carPlateNumber}
              onChange={(e) => onCarPlateNumberChange(e.target.value.toUpperCase())}
              maxLength={20}
              className="uppercase"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CarInfoForm;
