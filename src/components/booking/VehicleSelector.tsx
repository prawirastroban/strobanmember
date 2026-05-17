import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Car, Plus, MapPin, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/i18n/LanguageContext";
import { useBranches } from "@/hooks/useBranches";
import { toast } from "sonner";

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  license_plate: string;
  tire_size: string | null;
  oem_tire: string | null;
  transmission: string | null;
  fuel_type: string | null;
  is_default: boolean;
}

interface VehicleSelectorProps {
  carType: string;
  carPlateNumber: string;
  branch: string;
  onCarTypeChange: (value: string) => void;
  onCarPlateNumberChange: (value: string) => void;
  onBranchChange: (value: string) => void;
  onVehicleSelected?: (vehicle: Vehicle | null) => void;
}

const VehicleSelector = ({
  carType,
  carPlateNumber,
  branch,
  onCarTypeChange,
  onCarPlateNumberChange,
  onBranchChange,
  onVehicleSelected,
}: VehicleSelectorProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [manualMode, setManualMode] = useState(false);

  // Add vehicle form state
  const [newBrand, setNewBrand] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newYear, setNewYear] = useState("");
  const [newPlate, setNewPlate] = useState("");
  const [newTransmission, setNewTransmission] = useState("");
  const [newFuelType, setNewFuelType] = useState("");
  const [newTireSize, setNewTireSize] = useState("");

  const isComplete = carType.trim() !== "" && carPlateNumber.trim() !== "" && branch !== "";

  const fetchVehicles = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .eq("user_id", user.id)
      .order("is_default", { ascending: false });

    if (!error && data) {
      setVehicles(data);
      // Auto-select default vehicle
      if (data.length > 0 && !selectedVehicleId && !manualMode) {
        const defaultVehicle = data.find((v) => v.is_default) || data[0];
        selectVehicle(defaultVehicle);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVehicles();
  }, [user]);

  const selectVehicle = (vehicle: Vehicle) => {
    setSelectedVehicleId(vehicle.id);
    setManualMode(false);
    onCarTypeChange(`${vehicle.brand} ${vehicle.model}${vehicle.year ? ` (${vehicle.year})` : ""}`);
    onCarPlateNumberChange(vehicle.license_plate);
    onVehicleSelected?.(vehicle);
  };

  const handleManualMode = () => {
    setSelectedVehicleId(null);
    setManualMode(true);
    onCarTypeChange("");
    onCarPlateNumberChange("");
    onVehicleSelected?.(null);
  };

  const resetAddForm = () => {
    setNewBrand("");
    setNewModel("");
    setNewYear("");
    setNewPlate("");
    setNewTransmission("");
    setNewFuelType("");
    setNewTireSize("");
  };

  const handleAddVehicle = async () => {
    if (!user) return;
    if (!newBrand.trim() || !newModel.trim() || !newPlate.trim()) {
      toast.error(t.booking.vehicleRequiredFields);
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("vehicles")
      .insert({
        user_id: user.id,
        brand: newBrand.trim(),
        model: newModel.trim(),
        year: newYear ? parseInt(newYear) : null,
        license_plate: newPlate.trim().toUpperCase(),
        transmission: newTransmission || null,
        fuel_type: newFuelType || null,
        tire_size: newTireSize.trim() || null,
        is_default: vehicles.length === 0,
      })
      .select()
      .single();

    if (error) {
      toast.error(t.booking.failedAddVehicle);
      setSaving(false);
      return;
    }

    toast.success(t.booking.vehicleAdded);
    resetAddForm();
    setShowAddDialog(false);
    setSaving(false);

    // Refresh and auto-select new vehicle
    await fetchVehicles();
    if (data) {
      selectVehicle(data);
    }
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
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
        <CardContent className="space-y-6">
          {/* Vehicle Selection */}
          {vehicles.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Car className="h-4 w-4" />
                {t.booking.selectVehicle}
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {vehicles.map((vehicle) => (
                  <Card
                    key={vehicle.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${
                      selectedVehicleId === vehicle.id
                        ? "ring-2 ring-primary bg-primary/5 shadow-md"
                        : "hover:border-primary/30"
                    }`}
                    onClick={() => selectVehicle(vehicle)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold text-sm">
                            {vehicle.brand} {vehicle.model}
                          </p>
                          {vehicle.year && (
                            <p className="text-xs text-muted-foreground">{vehicle.year}</p>
                          )}
                          <Badge variant="outline" className="text-xs uppercase font-mono">
                            {vehicle.license_plate}
                          </Badge>
                          {vehicle.tire_size && (
                            <p className="text-xs text-muted-foreground">
                              🛞 {vehicle.tire_size}
                            </p>
                          )}
                        </div>
                        {selectedVehicleId === vehicle.id && (
                          <div className="p-1 rounded-full bg-primary">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                      {vehicle.is_default && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          {t.booking.defaultVehicle}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* Add Vehicle Card */}
                <Card
                  className="cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 border-dashed hover:border-primary/50"
                  onClick={() => setShowAddDialog(true)}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center h-full min-h-[100px] text-muted-foreground hover:text-primary transition-colors">
                    <Plus className="h-6 w-6 mb-1" />
                    <p className="text-sm font-medium">{t.booking.addVehicle}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Manual entry toggle */}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={handleManualMode}
              >
                {t.booking.enterManually}
              </Button>
            </div>
          )}

          {/* No vehicles state */}
          {vehicles.length === 0 && !manualMode && (
            <div className="text-center py-6 space-y-3">
              <Car className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">{t.booking.noVehicles}</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setShowAddDialog(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  {t.booking.addVehicle}
                </Button>
                <Button variant="outline" size="sm" onClick={handleManualMode}>
                  {t.booking.enterManually}
                </Button>
              </div>
            </div>
          )}

          {/* Manual entry or auto-filled fields */}
          {(manualMode || selectedVehicleId) && (
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
                  readOnly={!!selectedVehicleId}
                  className={selectedVehicleId ? "bg-muted cursor-default" : ""}
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
                  className={`uppercase ${selectedVehicleId ? "bg-muted cursor-default" : ""}`}
                  readOnly={!!selectedVehicleId}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Vehicle Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              {t.booking.addNewVehicle}
            </DialogTitle>
            <DialogDescription>{t.booking.addVehicleDesc}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.booking.vehicleBrand} *</Label>
                <Input
                  placeholder="Toyota, Honda..."
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.booking.vehicleModel} *</Label>
                <Input
                  placeholder="Avanza, Civic..."
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  maxLength={50}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.booking.vehicleYear}</Label>
                <Input
                  type="number"
                  placeholder="2024"
                  value={newYear}
                  onChange={(e) => setNewYear(e.target.value)}
                  min={1990}
                  max={new Date().getFullYear() + 1}
                />
              </div>
              <div className="space-y-2">
                <Label>{t.booking.vehiclePlate} *</Label>
                <Input
                  placeholder="B 1234 ABC"
                  value={newPlate}
                  onChange={(e) => setNewPlate(e.target.value.toUpperCase())}
                  maxLength={20}
                  className="uppercase"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t.booking.vehicleTransmission}</Label>
                <Select value={newTransmission} onValueChange={setNewTransmission}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.booking.selectOption} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="cvt">CVT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t.booking.vehicleFuelType}</Label>
                <Select value={newFuelType} onValueChange={setNewFuelType}>
                  <SelectTrigger>
                    <SelectValue placeholder={t.booking.selectOption} />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="gasoline">Bensin</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t.booking.vehicleTireSize}</Label>
              <Input
                placeholder="205/55 R16"
                value={newTireSize}
                onChange={(e) => setNewTireSize(e.target.value)}
                maxLength={30}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={saving}>
              {t.common.cancel}
            </Button>
            <Button onClick={handleAddVehicle} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  {t.common.loading}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  {t.booking.addVehicle}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VehicleSelector;
