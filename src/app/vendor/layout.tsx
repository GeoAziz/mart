'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Menu, ChevronLeft, ChevronRight, Home, BarChart3, ShoppingBag, Inbox, DollarSign, Star, Settings, Package, MessageCircle, Users, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
// ParticleBackground is rendered globally in root layout

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

// Simplified 2-level navigation structure (no nested subItems)
const vendorNavItems: NavItem[] = [
  { href: "/vendor", label: "Dashboard", icon: Home },
  { href: "/vendor/products", label: "Products", icon: Package },
  { href: "/vendor/orders", label: "Orders", icon: ShoppingBag },
  { href: "/vendor/earnings", label: "Finance", icon: DollarSign },
  { href: "/messaging", label: "Customers", icon: Users },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/vendor/settings", label: "Settings", icon: Settings },
];

interface VendorDesktopNavProps {
  items: NavItem[];
  collapsed: boolean;
}

function VendorDesktopNav({ items, collapsed }: VendorDesktopNavProps) {
  const pathname = usePathname();

  return (
    <TooltipProvider>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          
          const navButton = (
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                collapsed && "justify-center px-2"
              )}
              asChild
            >
              <Link href={item.href}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span className="font-medium">{item.label}</span>}
                {!collapsed && item.badge && item.badge > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
                    {item.badge}
                  </span>
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
                  <TooltipContent side="right" className="bg-popover border-border">
                    <p className="font-medium">{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          }

          return (
            <div key={item.href}>
              {navButton}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

interface VendorMobileNavProps {
  items: NavItem[];
  onItemClick: () => void;
}

function VendorMobileNav({ items, onItemClick }: VendorMobileNavProps) {
  const pathname = usePathname();

  return (
    <div className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
        
        return (
          <Button
            key={item.href}
            variant={isActive ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 h-11"
            asChild
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
        );
      })}
    </div>
  );
}

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <RouteGuard allowedRoles={['vendor', 'admin']}>
      <div className="min-h-screen bg-background">
        {/* DESKTOP LAYOUT - Persistent + Collapsible */}
        <div className="hidden lg:flex">
          {/* Desktop Sidebar - Fixed Position */}
          <aside className={cn(
            "fixed inset-y-0 left-0 z-30 bg-card border-r border-border transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "w-16" : "w-64"
          )}>
            <div className="flex h-full flex-col">
              {/* Header with collapse button */}
              <div className="flex items-center justify-between p-4 border-b border-border min-h-[4rem]">
                {!sidebarCollapsed && (
                  <h1 className="text-lg font-semibold text-glow-primary">Vendor Dashboard</h1>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={cn("h-8 w-8 shrink-0 micro-interaction tap-feedback", sidebarCollapsed && "mx-auto")}
                >
                  {sidebarCollapsed ? <ChevronRight className="h-4 w-4 animate-pulse-glow" /> : <ChevronLeft className="h-4 w-4 animate-pulse-glow" />}
                  <span className="sr-only">{sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</span>
                </Button>
              </div>
              {/* Navigation */}
              <nav className="flex-1 p-2 overflow-y-auto">
                <VendorDesktopNav items={vendorNavItems} collapsed={sidebarCollapsed} />
              </nav>
            </div>
          </aside>
          {/* Main Content - Dynamic margin based on sidebar state */}
          <main className={cn(
            "flex-1 transition-all duration-300 ease-in-out grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
            sidebarCollapsed ? "ml-16" : "ml-64"
          )}>
            <div className="p-6 col-span-full">
              {children}
            </div>
          </main>
        </div>
        {/* MOBILE LAYOUT - Overlay Sheet */}
        <div className="lg:hidden">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 bg-background border-b border-border">
            <div className="flex items-center gap-4 p-4 h-16">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu" className="shrink-0 tap-feedback">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <div className="p-4 border-b border-border">
                    <h1 className="text-lg font-semibold text-glow-primary">Vendor Dashboard</h1>
                  </div>
                  <nav className="p-2">
                    <VendorMobileNav items={vendorNavItems} onItemClick={() => setMobileOpen(false)} />
                  </nav>
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold text-glow-primary">Vendor Dashboard</h1>
            </div>
          </header>
          {/* Mobile Main Content */}
          <main>
            <div className="p-4 pb-20">
              {children}
            </div>
          </main>
          
          {/* Mobile Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur border-t border-border">
            <div className="grid grid-cols-5 gap-1 p-2">
              {/* Priority items: Dashboard, Orders, Products, Customers */}
              {[
                vendorNavItems[0], // Dashboard
                vendorNavItems[2], // Orders
                vendorNavItems[1], // Products
                vendorNavItems[4], // Customers
              ].map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors touch-target relative",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-xs truncate w-full text-center">
                      {item.label}
                    </span>
                    {item.badge && item.badge > 0 && (
                      <span className="absolute top-1 right-2 bg-primary text-primary-foreground rounded-full h-4 w-4 flex items-center justify-center text-[10px] font-semibold">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
              
              {/* More button - opens sidebar */}
              <button
                onClick={() => setMobileOpen(true)}
                className="flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground hover:bg-accent touch-target"
                aria-label="Open menu"
              >
                <MoreHorizontal className="h-5 w-5 mb-1" />
                <span className="text-xs">More</span>
              </button>
            </div>
          </nav>
        </div>
        {/* ParticleBackground is rendered by the root layout */}
      </div>
    </RouteGuard>
  );
}
