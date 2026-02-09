import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Clock, Wrench, Droplet, Car, Gauge, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);
  // Clear selected time if it's no longer available when date changes
  useEffect(() => {
    if (selectedTime && selectedDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      
      if (selected.getTime() === today.getTime()) {
        const now = new Date();
        const currentHour = now.getHours();
        const [time, period] = selectedTime.split(' ');
        const [hours] = time.split(':').map(Number);
        let hour24 = hours;
        if (period === 'PM' && hours !== 12) hour24 += 12;
        if (period === 'AM' && hours === 12) hour24 = 0;
        
        if (hour24 <= currentHour) {
          setSelectedTime(null);
        }
      }
    }
  }, [selectedDate]);

  const handleBooking = () => {
    if (!selectedService || !selectedDate || !selectedTime) {
      toast.error("Please complete all booking details");
      return;
    }
    setShowConfirmation(true);
  };

  const confirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime || !user) {
      toast.error("Missing booking information");
      return;
    }

    setIsSubmitting(true);

    // Parse service data
    const service = serviceTypes.find(s => s.id === selectedService);
    if (!service) {
      toast.error("Invalid service selected");
      setIsSubmitting(false);
      return;
    }

    // Parse duration to minutes
    const durationMatch = service.duration.match(/(\d+)/);
    const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;

    // Parse price
    const priceValue = parseFloat(service.price.replace('$', ''));

    // Get user profile for customer info
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', user.id)
      .maybeSingle();

    const { error } = await supabase.from('bookings').insert({
      user_id: user.id,
      customer_name: profile?.full_name || user.email?.split('@')[0] || 'Customer',
      customer_email: user.email || '',
      customer_phone: profile?.phone || '',
      service_type: selectedService,
      service_name: service.name,
      service_price: priceValue,
      service_duration: durationMinutes,
      booking_date: format(selectedDate, 'yyyy-MM-dd'),
      booking_time: selectedTime,
      status: 'pending',
    });

    setIsSubmitting(false);

    if (error) {
      console.error('Booking error:', error);
      toast.error("Failed to book appointment", {
        description: error.message,
      });
      return;
    }

    toast.success("Appointment booked successfully!", {
      description: "You'll receive a confirmation email shortly.",
    });
    setShowConfirmation(false);
    setTimeout(() => navigate("/"), 1500);
  };

  const selectedServiceData = serviceTypes.find((s) => s.id === selectedService);

  // Filter out past time slots if booking for today
  const getAvailableTimeSlots = () => {
    if (!selectedDate) return timeSlots;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    
    // If not today, show all slots
    if (selected.getTime() !== today.getTime()) return timeSlots;
    
    // Filter out past time slots for today
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinutes = now.getMinutes();
    
    return timeSlots.filter((slot) => {
      // Parse time slot (e.g., "09:00 AM" -> 9, "01:00 PM" -> 13)
      const [time, period] = slot.split(' ');
      const [hours] = time.split(':').map(Number);
      let hour24 = hours;
      if (period === 'PM' && hours !== 12) hour24 += 12;
      if (period === 'AM' && hours === 12) hour24 = 0;
      
      // Add 1 hour buffer for preparation
      return hour24 > currentHour || (hour24 === currentHour && currentMinutes < 30);
    });
  };

  const availableTimeSlots = getAvailableTimeSlots();

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
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today || date.getDay() === 0;
                  }}
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
                  <CardDescription className="flex items-center justify-between">
                    <span>Choose available time slot</span>
                    <Badge variant="outline" className="ml-2">
                      <Clock className="h-3 w-3 mr-1" />
                      Now: {format(currentTime, "h:mm a")}
                    </Badge>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {availableTimeSlots.length > 0 ? (
                    availableTimeSlots.map((time) => (
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
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No available time slots for today. Please select another date.
                    </p>
                  )}
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
            <Button variant="outline" onClick={() => setShowConfirmation(false)} disabled={isSubmitting}>
              Go Back
            </Button>
            <Button onClick={confirmBooking} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Booking...
                </>
              ) : (
                "Confirm Appointment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Booking;
