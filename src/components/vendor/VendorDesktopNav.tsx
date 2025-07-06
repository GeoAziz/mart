import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sectionTitle?: string;
  subItems?: NavItem[];
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
              <div key={`section-${index}`} className={cn("px-3 py-2", !collapsed && "border-b border-border/50")}>
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
                "w-full justify-start gap-3 h-11",
                collapsed && "justify-center px-2"
              )}
            >
              <Link href={item.href}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
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
                  const isSubActive = pathname.startsWith(subItem.href);
                  
                  return (
                    <Tooltip key={subItem.href} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          asChild
                          variant={isSubActive ? "secondary" : "ghost"}
                          className="w-full justify-center px-2 h-9 mt-1"
                        >
                          <Link href={subItem.href}>
                            <SubIcon className="h-4 w-4" />
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
                    const isSubActive = pathname.startsWith(subItem.href);
                    
                    return (
                      <Button
                        key={subItem.href}
                        asChild
                        variant={isSubActive ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3 h-9 text-sm"
                      >
                        <Link href={subItem.href}>
                          <SubIcon className="h-4 w-4" />
                          <span>{subItem.label}</span>
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