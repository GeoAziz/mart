'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package, Download, MessageSquare, ShoppingBag, FileText } from 'lucide-react';

export function QuickActionsPanel() {
  const actions = [
    {
      icon: PlusCircle,
      label: 'Add Product',
      href: '/vendor/products/add',
      variant: 'default' as const,
    },
    {
      icon: ShoppingBag,
      label: 'Process Orders',
      href: '/vendor/orders',
      variant: 'outline' as const,
    },
    {
      icon: Download,
      label: 'Export Report',
      href: '/vendor/reports',
      variant: 'outline' as const,
    },
    {
      icon: MessageSquare,
      label: 'Messages',
      href: '/messaging',
      variant: 'outline' as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((action) => (
          <Button
            key={action.href}
            asChild
            variant={action.variant}
            className="h-24 flex-col gap-2"
          >
            <Link href={action.href}>
              <action.icon className="h-6 w-6" />
              <span className="text-sm">{action.label}</span>
            </Link>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
