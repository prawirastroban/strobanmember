import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Booking {
  id: string;
  user_id: string;
  customer_name: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
  reminder_sent: boolean;
}

interface PushToken {
  token: string;
  platform: string;
  user_id: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to access all data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get bookings for the next 24 hours that haven't received reminders
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    const todayStr = now.toISOString().split("T")[0];
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .in("booking_date", [todayStr, tomorrowStr])
      .eq("reminder_sent", false)
      .eq("status", "pending");

    if (bookingsError) {
      console.error("Error fetching bookings:", bookingsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch bookings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bookings || bookings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No reminders to send", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${bookings.length} bookings needing reminders`);

    // Get unique user IDs from bookings
    const userIds = [...new Set(bookings.map((b: Booking) => b.user_id))];

    // Fetch push tokens for these users
    const { data: tokens, error: tokensError } = await supabase
      .from("push_tokens")
      .select("*")
      .in("user_id", userIds);

    if (tokensError) {
      console.error("Error fetching tokens:", tokensError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch tokens" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: "No push tokens found for users", sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group tokens by user_id
    const tokensByUser = tokens.reduce((acc: Record<string, PushToken[]>, token: PushToken) => {
      if (!acc[token.user_id]) acc[token.user_id] = [];
      acc[token.user_id].push(token);
      return acc;
    }, {});

    const notificationsSent: string[] = [];
    const notificationPayloads: Array<{ booking: Booking; tokens: PushToken[] }> = [];

    // Prepare notifications for each booking
    for (const booking of bookings as Booking[]) {
      const userTokens = tokensByUser[booking.user_id];
      if (!userTokens || userTokens.length === 0) continue;

      notificationPayloads.push({ booking, tokens: userTokens });
      notificationsSent.push(booking.id);
    }

    // Log the notifications that would be sent
    // In production, you would integrate with FCM/APNs here
    for (const payload of notificationPayloads) {
      const { booking, tokens: userTokens } = payload;
      const isToday = booking.booking_date === todayStr;
      
      console.log(`Sending reminder for booking ${booking.id}:`);
      console.log(`  Service: ${booking.service_name}`);
      console.log(`  Date: ${booking.booking_date} at ${booking.booking_time}`);
      console.log(`  Customer: ${booking.customer_name}`);
      console.log(`  Tokens: ${userTokens.length} devices`);
      
      // Notification payload that would be sent to FCM/APNs
      const notificationData = {
        title: isToday ? "Service Reminder - Today!" : "Service Reminder - Tomorrow",
        body: `Your ${booking.service_name} is scheduled for ${booking.booking_time}${isToday ? " today" : " tomorrow"}`,
        data: {
          type: "service_reminder",
          bookingId: booking.id,
          route: "/booking",
        },
      };
      
      console.log("  Notification:", JSON.stringify(notificationData));
      
      // TODO: Integrate with Firebase Cloud Messaging or Apple Push Notification Service
      // For FCM:
      // await fetch('https://fcm.googleapis.com/fcm/send', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `key=${FCM_SERVER_KEY}`,
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({
      //     registration_ids: userTokens.map(t => t.token),
      //     notification: notificationData,
      //   }),
      // });
    }

    // Mark reminders as sent
    if (notificationsSent.length > 0) {
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ reminder_sent: true })
        .in("id", notificationsSent);

      if (updateError) {
        console.error("Error updating reminder_sent:", updateError);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Processed ${notificationsSent.length} reminders`,
        sent: notificationsSent.length,
        bookingIds: notificationsSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
