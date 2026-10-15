'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Menu, ChevronLeft, ChevronRight, LogOut, Loader2 } from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';
import Logo from '@/components/layout/Logo';
import { accountNavItems, type AccountNavItem } from '@/data/accountNavItems';
import { useAuth } from '@/context/AuthContext';

interface DesktopNavProps {
  items: AccountNavItem[];
  collapsed: boolean;
}

function DesktopNav({ items, collapsed }: DesktopNavProps) {
  const pathname = usePathname();

  // Group by section
  const sections = ['Shopping', 'Account Settings'] as const;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {sections.map((section) => {
          const sectionItems = items.filter((item) => item.section === section);
          if (sectionItems.length === 0) return null;

          return (
            <div key={section} className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1.5">
                  <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {section}
                  </h3>
                </div>
              )}
              {collapsed && <div className="my-2 border-t border-border/40" />}
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                const navButton = (
                  <Button
                    asChild
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10 transition-colors",
                      collapsed && "justify-center px-2",
                      isActive && "bg-secondary text-primary font-semibold"
                    )}
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="font-medium text-sm">{item.title}</span>}
                    </Link>
                  </Button>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href} delayDuration={50}>
                      <TooltipTrigger asChild>
                        {navButton}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{item.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.href}>{navButton}</div>;
              })}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

interface MobileNavProps {
  items: AccountNavItem[];
  onItemClick: () => void;
}

function MobileNav({ items, onItemClick }: MobileNavProps) {
  const pathname = usePathname();
  const sections = ['Shopping', 'Account Settings'] as const;

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);
        if (sectionItems.length === 0) return null;

        return (
          <div key={section} className="space-y-1">
            <div className="px-3 py-1">
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                {section}
              </h3>
            </div>
            {sectionItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Button
                  key={item.href}
                  asChild
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-10",
                    isActive && "bg-secondary text-primary font-semibold"
                  )}
                  onClick={onItemClick}
                >
                  <Link href={item.href}>
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{item.title}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
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
  const { logOut, loading: authLoading } = useAuth();

  return (
    <RouteGuard allowedRoles={['customer', 'vendor', 'admin']}>
      <div className="min-h-screen bg-background flex flex-col">
        
        {/* DESKTOP LAYOUT - Persistent + Collapsible */}
        <div className="hidden lg:flex min-h-screen">
          {/* Desktop Sidebar - Fixed Position */}
          <aside className={cn(
            "fixed inset-y-0 left-0 z-30 bg-card border-r border-border transition-all duration-300 ease-in-out flex flex-col",
            sidebarCollapsed ? "w-16" : "w-64"
          )}>
            {/* Header with Logo and Collapse Toggle */}
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
                className={cn("h-8 w-8 shrink-0 hover:text-primary transition-colors", sidebarCollapsed && "mx-auto")}
                aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 p-3 overflow-y-auto">
              <DesktopNav items={accountNavItems} collapsed={sidebarCollapsed} />
            </nav>

            {/* Footer with Logout */}
            <div className="p-3 border-t border-border">
              <Button
                variant="ghost"
                onClick={() => logOut()}
                disabled={authLoading}
                className={cn(
                  "w-full justify-start gap-3 h-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors",
                  sidebarCollapsed && "justify-center px-2"
                )}
              >
                {authLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <LogOut className="h-4 w-4 shrink-0" />
                )}
                {!sidebarCollapsed && <span className="font-medium text-sm">Sign Out</span>}
              </Button>
            </div>
          </aside>

          {/* Main Content - Smooth vertical flow with margin compensation */}
          <div className={cn(
            "flex-1 flex flex-col transition-all duration-300 ease-in-out",
            sidebarCollapsed ? "ml-16" : "ml-64"
          )}>
            <header className="sticky top-0 z-20 bg-background/90 backdrop-blur border-b border-border h-16 flex items-center px-6 justify-between">
              <h1 className="text-xl font-semibold font-headline text-glow-primary">Customer Portal</h1>
              <Button variant="outline" size="sm" asChild className="hover:border-primary">
                <Link href="/">Back to Shop</Link>
              </Button>
            </header>
            <main className="flex-1 p-6 max-w-6xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>

        {/* MOBILE LAYOUT - Overlay Sheet */}
        <div className="lg:hidden flex-1 flex flex-col">
          {/* Mobile Header */}
          <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b border-border h-16 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Open portal navigation">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-0 flex flex-col">
                  <SheetHeader className="p-4 border-b border-border text-left">
                    <SheetTitle>
                      <Logo />
                    </SheetTitle>
                  </SheetHeader>
                  <nav className="p-3 flex-1 overflow-y-auto">
                    <MobileNav 
                      items={accountNavItems} 
                      onItemClick={() => setMobileOpen(false)} 
                    />
                  </nav>
                  <div className="p-3 border-t border-border">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setMobileOpen(false);
                        logOut();
                      }}
                      className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Sign Out</span>
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-semibold font-headline text-glow-primary">My Account</h1>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Store</Link>
            </Button>
          </header>
          
          {/* Mobile Main Content */}
          <main className="flex-1 p-4">
            {children}
          </main>
        </div>
      </div>
    </RouteGuard>
  );
}
