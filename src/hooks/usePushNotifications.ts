import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface PushNotificationState {
  token: string | null;
  isRegistered: boolean;
  isSupported: boolean;
  error: string | null;
}

async function registerTokenWithBackend(token: string, platform: 'ios' | 'android' | 'web') {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No session, skipping token registration');
      return;
    }

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/register-push-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ token, platform }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('Failed to register token:', error);
    } else {
      console.log('Token registered successfully');
    }
  } catch (error) {
    console.error('Error registering token with backend:', error);
  }
}

/**
 * On iOS, `@capacitor/push-notifications` returns the raw APNs device token.
 * FCM HTTP v1 requires an FCM registration token, so we fetch it via the
 * `@capacitor-firebase/messaging` plugin (which bridges Firebase iOS SDK).
 * On Android the plugin's `register` already returns the FCM token, but we
 * still upgrade through Firebase for consistency / token refresh handling.
 */
async function resolveFcmToken(fallbackToken: string, platform: 'ios' | 'android'): Promise<string> {
  try {
    const mod = await import('@capacitor-firebase/messaging');
    const FirebaseMessaging = (mod as any).FirebaseMessaging;
    if (!FirebaseMessaging) return fallbackToken;
    const { token } = await FirebaseMessaging.getToken();
    return token || fallbackToken;
  } catch (e) {
    console.warn('[usePushNotifications] FirebaseMessaging.getToken failed, using fallback', e);
    return fallbackToken;
  }
}

export function usePushNotifications() {
  const [state, setState] = useState<PushNotificationState>({
    token: null,
    isRegistered: false,
    isSupported: Capacitor.isNativePlatform(),
    error: null,
  });
  const { toast } = useToast();

  const registerNotifications = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Push notifications only work on native platforms');
      return;
    }

    try {
      // Request permission
      const permStatus = await PushNotifications.requestPermissions();
      
      if (permStatus.receive === 'granted') {
        // Register with APNS/FCM
        await PushNotifications.register();
      } else {
        setState(prev => ({ 
          ...prev, 
          error: 'Push notification permission denied' 
        }));
        toast({
          variant: 'destructive',
          title: 'Permission Denied',
          description: 'Please enable push notifications in your device settings.',
        });
      }
    } catch (error) {
      console.error('Error registering push notifications:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Registration failed' 
      }));
    }
  }, [toast]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const platform = Capacitor.getPlatform() as 'ios' | 'android';

    // On registration success, get the token
    const registrationListener = PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      // Upgrade APNs/native token → FCM registration token so the backend
      // (which sends via FCM HTTP v1) can deliver to this device.
      const fcmToken = await resolveFcmToken(token.value, platform);
      setState(prev => ({
        ...prev,
        token: fcmToken,
        isRegistered: true,
        error: null,
      }));
      await registerTokenWithBackend(fcmToken, platform);
    });

    // On registration error
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
      setState(prev => ({
        ...prev,
        error: error.error,
        isRegistered: false,
      }));
    });

    // When a notification is received while app is in foreground
    const receivedListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        toast({
          title: notification.title || 'Notification',
          description: notification.body || '',
        });
      }
    );

    // When user taps on a notification
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        const data = action.notification.data || {};
        const route = data.route || data.path || '/';
        // Use SPA navigation via custom event (App listens & calls react-router navigate)
        window.dispatchEvent(new CustomEvent('push-navigate', { detail: { route } }));
      }
    );

    // Check current permission status
    PushNotifications.checkPermissions().then(status => {
      if (status.receive === 'granted') {
        registerNotifications();
      }
    });

    return () => {
      registrationListener.then(l => l.remove());
      errorListener.then(l => l.remove());
      receivedListener.then(l => l.remove());
      actionListener.then(l => l.remove());
    };
  }, [registerNotifications, toast]);

  return {
    ...state,
    registerNotifications,
  };
}
