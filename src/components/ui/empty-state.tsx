import { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline' | 'ghost';
  };
  className?: string;
}

export function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      {Icon && (
        <Icon className="h-16 w-16 md:h-20 md:w-20 text-muted-foreground/40 mb-4" />
      )}
      <h3 className="text-xl md:text-2xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
      )}
      {action && (
        <Button 
          variant={action.variant || 'outline'}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
