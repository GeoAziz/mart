'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PackageCheck, Loader2, ArrowUpDown } from 'lucide-react';
import type { InventoryHistory as InventoryHistoryType } from '@/lib/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface InventoryHistoryProps {
  vendorId: string;
}

export function InventoryHistory({ vendorId }: InventoryHistoryProps) {
  const [history, setHistory] = useState<InventoryHistoryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentUser || !vendorId) return;
      
      try {
        const token = await currentUser.getIdToken();
        const response = await fetch('/api/vendors/me/inventory/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to fetch inventory history');
        
        const data = await response.json();
        setHistory(data);
      } catch (error) {
        console.error('Error fetching inventory history:', error);
        toast({
          title: 'Error',
          description: 'Failed to load inventory history',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser, vendorId, toast]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case 'increase':
        return 'text-green-500';
      case 'decrease':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-headline">Stock History</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center items-center h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-headline flex items-center">
          <PackageCheck className="h-5 w-5 mr-2 text-primary" />
          Stock History
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {history.length > 0 ? (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-4 p-3 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{entry.productName}</span>
                      <span className={`font-medium ${getChangeTypeColor(entry.changeType)}`}>
                        {entry.changeType === 'increase' ? '+' : '-'}
                        {Math.abs(entry.newStock - entry.previousStock)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{entry.reason}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        Stock: {entry.previousStock} → {entry.newStock}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(entry.updatedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No stock changes recorded yet.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}