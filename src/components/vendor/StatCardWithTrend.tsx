'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardWithTrendProps {
  title: string;
  value: string | number;
  trend?: number; // +12 means 12% increase, -5 means 5% decrease
  icon: LucideIcon;
  urgent?: boolean;
  warning?: boolean;
  className?: string;
}

export function StatCardWithTrend({
  title,
  value,
  trend,
  icon: Icon,
  urgent = false,
  warning = false,
  className = ''
}: StatCardWithTrendProps) {
  const getTrendIcon = () => {
    if (!trend || trend === 0) return Minus;
    return trend > 0 ? ArrowUp : ArrowDown;
  };

  const getTrendColor = () => {
    if (!trend || trend === 0) return 'text-muted-foreground';
    return trend > 0 ? 'text-green-500' : 'text-red-500';
  };

  const TrendIcon = getTrendIcon();

  return (
    <Card className={cn(
      'transition-shadow hover:shadow-lg',
      urgent && 'border-red-500/50 bg-red-500/5',
      warning && 'border-yellow-500/50 bg-yellow-500/5',
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn(
          'h-4 w-4',
          urgent ? 'text-red-500' : warning ? 'text-yellow-500' : 'text-muted-foreground'
        )} />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold">{value}</div>
          {trend !== undefined && (
            <div className={cn(
              'flex items-center text-xs font-medium',
              getTrendColor()
            )}>
              <TrendIcon className="h-3 w-3 mr-1" />
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
