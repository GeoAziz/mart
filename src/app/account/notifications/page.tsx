
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export default function NotificationsPage() {
  const { isSubscribed, subscribeToPush, unsubscribeFromPush, isLoading } = usePushNotifications();

  const handleToggleSubscription = () => {
    if (isSubscribed) {
      unsubscribeFromPush();
    } else {
      subscribeToPush();
    }
  };

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-glow-primary flex items-center">
          <Bell className="mr-3 h-6 w-6 text-primary" /> Notification Settings
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Manage how you receive updates about your orders and promotions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border">
          <div>
            <Label htmlFor="push-notifications" className="font-semibold text-lg text-foreground">
              Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive updates directly on your device, even when you're not on the site.
            </p>
          </div>
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleToggleSubscription}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-muted"
            />
          )}
        </div>
        
        <div className="p-4 border border-dashed border-border/50 rounded-lg text-muted-foreground text-sm">
          <h4 className="font-semibold text-foreground mb-2">What you'll get:</h4>
          <ul className="list-disc list-inside space-y-1">
            <li>Order status updates (shipped, delivered, etc.)</li>
            <li>Exclusive flash sale alerts</li>
            <li>Personalized product recommendations</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
