import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Clock, Wrench, Droplet, Car, Gauge } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const serviceTypes = [
  {
    id: "oil-change",
    name: "Oil Change",
    duration: "30 min",
    price: "$49.99",
    icon: Droplet,
    description: "Full synthetic oil change with filter replacement",
  },
  {
    id: "tire-rotation",
    name: "Tire Rotation",
    duration: "45 min",
    price: "$39.99",
    icon: Car,
    description: "Complete tire rotation and pressure check",
  },
  {
    id: "brake-inspection",
    name: "Brake Inspection",
    duration: "60 min",
    price: "$79.99",
    icon: Gauge,
    description: "Full brake system inspection and report",
  },
  {
    id: "full-service",
    name: "Full Service",
    duration: "90 min",
    price: "$149.99",
    icon: Wrench,
    description: "Comprehensive vehicle inspection and maintenance",
  },
];

const timeSlots = [
  "09:00 AM",
  "10:00 AM",
  "11:00 AM",
  "01:00 PM",
  "02:00 PM",
  "03:00 PM",
  "04:00 PM",
];

const Booking = () => {
  const navigate = useNavigate();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleBooking = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("Please complete all booking details");
      return;
    }
    setShowConfirmation(true);
  };

  const confirmBooking = () => {
    toast.success("Appointment booked successfully!", {
      description: "You'll receive a confirmation email shortly.",
    });
    setShowConfirmation(false);
    setTimeout(() => navigate("/"), 1500);
  };

  const selectedServiceData = serviceTypes.find((s) => s.id === selectedService);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Schedule Service</h1>
          <p className="text-muted-foreground">
            Choose your service, pick a date, and select a time slot
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step 1: Service Selection */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        1
                      </div>
                      Select Service Type
                    </CardTitle>
                    <CardDescription>Choose the service you need</CardDescription>
                  </div>
                  {selectedService && (
                    <Badge variant="default" className="bg-accent">
                      <Check className="h-3 w-3 mr-1" />
                      Selected
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {serviceTypes.map((service) => {
                    const Icon = service.icon;
                    return (
                      <Card
                        key={service.id}
                        className={`cursor-pointer transition-all hover:shadow-md ${
                          selectedService === service.id
                            ? "ring-2 ring-primary bg-primary/5"
                            : ""
                        }`}
                        onClick={() => setSelectedService(service.id)}
                      >
                        <CardContent className="p-6">
                          <div className="flex flex-col items-center text-center space-y-3">
                            <div className="p-3 rounded-full bg-primary/10">
                              <Icon className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-semibold">{service.name}</h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                {service.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-sm pt-2 border-t w-full justify-center">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{service.duration}</span>
                              </div>
                              <span className="font-semibold text-primary">
                                {service.price}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Step 2: Date Selection */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                        2
                      </div>
                      Choose Date
                    </CardTitle>
                    <CardDescription>Select your preferred date</CardDescription>
                  </div>
                  {selectedDate && (
                    <Badge variant="default" className="bg-accent">
                      <Check className="h-3 w-3 mr-1" />
                      {format(selectedDate, "MMM dd, yyyy")}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date() || date.getDay() === 0}
                  className="rounded-md border pointer-events-auto"
                />
              </CardContent>
            </Card>
          </div>

          {/* Step 3: Time Selection */}
          <div className="lg:col-span-1">
            <Card className="shadow-lg">
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                      3
                    </div>
                    Pick Time
                  </CardTitle>
                  <CardDescription>Choose available time slot</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {timeSlots.map((time) => (
                    <Button
                      key={time}
                      variant={selectedTime === time ? "default" : "outline"}
                      className={`w-full justify-start ${
                        selectedTime === time ? "bg-primary" : ""
                      }`}
                      onClick={() => setSelectedTime(time)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      {time}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Summary */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Service</p>
                    <p className="font-semibold">
                      {selectedServiceData?.name || "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Date</p>
                    <p className="font-semibold">
                      {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Time</p>
                    <p className="font-semibold">{selectedTime || "Not selected"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Price</p>
                    <p className="font-semibold text-primary">
                      {selectedServiceData?.price || "--"}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full mt-6"
                  onClick={handleBooking}
                  disabled={!selectedService || !selectedDate || !selectedTime}
                >
                  Confirm Booking
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Appointment</DialogTitle>
            <DialogDescription>
              Please review your booking details before confirming
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3 p-4 bg-muted rounded-lg">
              {selectedServiceData && (
                <>
                  <div className="p-2 rounded-full bg-primary/10">
                    <selectedServiceData.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{selectedServiceData.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedServiceData.description}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-sm">
                      <span className="text-muted-foreground">
                        Duration: {selectedServiceData.duration}
                      </span>
                      <span className="font-semibold text-primary">
                        {selectedServiceData.price}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Date</p>
                <p className="font-semibold">
                  {selectedDate ? format(selectedDate, "EEEE, MMM dd, yyyy") : ""}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Time</p>
                <p className="font-semibold">{selectedTime}</p>
              </div>
            </div>
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <p className="text-sm font-semibold text-accent mb-1">
                +100 Loyalty Points
              </p>
              <p className="text-xs text-muted-foreground">
                You'll earn points with this service
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Go Back
            </Button>
            <Button onClick={confirmBooking}>
              Confirm Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Booking;
