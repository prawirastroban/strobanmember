import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Car } from "lucide-react";

interface CarInfoFormProps {
  carType: string;
  carPlateNumber: string;
  onCarTypeChange: (value: string) => void;
  onCarPlateNumberChange: (value: string) => void;
}

const CarInfoForm = ({
  carType,
  carPlateNumber,
  onCarTypeChange,
  onCarPlateNumberChange,
}: CarInfoFormProps) => {
  const isComplete = carType.trim() !== "" && carPlateNumber.trim() !== "";

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                4
              </div>
              Vehicle Information
            </CardTitle>
            <CardDescription>Enter your car details</CardDescription>
          </div>
          {isComplete && (
            <Badge variant="default" className="bg-accent">
              <Check className="h-3 w-3 mr-1" />
              Complete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="carType" className="flex items-center gap-2">
              <Car className="h-4 w-4" />
              Car Type / Model
            </Label>
            <Input
              id="carType"
              placeholder="e.g., Toyota Camry, Honda Civic"
              value={carType}
              onChange={(e) => onCarTypeChange(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carPlateNumber" className="flex items-center gap-2">
              <span className="text-sm">🚗</span>
              Plate Number
            </Label>
            <Input
              id="carPlateNumber"
              placeholder="e.g., ABC 1234"
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
