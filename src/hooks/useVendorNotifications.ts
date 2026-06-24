'use client';

import { useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface NotificationEvent {
  type: 'order' | 'stock' | 'message' | 'payment';
  title: string;
  description: string;
  actionLabel?: string;
  actionUrl?: string;
}

export function useVendorNotifications(vendorId: string | null) {
  const { toast } = useToast();
  const router = useRouter();

  const showNotification = useCallback((event: NotificationEvent) => {
    toast({
      title: event.title,
      description: event.description,
    });
    if (event.actionUrl) {
      setTimeout(() => {
        router.push(event.actionUrl!);
      }, 500);
    }
  }, [toast, router]);

  useEffect(() => {
    if (!vendorId) return;
    return () => {};
  }, [vendorId, showNotification]);

  return { showNotification };
}
