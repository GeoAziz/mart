
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

function urlB64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkSubscription = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          const currentSubscription = await registration.pushManager.getSubscription();
          if (currentSubscription) {
            setIsSubscribed(true);
            setSubscription(currentSubscription);
          }
        } catch (error) {
          console.error('Error checking for push subscription:', error);
        }
      }
      setIsLoading(false);
    };

    checkSubscription();
  }, []);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast({
        title: 'Unsupported Browser',
        description: 'Push notifications are not supported in this browser.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: 'Permission Denied',
          description: 'You have denied notification permissions. Please enable them in your browser settings.',
          variant: 'destructive',
        });
        return;
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.error('VAPID public key is not set in environment variables.');
        toast({
          title: 'Configuration Error',
          description: 'Push notification service is not configured correctly.',
          variant: 'destructive',
        });
        return;
      }

      const newSubscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidPublicKey),
      });
      
      console.log('New Push Subscription:', JSON.stringify(newSubscription));
      // In a real app, you would send this to your backend
      // await fetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(newSubscription), ... });
      
      setSubscription(newSubscription);
      setIsSubscribed(true);
      toast({
        title: 'Subscribed!',
        description: 'You will now receive push notifications.',
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast({
        title: 'Subscription Failed',
        description: 'Could not subscribe to notifications. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return;
    try {
      await subscription.unsubscribe();
      // In a real app, also notify your backend to delete the subscription
      // await fetch('/api/push/unsubscribe', { method: 'POST', ... });
      
      setSubscription(null);
      setIsSubscribed(false);
      toast({
        title: 'Unsubscribed',
        description: 'You will no longer receive push notifications.',
      });
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast({
        title: 'Unsubscription Failed',
        description: 'Could not unsubscribe. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return {
    isSubscribed,
    subscribeToPush,
    unsubscribeFromPush,
    isLoading,
  };
};
