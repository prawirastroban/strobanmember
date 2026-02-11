import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { User, Phone, Mail, CreditCard, Save, Loader2 } from "lucide-react";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [customerId, setCustomerId] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, phone, customer_id")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setCustomerId(data.customer_id || "");
      }
      if (error) console.error("Error fetching profile:", error);
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName) {
      toast({ title: "Name is required", variant: "destructive" });
      setSaving(false);
      return;
    }
    if (trimmedName.length > 100) {
      toast({ title: "Name must be less than 100 characters", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: trimmedName, phone: trimmedPhone || null })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Failed to update profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated successfully" });
    }
    setSaving(false);
  };

  const getInitials = () => {
    if (fullName) {
      return fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "U";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle>{fullName || "Member"}</CardTitle>
              <CardDescription>{user?.email}</CardDescription>
              {customerId && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <CreditCard className="h-3 w-3" />
                  {customerId}
                </p>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </Label>
              <Input id="email" value={user?.email || ""} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">Email cannot be changed here</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Full Name
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone Number
              </Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 08123456789"
                maxLength={20}
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
