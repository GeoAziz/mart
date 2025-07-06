import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, Truck, CheckCircle, ShoppingBag, Edit, Send } from 'lucide-react';
import type { OrderTracking, OrderStatus } from '@/lib/types';

interface OrderTimelineProps {
  statusHistory: OrderTracking[];
  currentStatus: OrderStatus;
}

export function OrderTimeline({ statusHistory, currentStatus }: OrderTimelineProps) {
  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return ShoppingBag;
      case 'processing':
        return Edit;
      case 'shipped':
        return Send;
      case 'out_for_delivery':
        return Truck;
      case 'delivered':
        return CheckCircle;
      default:
        return Package;
    }
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date));
  };

  const sortedHistory = [...statusHistory].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-headline text-glow-primary flex items-center">
          <Package className="mr-2 h-5 w-5 text-primary" /> Order Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-8">
          {sortedHistory.map((event, index) => {
            const StatusIcon = getStatusIcon(event.status);
            const isCurrent = event.status === currentStatus;
            
            return (
              <div key={index} className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 
                      ${
                        isCurrent
                          ? 'border-primary bg-primary/20 text-primary animate-pulse'
                          : index === 0
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted-foreground/50 text-muted-foreground'
                      }`}
                  >
                    <StatusIcon className="h-5 w-5" />
                  </div>
                  {index < sortedHistory.length - 1 && (
                    <div
                      className={`w-0.5 h-12 mt-1 ${
                        index === 0
                          ? 'bg-primary/50'
                          : 'bg-muted-foreground/20'
                      }`}
                    />
                  )}
                </div>
                <div className="flex-grow">
                  <p className={`font-medium ${
                    isCurrent ? 'text-primary' : 'text-foreground'
                  }`}>
                    {event.status.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateTime(new Date(event.timestamp))}
                  </p>
                  {event.note && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {event.note}
                    </p>
                  )}
                  {event.location && (
                    <p className="text-xs text-accent mt-1">
                      📍 {event.location}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}