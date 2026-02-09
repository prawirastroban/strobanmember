import { useEffect, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useToast } from '@/hooks/use-toast';

export interface PushNotificationState {
  token: string | null;
  isRegistered: boolean;
  isSupported: boolean;
  error: string | null;
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

    // On registration success, get the token
    const registrationListener = PushNotifications.addListener('registration', (token: Token) => {
      console.log('Push registration success, token:', token.value);
      setState(prev => ({
        ...prev,
        token: token.value,
        isRegistered: true,
        error: null,
      }));
      
      // TODO: Send token to your backend to store for sending notifications
      // You can call an edge function here to save the token
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
        // Handle navigation or other actions based on notification data
        const data = action.notification.data;
        if (data?.route) {
          // Navigate to the specified route
          window.location.href = data.route;
        }
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
