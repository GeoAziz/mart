'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { Bell, CheckCircle, AlertCircle, Info, ShoppingCart, Package, Star, MessageSquare } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import VendorPageShell from '@/components/vendor/VendorPageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order' | 'review' | 'system' | 'payment' | 'support';
  isRead: boolean;
  createdAt: any; // Firebase Timestamp
  data?: Record<string, any>;
}

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'order':
      return <ShoppingCart className="h-5 w-5" />;
    case 'review':
      return <Star className="h-5 w-5" />;
    case 'payment':
      return <CheckCircle className="h-5 w-5" />;
    case 'support':
      return <MessageSquare className="h-5 w-5" />;
    default:
      return <Info className="h-5 w-5" />;
  }
};

const getNotificationBadgeVariant = (type: Notification['type']) => {
  switch (type) {
    case 'order':
      return 'bg-blue-500/20 text-blue-300 border-blue-400';
    case 'review':
      return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
    case 'payment':
      return 'bg-green-500/20 text-green-300 border-green-400';
    case 'support':
      return 'bg-purple-500/20 text-purple-300 border-purple-400';
    default:
      return 'bg-muted/50 text-muted-foreground border-border';
  }
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendors/me/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch(`/api/vendors/me/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      setNotifications(prev =>
        prev.map(notification =>
          notification.id === notificationId
            ? { ...notification, isRead: true }
            : notification
        )
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUser) return;

    try {
      const token = await currentUser.getIdToken();
      const response = await fetch('/api/vendors/me/notifications/read-all', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      setNotifications(prev =>
        prev.map(notification => ({ ...notification, isRead: true }))
      );

      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <VendorPageShell>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex items-center justify-between space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-[300px]" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </VendorPageShell>
    );
  }

  return (
    <VendorPageShell>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
            <p className="text-muted-foreground">
              Stay updated with your store's activities
            </p>
          </div>
          {notifications.some(n => !n.isRead) && (
            <Button
              variant="outline"
              onClick={handleMarkAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-12rem)]">
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Bell className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-lg font-medium text-muted-foreground">
                    No notifications yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We'll notify you when something important happens
                  </p>
                </CardContent>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`transition-colors ${
                    !notification.isRead ? 'bg-muted/50' : ''
                  }`}
                >
                  <CardHeader className="flex flex-row items-center gap-4">
                    <div className={`rounded-full p-2 ${getNotificationBadgeVariant(notification.type)}`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{notification.title}</CardTitle>
                        <Badge variant="outline" className="ml-2">
                          {notification.type}
                        </Badge>
                      </div>
                      <CardDescription>
                        {format(notification.createdAt.toDate(), 'PPpp')}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    {!notification.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={() => handleMarkAsRead(notification.id)}
                      >
                        Mark as read
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </VendorPageShell>
  );
}
