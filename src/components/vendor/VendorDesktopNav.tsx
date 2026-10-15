import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface NavShortcut {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefixes?: string[];
  badge?: number;
}

export interface NavItem extends NavShortcut {
  sectionTitle?: string;
  subItems?: NavItem[];
}

interface VendorDesktopNavProps {
  items: NavShortcut[];
}

export default function VendorDesktopNav({ items }: VendorDesktopNavProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={50}>
      <div className="flex flex-col items-center gap-2.5 py-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.matchPrefixes && item.matchPrefixes.some((p) => pathname.startsWith(p)));

          return (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "relative flex items-center justify-center h-12 w-12 rounded-2xl transition-all duration-200 group touch-manipulation",
                    isActive
                      ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/35 scale-105"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/90 border border-transparent hover:border-border/60"
                  )}
                  aria-label={item.label}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 transition-transform group-hover:scale-110",
                      isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"
                    )}
                  />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center border-2 border-background shadow-sm">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                sideOffset={14}
                className="rounded-xl px-3 py-1.5 text-xs font-semibold bg-card/95 border border-border shadow-xl backdrop-blur-md"
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}