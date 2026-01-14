'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { LayoutDashboard, ShoppingBag, Heart, MapPin, Lock, User, Settings, Inbox, Bell, Menu, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';
import Logo from '@/components/layout/Logo';
import { accountNavItems } from '@/data/accountNavItems';
// ParticleBackground is rendered globally in root layout

interface NavItem {
  href: string;
  label?: string;
  title?: string;
  icon: React.ComponentType<{ className?: string }>;
  sectionTitle?: string;
}

// Transform the imported nav items to match our interface and add sections
const transformedAccountNavItems: NavItem[] = [
  { sectionTitle: "Navigation", href: "#", label: "Navigation", icon: User },
  ...accountNavItems.map(item => ({
    ...item,
    label: item.title
  })),
  { sectionTitle: "Advanced", href: "#", label: "Advanced", icon: Settings },
  { href: "/messaging", label: "Inbox", icon: Inbox },
  { href: "/account/profile", label: "Personal Info", icon: User },
  { href: "/account/change-password", label: "Change Password", icon: Lock },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
];

interface DesktopNavProps {
  items: NavItem[];
  collapsed: boolean;
}

function DesktopNav({ items, collapsed }: DesktopNavProps) {
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
          const isActive = pathname === item.href;
          
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
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>
                  {navButton}
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          }

          return <div key={item.href}>{navButton}</div>;
        })}
      </div>
    </TooltipProvider>
  );
}

interface MobileNavProps {
  items: NavItem[];
  onItemClick: () => void;
}

function MobileNav({ items, onItemClick }: MobileNavProps) {
  const pathname = usePathname();

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
        const isActive = pathname === item.href;
        
        return (
          <Button
            key={item.href}
            asChild
            variant={isActive ? "secondary" : "ghost"}
            className="w-full justify-start gap-3 h-11"
            onClick={onItemClick}
          >
            <Link href={item.href}>
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </Link>
          </Button>
        );
      })}
    </div>
  );
}

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <RouteGuard allowedRoles={['customer', 'vendor', 'admin']}>
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
                  <div className="flex items-center gap-2">
                    <Logo />
                  </div>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={cn("h-8 w-8 shrink-0 micro-interaction tap-feedback", sidebarCollapsed && "mx-auto")}
                >
                  {sidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4 animate-pulse-glow" />
                  ) : (
                    <ChevronLeft className="h-4 w-4 animate-pulse-glow" />
                  )}
                </Button>
              </div>
              {/* Navigation */}
              <nav className="flex-1 p-3 overflow-y-auto">
                <DesktopNav items={transformedAccountNavItems.filter(item => item.href !== "#" || !item.sectionTitle)} collapsed={sidebarCollapsed} />
              </nav>
            </div>
          </aside>
          {/* Main Content - Dynamic margin based on sidebar state */}
          <main className={cn(
            "flex-1 transition-all duration-300 ease-in-out grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
            sidebarCollapsed ? "ml-16" : "ml-64"
          )}>
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border col-span-full">
              <div className="flex items-center gap-4 px-6 h-16">
                <h1 className="text-xl font-semibold font-headline text-glow-primary">My Account</h1>
              </div>
            </header>
            <div className="p-6 col-span-full">
              {children}
            </div>
          </main>
        </div>

        {/* MOBILE LAYOUT - Overlay Sheet */}
        <div className="lg:hidden">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
            <div className="flex items-center gap-4 p-4 h-16">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0">
                  <SheetHeader className="p-4 border-b border-border">
                    <SheetTitle className="text-left">
                      <Logo />
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="p-3">
                    <MobileNav 
                      items={transformedAccountNavItems.filter(item => item.href !== "#" || !item.sectionTitle)} 
                      onItemClick={() => setMobileOpen(false)} 
                    />
                  </nav>
                </SheetContent>
              </Sheet>
              <h1 className="text-xl font-semibold font-headline text-glow-primary">My Account</h1>
            </div>
          </header>
          
          {/* Mobile Main Content */}
          <main>
            <div className="p-4">
              {children}
            </div>
          </main>
        </div>
      </div>
      {/* ParticleBackground is rendered by the root layout */}
    </RouteGuard>
  );
}
