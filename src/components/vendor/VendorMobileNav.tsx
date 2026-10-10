import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NavItem } from './VendorDesktopNav';

interface VendorMobileNavProps {
  items: NavItem[];
  onItemClick: () => void;
}

export default function VendorMobileNav({ items, onItemClick }: VendorMobileNavProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        // Handle section titles
        if (item.sectionTitle && item.href === "#") {
          return (
            <div key={`section-${index}`} className="px-3 py-2 mt-4 border-b border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {item.sectionTitle}
              </h3>
            </div>
          );
        }

        const Icon = item.icon;
        const isActive = pathname === item.href || (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href)));
        
        return (
          <div key={item.href} className="space-y-1">
            <Button
              asChild
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 h-11"
              onClick={onItemClick}
            >
              <Link href={item.href}>
                <Icon className="h-5 w-5" />
                <span className="font-medium flex-1 text-left">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                    {item.badge}
                  </span>
                )}
              </Link>
            </Button>
            
            {/* Show sub-items */}
            {item.subItems && (
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
                      onClick={onItemClick}
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
  );
}