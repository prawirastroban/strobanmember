import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Bell, BellOff } from 'lucide-react';

interface PushNotificationManagerProps {
  showButton?: boolean;
}

export default function PushNotificationManager({ showButton = false }: PushNotificationManagerProps) {
  const { isSupported, isRegistered, registerNotifications, error } = usePushNotifications();

  useEffect(() => {
    // Auto-register on native platforms
    if (isSupported && !isRegistered) {
      registerNotifications();
    }
  }, [isSupported, isRegistered, registerNotifications]);

  // Don't render anything on web
  if (!Capacitor.isNativePlatform()) {
    return null;
  }

  if (!showButton) {
    return null;
  }

  return (
    <Button
      variant={isRegistered ? 'outline' : 'default'}
      size="sm"
      onClick={registerNotifications}
      disabled={isRegistered}
      className="gap-2"
    >
      {isRegistered ? (
        <>
          <Bell className="h-4 w-4" />
          Notifications Enabled
        </>
      ) : (
        <>
          <BellOff className="h-4 w-4" />
          Enable Notifications
        </>
      )}
    </Button>
  );
}
