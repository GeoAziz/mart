'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Menu, ChevronLeft, ChevronRight, Home, BarChart3, ShoppingBag, Inbox, DollarSign, StarHalf, Settings, Package, Users, MoreHorizontal, Plus, List, Archive, Truck, FileText, LifeBuoy, CreditCard, LayoutDashboard, MessageSquare, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationCenter } from '@/components/vendor/NotificationCenter';
import { VendorUserNav } from '@/components/vendor/VendorUserNav';
import VendorDesktopNav, { NavItem } from '@/components/vendor/VendorDesktopNav';
import VendorMobileNav from '@/components/vendor/VendorMobileNav';
// ParticleBackground is rendered globally in root layout

const vendorNavItems: NavItem[] = [
  { href: "/vendor", label: "Dashboard", icon: Home },
  
  { href: "#", label: "Store", icon: Settings, sectionTitle: "Store Management" },
  { href: "/vendor/products/manage", label: "Products", icon: Package, subItems: [
    { href: "/vendor/products/manage", label: "All Products", icon: List },
    { href: "/vendor/products/add", label: "Add Product", icon: Plus },
    { href: "/vendor/inventory", label: "Inventory", icon: Archive }
  ]},
  { href: "/vendor/promotions", label: "Promotions", icon: Tag },
  { href: "/vendor/orders/all", label: "Orders", icon: ShoppingBag, subItems: [
    { href: "/vendor/orders/all", label: "All Orders", icon: List },
    { href: "/vendor/orders/incoming", label: "Incoming Orders", icon: Inbox }
  ]},
  { href: "/vendor/customers", label: "Customers", icon: Users },
  { href: "/vendor/messaging", label: "Messaging", icon: MessageSquare },
  { href: "/vendor/reviews", label: "Reviews", icon: StarHalf },
  
  { href: "#", label: "Finance & Shipping", icon: Settings, sectionTitle: "Operations" },
  { href: "/vendor/earnings", label: "Finance", icon: DollarSign, subItems: [
    { href: "/vendor/earnings", label: "Earnings", icon: BarChart3 },
    { href: "/vendor/transactions", label: "Transactions", icon: List },
    { href: "/vendor/payment-settings", label: "Payment Settings", icon: CreditCard }
  ]},
  { href: "/vendor/shipping", label: "Shipping", icon: Truck, subItems: [
    { href: "/vendor/shipping", label: "Overview", icon: List },
    { href: "/vendor/shipping-settings", label: "Settings", icon: Settings }
  ]},
  
  { href: "#", label: "Insights", icon: Settings, sectionTitle: "Insights & Support" },
  { href: "/vendor/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/vendor/reports", label: "Reports", icon: FileText },
  { href: "/vendor/store-profile", label: "Store Profile", icon: LayoutDashboard },
  { href: "/vendor/settings", label: "Settings", icon: Settings },
  { href: "/vendor/support", label: "Support", icon: LifeBuoy }
];

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
            "fixed inset-y-0 left-0 z-40 bg-card border-r border-border transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "-translate-x-full w-64" : "translate-x-0 w-64"
          )}>
            <div className="flex h-full flex-col">
              {/* Header with collapse button */}
              <div className="flex items-center justify-between p-4 border-b border-border min-h-[4rem]">
                {!sidebarCollapsed && (
                  <h1 className="text-lg font-semibold">Vendor Dashboard</h1>
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
              {/* Sidebar Bottom Actions */}
              <div className={cn(
                "p-4 border-t border-border flex items-center gap-2", 
                sidebarCollapsed ? "flex-col justify-center" : "justify-between"
              )}>
                <NotificationCenter />
                <VendorUserNav />
              </div>
            </div>
          </aside>
          {/* Main Content - Dynamic margin based on sidebar state */}
          <main className={cn(
            "flex-1 transition-all duration-300 ease-in-out relative",
            sidebarCollapsed ? "ml-0" : "ml-64"
          )}>
            {sidebarCollapsed && (
              <div className="fixed top-4 left-4 z-30">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(false)}
                  className="bg-background/50 backdrop-blur border border-border hover:bg-accent hover:text-foreground text-muted-foreground shadow-sm h-10 w-10 rounded-lg transition-all"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            )}
            <div className={cn("p-6", sidebarCollapsed && "pt-16")}>
              {children}
            </div>
          </main>
        </div>
        {/* MOBILE LAYOUT - Overlay Sheet */}
        <div className="lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            {/* Floating button to open mobile menu */}
            {!mobileOpen && (
              <div className="fixed top-4 left-4 z-40">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(true)}
                  className="bg-background/80 backdrop-blur border border-border hover:bg-accent hover:text-foreground text-foreground shadow-sm h-10 w-10 rounded-lg transition-all"
                  aria-label="Open sidebar"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            )}
            <SheetContent side="left" className="w-64 p-0 flex flex-col h-full">
              <div className="p-4 border-b border-border">
                <h1 className="text-lg font-semibold">Vendor Dashboard</h1>
              </div>
              <nav className="flex-1 p-2 overflow-y-auto">
                <VendorMobileNav items={vendorNavItems} onItemClick={() => setMobileOpen(false)} />
              </nav>
              <div className="p-4 border-t border-border flex items-center justify-between">
                <NotificationCenter />
                <VendorUserNav />
              </div>
            </SheetContent>
          </Sheet>
          {/* Mobile Main Content */}
          <main>
            <div className="p-4 pt-16 pb-20">
              {children}
            </div>
          </main>
          
          {/* Mobile Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur border-t border-border">
            <div className="grid grid-cols-5 gap-1 p-2">
              {/* Priority items: Dashboard, Orders, Products, Customers */}
              {[
                vendorNavItems.find(i => i.href === "/vendor"),
                vendorNavItems.find(i => i.href === "/vendor/orders/all"),
                vendorNavItems.find(i => i.href === "/vendor/products/manage"),
                vendorNavItems.find(i => i.href === "/vendor/messaging"),
              ].filter((item): item is NavItem => item !== undefined).map((item) => {
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
