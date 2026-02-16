'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Edit, Trash2, Tag, FolderTree } from 'lucide-react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkEdit?: () => void;
  onBulkDelete?: () => void;
  onBulkUpdatePrice?: () => void;
  onBulkChangeCategory?: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onClearSelection,
  onBulkEdit,
  onBulkDelete,
  onBulkUpdatePrice,
  onBulkChangeCategory,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <Card className="p-4 bg-primary/10 border-primary sticky top-16 z-10 shadow-lg">
      <CardContent className="p-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClearSelection}
              aria-label="Clear selection"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
            <span className="font-medium">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            {onBulkEdit && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onBulkEdit}
                className="gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            )}
            {onBulkUpdatePrice && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onBulkUpdatePrice}
                className="gap-2"
              >
                <Tag className="h-4 w-4" />
                Update Price
              </Button>
            )}
            {onBulkChangeCategory && (
              <Button
                size="sm"
                variant="secondary"
                onClick={onBulkChangeCategory}
                className="gap-2"
              >
                <FolderTree className="h-4 w-4" />
                Change Category
              </Button>
            )}
            {onBulkDelete && (
              <Button
                size="sm"
                variant="destructive"
                onClick={onBulkDelete}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
