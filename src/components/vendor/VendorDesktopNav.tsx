import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sectionTitle?: string;
  subItems?: NavItem[];
  badge?: number;
}

interface VendorDesktopNavProps {
  items: NavItem[];
  collapsed: boolean;
}

export default function VendorDesktopNav({ items, collapsed }: VendorDesktopNavProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <div className="space-y-1">
        {items.map((item, index) => {
          // Handle section titles
          if (item.sectionTitle && item.href === "#") {
            return (
              <div key={`section-${index}`} className={cn("px-3 py-2 mt-4", !collapsed && "border-b border-border/50")}>
                {!collapsed && (
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {item.sectionTitle}
                  </h3>
                )}
              </div>
            );
          }

          const Icon = item.icon;
          const isActive = pathname === item.href || (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href)));
          
          const navButton = (
            <Button
              asChild
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11 relative",
                collapsed && "justify-center px-2"
              )}
            >
              <Link href={item.href}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium flex-1 text-left">{item.label}</span>}
                {!collapsed && item.badge && item.badge > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold ml-auto">
                    {item.badge}
                  </span>
                )}
                {collapsed && item.badge && item.badge > 0 && (
                  <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-primary" />
                )}
              </Link>
            </Button>
          );

          if (collapsed) {
            return (
              <div key={item.href}>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    {navButton}
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Show sub-items as additional tooltips when collapsed */}
                {item.subItems && item.subItems.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                  
                  return (
                    <Tooltip key={subItem.href} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant={isSubActive ? "secondary" : "ghost"}
                          className="w-full justify-center px-2 h-9 mt-1 relative"
                        >
                          <Link href={subItem.href}>
                            <SubIcon className="h-4 w-4" />
                            {subItem.badge && subItem.badge > 0 && (
                              <span className="absolute top-0.5 right-0.5 h-2 w-2 rounded-full bg-primary" />
                            )}
                          </Link>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{subItem.label}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            );
          }

          return (
            <div key={item.href} className="space-y-1">
              {navButton}
              
              {/* Show sub-items when expanded */}
              {item.subItems && !collapsed && (
                <div className="ml-4 space-y-1">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                    
                    return (
                      <Button
                        key={subItem.href}
                        asChild
                        variant={isSubActive ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3 h-9 text-sm"
                      >
                        <Link href={subItem.href}>
                          <SubIcon className="h-4 w-4" />
                          <span className="flex-1 text-left">{subItem.label}</span>
                          {subItem.badge && subItem.badge > 0 && (
                            <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-semibold ml-auto">
                              {subItem.badge}
                            </span>
                          )}
                        </Link>
                      </Button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}