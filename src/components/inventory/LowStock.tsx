'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Edit } from 'lucide-react';
import Image from 'next/image';
import type { Product } from '@/lib/types';
import Link from 'next/link';

interface LowStockProps {
  products: Product[];
}

export function LowStock({ products }: LowStockProps) {
  return (
    <Card className="bg-card border-border shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg font-headline flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
          Low Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {products.length > 0 ? (
            products.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 rounded-md overflow-hidden border border-border">
                    <Image
                      src={product.imageUrl || 'https://placehold.co/200x200/2563eb/ffffff?text=Product'}
                      alt={product.name}
                      width={48}
                      height={48}
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground flex items-center space-x-2">
                      <span>Stock: {product.stock}</span>
                      <Badge variant="destructive">Low Stock</Badge>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/vendor/products/edit/${product.id}`}>
                    <Edit className="h-4 w-4" />
                    <span className="sr-only">Edit product</span>
                  </Link>
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-6">
              <p className="text-muted-foreground">No low stock items.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}