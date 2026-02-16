'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash2, MoreVertical, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  status: 'active' | 'draft' | 'archived';
  imageUrl?: string;
  category?: string;
}

interface ProductMobileCardProps {
  product: Product;
  selected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onView?: (id: string) => void;
}

export function ProductMobileCard({
  product,
  selected = false,
  onSelect,
  onEdit,
  onDelete,
  onView,
}: ProductMobileCardProps) {
  const formatCurrency = (amount: number) => {
    return `KSh ${amount.toLocaleString()}`;
  };

  const getStatusVariant = (status: Product['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'draft':
        return 'warning';
      case 'archived':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getLowStockWarning = (stock: number) => {
    if (stock === 0) return 'destructive';
    if (stock < 5) return 'warning';
    return null;
  };

  const stockWarning = getLowStockWarning(product.stock);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Selection Checkbox */}
          {onSelect && (
            <div className="flex items-start pt-1">
              <Checkbox
                checked={selected}
                onCheckedChange={(checked) => onSelect(product.id, checked as boolean)}
                aria-label={`Select ${product.name}`}
              />
            </div>
          )}

          {/* Product Image */}
          <div className="relative h-20 w-20 shrink-0 rounded-md overflow-hidden bg-muted">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                No Image
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <h3 className="font-medium text-sm line-clamp-2 leading-tight">
              {product.name}
            </h3>
            {product.category && (
              <p className="text-xs text-muted-foreground">{product.category}</p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm">{formatCurrency(product.price)}</span>
              <Badge variant={getStatusVariant(product.status)} className="text-xs">
                {product.status}
              </Badge>
              {stockWarning && (
                <Badge variant={stockWarning} className="text-xs">
                  {product.stock === 0 ? 'Out of Stock' : `${product.stock} left`}
                </Badge>
              )}
              {!stockWarning && product.stock > 0 && (
                <span className="text-xs text-muted-foreground">
                  Stock: {product.stock}
                </span>
              )}
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                aria-label="Product actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(product.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(product.id)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(product.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
