'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export type VendorNotificationType =
  | 'order'
  | 'stock'
  | 'message'
  | 'payment'
  | 'sale'
  | 'inventory_alert';

export interface VendorNotification {
  id?: string;
  type: VendorNotificationType;
  title?: string;
  description?: string;
  message?: string;
  severity?: 'info' | 'success' | 'warning' | 'destructive';
  actionLabel?: string;
  actionUrl?: string;
  vendorId?: string;
  timestamp?: string;
}

export interface VendorNotificationMessage {
  type: string;
  payload: VendorNotification;
}

export interface VendorNotificationsResult {
  showNotification: (notification: VendorNotification) => void;
}

const DEFAULT_WS_URL = 'ws://localhost:3001';
const TOKEN_STORAGE_KEYS = ['firebase:idToken', 'zilacart_token', 'token'] as const;

function getWebSocketUrl(): string {
  return process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL;
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  for (const key of TOKEN_STORAGE_KEYS) {
    const token = window.localStorage.getItem(key);
    if (token) return token;
  }
  return null;
}

export function useVendorNotifications(vendorId: string | null): VendorNotificationsResult {
  const { toast } = useToast();
  const router = useRouter();

  const vendorIdRef = useRef<string | null>(vendorId);
  vendorIdRef.current = vendorId;

  const showNotification = useCallback(
    (notification: VendorNotification) => {
      if (!vendorIdRef.current) return;
      if (notification.vendorId && notification.vendorId !== vendorIdRef.current) return;

      const destructive =
        notification.severity === 'warning' || notification.severity === 'destructive';

      toast({
        title: notification.title ?? notification.message ?? 'New notification',
        description: notification.description,
        variant: destructive ? 'destructive' : undefined,
      });

      if (notification.actionUrl) {
        setTimeout(() => {
          router.push(notification.actionUrl!);
        }, 500);
      }
    },
    [toast, router]
  );

  useEffect(() => {
    if (!vendorId) return undefined;

    const token = getAuthToken();
    if (!token) {
      console.warn(
        '[useVendorNotifications] No auth token found in localStorage; skipping WebSocket connection.'
      );
      return undefined;
    }

    const baseUrl = getWebSocketUrl();
    const separator = baseUrl.includes('?') ? '&' : '?';
    const wsUrl = `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.info('[useVendorNotifications] WebSocket connected');
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as VendorNotificationMessage;
        if (message.type === 'notification') {
          showNotification(message.payload);
        }
      } catch (error) {
        console.error('[useVendorNotifications] Failed to parse WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('[useVendorNotifications] WebSocket error:', error);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [vendorId, showNotification]);

  return { showNotification };
}
