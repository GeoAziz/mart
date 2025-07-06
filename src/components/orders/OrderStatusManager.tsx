import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Loader2, ChevronDown } from 'lucide-react';
import type { Order, OrderStatus } from '@/lib/types';

interface OrderStatusManagerProps {
  orderId: string;
  currentStatus: OrderStatus;
  allowedTransitions: OrderStatus[];
  onUpdateStatus: (orderId: string, newStatus: OrderStatus) => Promise<void>;
  isLoading?: boolean;
}

export function OrderStatusManager({
  orderId,
  currentStatus,
  allowedTransitions,
  onUpdateStatus,
  isLoading = false,
}: OrderStatusManagerProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    setIsUpdating(true);
    try {
      await onUpdateStatus(orderId, newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-400';
      case 'processing':
        return 'bg-blue-500/20 text-blue-300 border-blue-400';
      case 'shipped':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-400';
      case 'out_for_delivery':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-400';
      case 'delivered':
        return 'bg-green-500/20 text-green-300 border-green-400';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300 border-red-400';
      case 'refunded':
      case 'partially_refunded':
        return 'bg-purple-500/20 text-purple-300 border-purple-400';
      default:
        return 'bg-muted/50 text-muted-foreground border-border';
    }
  };

  const formatStatus = (status: OrderStatus) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant="outline"
        className={`${getStatusColor(currentStatus)} px-2 py-1`}
      >
        {formatStatus(currentStatus)}
      </Badge>
      
      {allowedTransitions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isLoading || isUpdating}
              className="ml-2"
            >
              {isUpdating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Update Status <ChevronDown className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-primary">
            {allowedTransitions.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => handleStatusUpdate(status)}
                className={`cursor-pointer ${
                  status === 'cancelled' || status === 'refunded'
                    ? 'text-destructive hover:text-destructive'
                    : ''
                }`}
              >
                <span className={getStatusColor(status)}>
                  {formatStatus(status)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}