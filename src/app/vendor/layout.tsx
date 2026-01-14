'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import RouteGuard from '@/components/auth/RouteGuard';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Menu, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Home, BarChart3, ShoppingBag, PackagePlus, Inbox, DollarSign, Star, Settings, User, ListOrdered, PlusCircle, Package, Truck, FileText, MessageCircle, Store, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
// ParticleBackground is rendered globally in root layout

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  sectionTitle?: string;
  subItems?: NavItem[];
  isExpandable?: boolean;
}

const vendorNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: Home },
  
  // Main Dashboard
  { sectionTitle: "Dashboard", href: "#", label: "Dashboard", icon: BarChart3 },
  { href: "/vendor", label: "Overview", icon: BarChart3 },
  
  // Products Section - Dropdown
  { 
    href: "/vendor/products", 
    label: "Products", 
    icon: Package,
    isExpandable: true,
    subItems: [
      { href: "/vendor/products/manage", label: "Manage Products", icon: ListOrdered },
      { href: "/vendor/products/add", label: "Add New Product", icon: PlusCircle },
      { href: "/vendor/products/analytics", label: "Product Analytics", icon: BarChart3 },
      { href: "/vendor/inventory", label: "Inventory", icon: PackagePlus },
    ]
  },
  
  // Orders Section - Dropdown  
  { 
    href: "/vendor/orders",
    label: "Orders", 
    icon: ShoppingBag,
    isExpandable: true,
    subItems: [
      { href: "/vendor/orders/incoming", label: "Incoming Orders", icon: Inbox },
      { href: "/vendor/orders/all", label: "All Orders", icon: ShoppingBag },
      { href: "/vendor/orders/analytics", label: "Order Analytics", icon: BarChart3 },
      { href: "/vendor/shipping", label: "Shipping", icon: Truck },
    ]
  },
  
  // Finance Section - Dropdown
  { sectionTitle: "Finance & Business", href: "#", label: "Finance & Business", icon: DollarSign },
  { 
    href: "/vendor/finance",
    label: "Finance", 
    icon: DollarSign,
    isExpandable: true,
    subItems: [
      { href: "/vendor/earnings", label: "Earnings", icon: DollarSign },
      { href: "/vendor/payouts", label: "Payouts", icon: CreditCard },
      { href: "/vendor/transactions", label: "Transactions", icon: FileText },
      { href: "/vendor/reports", label: "Financial Reports", icon: BarChart3 },
    ]
  },
  
  // Feedback Section - Dropdown
  { 
    href: "/vendor/feedback",
    label: "Feedback", 
    icon: Star,
    isExpandable: true,
    subItems: [
      { href: "/vendor/reviews", label: "Customer Reviews", icon: Star },
      { href: "/messaging", label: "Messages", icon: MessageCircle },
      { href: "/vendor/support", label: "Support Center", icon: Inbox },
    ]
  },
  
  // Settings Section
  { sectionTitle: "Settings", href: "#", label: "Settings", icon: Settings },
  { 
    href: "/vendor/settings",
    label: "Store Settings", 
    icon: Settings,
    isExpandable: true,
    subItems: [
      { href: "/vendor/store-profile", label: "Store Profile", icon: Store },
      { href: "/vendor/payment-settings", label: "Payment Settings", icon: CreditCard },
      { href: "/vendor/shipping-settings", label: "Shipping Settings", icon: Truck },
      { href: "/vendor/notifications", label: "Notifications", icon: Inbox },
    ]
  },
];

interface VendorDesktopNavProps {
  items: NavItem[];
  collapsed: boolean;
}

function VendorDesktopNav({ items, collapsed }: VendorDesktopNavProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Products', 'Finance']); // Default expanded

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

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
          const isExpanded = expandedItems.includes(item.label);
          const hasSubItems = item.subItems && item.subItems.length > 0;
          
          // Main navigation button
          const navButton = (
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                collapsed && "justify-center px-2"
              )}
              onClick={() => {
                if (hasSubItems && item.isExpandable && !collapsed) {
                  toggleExpanded(item.label);
                } else {
                  window.location.href = item.href;
                }
              }}
              asChild={!hasSubItems || collapsed}
            >
              {!hasSubItems || collapsed ? (
                <Link href={item.href}>
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              ) : (
                <div className="flex items-center w-full">
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="font-medium flex-1 text-left ml-3">{item.label}</span>
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 transition-transform duration-200",
                          isExpanded && "rotate-180"
                        )} 
                      />
                    </>
                  )}
                </div>
              )}
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
                    <div className="space-y-1">
                      <p className="font-medium">{item.label}</p>
                      {item.subItems?.map(subItem => (
                        <Link key={subItem.href} href={subItem.href}>
                          <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent">
                            <subItem.icon className="h-4 w-4" />
                            <span className="text-sm">{subItem.label}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
            );
          }

          return (
            <div key={item.href} className="space-y-1">
              {navButton}
              
              {/* Show sub-items when expanded */}
              {item.subItems && !collapsed && isExpanded && (
                <div className="ml-6 space-y-1 border-l border-border/30 pl-3">
                  {item.subItems.map((subItem) => {
                    const SubIcon = subItem.icon;
                    const isSubActive = pathname === subItem.href;
                    
                    return (
                      <Button
                        key={subItem.href}
                        asChild
                        variant={isSubActive ? "secondary" : "ghost"}
                        className="w-full justify-start gap-3 h-9 text-sm font-normal"
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

interface VendorMobileNavProps {
  items: NavItem[];
  onItemClick: () => void;
}

function VendorMobileNav({ items, onItemClick }: VendorMobileNavProps) {
  const pathname = usePathname();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Products', 'Finance']); // Default expanded on mobile

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        // Handle section titles
        if (item.sectionTitle && item.href === "#") {
          return (
            <div key={`section-${index}`} className="px-3 py-2 border-b border-border/50">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {item.sectionTitle}
              </h3>
            </div>
          );
        }

        const Icon = item.icon;
        const isActive = pathname === item.href || (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href)));
        const isExpanded = expandedItems.includes(item.label);
        const hasSubItems = item.subItems && item.subItems.length > 0;
        
        return (
          <div key={item.href} className="space-y-1">
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start gap-3 h-11"
              onClick={() => {
                if (hasSubItems && item.isExpandable) {
                  toggleExpanded(item.label);
                } else {
                  onItemClick();
                  window.location.href = item.href;
                }
              }}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium flex-1 text-left">{item.label}</span>
              {hasSubItems && item.isExpandable && (
                <ChevronDown 
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isExpanded && "rotate-180"
                  )} 
                />
              )}
            </Button>
            
            {/* Show sub-items when expanded */}
            {item.subItems && isExpanded && (
              <div className="ml-6 space-y-1 border-l border-border/30 pl-3">
                {item.subItems.map((subItem) => {
                  const SubIcon = subItem.icon;
                  const isSubActive = pathname === subItem.href;
                  
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
  );
}

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

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
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={cn("h-8 w-8 shrink-0 micro-interaction tap-feedback", sidebarCollapsed && "mx-auto")}
                >
                  {sidebarCollapsed ? <ChevronRight className="h-4 w-4 animate-pulse-glow" /> : <ChevronLeft className="h-4 w-4 animate-pulse-glow" />}
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
                  <Button variant="ghost" size="icon" className="shrink-0 tap-feedback">
                    <Menu className="h-6 w-6" />
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
            <div className="p-4">
              {children}
            </div>
          </main>
        </div>
        {/* ParticleBackground is rendered by the root layout */}
      </div>
    </RouteGuard>
  );
}
