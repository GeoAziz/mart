'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  type: 'sale' | 'inventory' | 'alert' | 'system';
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  timestamp: Date;
  read: boolean;
}

export const InstantNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const ws = new WebSocket(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        const newNotification: Notification = {
          id: data.id,
          type: data.notificationType,
          message: data.message,
          severity: data.severity,
          timestamp: new Date(data.timestamp),
          read: false
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50 notifications
        setUnreadCount(prev => prev + 1);
      }
    };

    return () => ws.close();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  };

  return (
    <Card className="w-full h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} new
              </Badge>
            )}
          </CardTitle>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm text-primary hover:text-primary/80"
            >
              Mark all as read
            </button>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.read ? 'bg-muted/50' : 'bg-muted border-primary'
                } relative`}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{notification.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge 
                    variant={
                      notification.severity === 'error' ? 'destructive' :
                      notification.severity === 'success' ? 'secondary' :
                      notification.severity === 'warning' ? 'outline' : 'secondary'
                    }
                  >
                    {notification.type}
                  </Badge>
                </div>
                {notification.read && (
                  <CheckCircle className="w-4 h-4 absolute top-2 right-2 text-primary" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
