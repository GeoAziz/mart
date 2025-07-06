'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import type { Product } from '@/lib/types';

interface StockUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  onUpdate: () => void;
}

export function StockUpdateModal({ isOpen, onClose, product, onUpdate }: StockUpdateModalProps) {
  const [newStock, setNewStock] = useState<number>(product.stock || 0);
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(`/api/vendor/me/inventory`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          newStock,
          reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update stock');
      }

      toast({
        title: 'Stock Updated',
        description: `${product.name} stock level has been updated to ${newStock}`,
      });

      onUpdate();
      onClose();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update stock',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl font-headline text-glow-primary">Update Stock Level</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update the stock quantity for {product.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="current-stock">Current Stock</Label>
            <Input
              id="current-stock"
              value={product.stock || 0}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-stock">New Stock Level</Label>
            <Input
              id="new-stock"
              type="number"
              min="0"
              value={newStock}
              onChange={(e) => setNewStock(parseInt(e.target.value))}
              className="bg-input border-primary focus:ring-accent"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Update (Optional)</Label>
            <Textarea
              id="reason"
              placeholder="e.g., New shipment received, Stock count adjustment..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="bg-input border-primary focus:ring-accent"
            />
          </div>

          <DialogFooter className="sm:justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || newStock === product.stock}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Stock'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}