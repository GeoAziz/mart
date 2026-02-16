'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, ShoppingBag, DollarSign, MessageSquare, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
  id: string;
  type: 'order' | 'product' | 'payment' | 'message' | 'review';
  title: string;
  description: string;
  timestamp: Date | string;
  status?: 'success' | 'warning' | 'info' | 'pending';
}

interface RecentActivityFeedProps {
  activities?: Activity[];
  maxHeight?: string;
}

const activityIcons = {
  order: ShoppingBag,
  product: Package,
  payment: DollarSign,
  message: MessageSquare,
  review: Star,
};

export function RecentActivityFeed({ 
  activities = [],
  maxHeight = '400px'
}: RecentActivityFeedProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest store activities</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-12">
          <p className="text-sm text-muted-foreground">No recent activity</p>
        </CardContent>
      </Card>
    );
  }

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Your latest store activities</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className={`pr-4`} style={{ maxHeight }}>
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = activityIcons[activity.type];
              return (
                <div key={activity.id} className="flex items-start gap-3 pb-4 last:pb-0 border-b last:border-0">
                  <div className={cn(
                    'rounded-full p-2 mt-1',
                    activity.type === 'order' && 'bg-blue-500/10',
                    activity.type === 'product' && 'bg-purple-500/10',
                    activity.type === 'payment' && 'bg-green-500/10',
                    activity.type === 'message' && 'bg-orange-500/10',
                    activity.type === 'review' && 'bg-yellow-500/10'
                  )}>
                    <Icon className={cn(
                      'h-4 w-4',
                      activity.type === 'order' && 'text-blue-500',
                      activity.type === 'product' && 'text-purple-500',
                      activity.type === 'payment' && 'text-green-500',
                      activity.type === 'message' && 'text-orange-500',
                      activity.type === 'review' && 'text-yellow-500'
                    )} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-none">{activity.title}</p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatTimestamp(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                    {activity.status && (
                      <Badge variant={activity.status} className="text-xs">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
