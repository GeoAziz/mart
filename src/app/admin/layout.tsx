'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BarChartBig,
  Users,
  HeartPulse,
  ShoppingBag,
  Tag,
  ListOrdered,
  Star,
  DollarSign,
  Shield,
  Palette,
  Ticket,
  Edit,
  LogOut,
  Loader2,
  Menu,
  ChevronLeft,
  ChevronRight,
  Store,
  Layers,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface NavItem {
  sectionTitle?: string;
  href?: string;
  label: string;
  icon?: any;
  badge?: string | number;
}

const adminNavItems: NavItem[] = [
  { sectionTitle: 'Main Menu', label: 'Main Menu' },
  { href: '/admin/overview', label: 'Overview', icon: BarChartBig },
  { href: '/admin/orders', label: 'Orders', icon: ListOrdered, badge: 'Live' },
  { href: '/admin/products', label: 'Products', icon: ShoppingBag },
  { href: '/admin/categories', label: 'Categories', icon: Tag },
  { href: '/admin/users', label: 'Customers & Vendors', icon: Users },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },

  { sectionTitle: 'Finance & Growth', label: 'Finance & Growth' },
  { href: '/admin/payouts', label: 'Vendor Payouts', icon: DollarSign },
  { href: '/admin/refunds', label: 'Refunds & Disputes', icon: Shield },
  { href: '/admin/promotions', label: 'Promotions & Discounts', icon: Ticket },

  { sectionTitle: 'Ecosystem & CMS', label: 'Ecosystem & CMS' },
  { href: '/admin/site-health', label: 'Site Health', icon: HeartPulse },
  { href: '/admin/cms/home', label: 'Storefront CMS', icon: Palette },
  { href: '/admin/cms/content', label: 'Content Manager', icon: Edit },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  const pathname = usePathname();
  const { logOut, loading: authLoading, userProfile } = useAuth();

  useEffect(() => {
    setIsMounted(true);
    try {
      const stored = localStorage.getItem('admin_sidebar_open');
      if (stored !== null) {
        setSidebarOpen(stored === 'true');
      }
    } catch (e) {}
  }, []);

  const handleToggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('admin_sidebar_open', String(next));
      } catch (e) {}
      return next;
    });
  };

  const handleLogout = async () => {
    await logOut();
  };

  const isRouteActive = (href?: string) => {
    if (!href || href === '#' || !pathname) return false;
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <RouteGuard allowedRoles={['admin']}>
      <TooltipProvider delayDuration={150}>
        {/* Skip to Main Content Link for a11y */}
        <a
          href="#admin-main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-accent focus:text-accent-foreground focus:rounded-md focus:shadow-xl focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>

        <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row antialiased selection:bg-accent/30 selection:text-accent">
          {/* DESKTOP SIDEBAR */}
          <aside
            aria-label="Admin Navigation"
            className={clsx(
              'admin-sidebar relative hidden md:flex flex-col border-r border-border/70 bg-card/80 backdrop-blur-xl sticky top-0 h-screen transition-all duration-300 z-30 shrink-0 space-theme-sidebar',
              sidebarOpen ? 'w-64' : 'w-20'
            )}
            style={{
              boxShadow: sidebarOpen ? '4px 0 30px 0 rgba(0, 0, 0, 0.25)' : undefined,
            }}
          >
            {/* FLOATING COLLAPSE TOGGLE BUTTON (Saledash signature) */}
            <button
              type="button"
              onClick={handleToggleSidebar}
              className="absolute -right-3 top-7 z-40 hidden md:flex items-center justify-center h-6 w-6 rounded-full bg-card border border-border shadow-md hover:bg-accent/20 hover:text-accent text-muted-foreground transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-expanded={sidebarOpen}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            >
              {sidebarOpen ? (
                <ChevronLeft className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>

            {/* Brand Header */}
            <div className="flex items-center px-4 h-18 border-b border-border/60 shrink-0">
              {sidebarOpen ? (
                <Link href="/admin/overview" className="flex items-center gap-3 group">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20 group-hover:scale-105 transition-transform">
                    <Sparkles className="h-5 w-5 text-black" />
                  </div>
                  <div>
                    <span className="font-bold tracking-tight text-base block text-foreground">
                      Zila<span className="text-accent">Cart</span>
                    </span>
                    <span className="text-[11px] font-medium text-muted-foreground block -mt-0.5">
                      Commerce Cloud
                    </span>
                  </div>
                </Link>
              ) : (
                <Link href="/admin/overview" className="w-full flex justify-center">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center shadow-lg shadow-accent/20 hover:scale-105 transition-transform">
                    <Sparkles className="h-5 w-5 text-black" />
                  </div>
                </Link>
              )}
            </div>

            {/* Navigation List */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-border">
              {adminNavItems.map((item, idx) => {
                if (item.sectionTitle) {
                  return sidebarOpen ? (
                    <div
                      key={`section-${idx}`}
                      className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60"
                    >
                      {item.sectionTitle}
                    </div>
                  ) : (
                    <div
                      key={`section-divider-${idx}`}
                      className="my-3 border-t border-border/50 mx-2"
                      role="separator"
                      aria-hidden="true"
                    />
                  );
                }

                if (!item.href || !item.icon) return null;
                const active = isRouteActive(item.href);
                const IconComponent = item.icon;

                if (!sidebarOpen) {
                  return (
                    <Tooltip key={item.href}>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={clsx(
                            'relative flex items-center justify-center h-11 w-11 mx-auto rounded-xl transition-all group tap-feedback',
                            'hover:bg-accent/15 hover:text-accent',
                            'focus:outline-none focus:ring-2 focus:ring-accent',
                            active
                              ? 'bg-accent/20 text-accent font-medium shadow-[0_0_12px_rgba(0,240,255,0.25)]'
                              : 'text-muted-foreground'
                          )}
                        >
                          <IconComponent
                            className={clsx(
                              'h-5 w-5 transition-transform group-hover:scale-110 shrink-0',
                              active && 'text-accent drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]'
                            )}
                          />
                          {item.badge && (
                            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent animate-pulse" />
                          )}
                          <span className="sr-only">{item.label}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={12} className="font-medium">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={clsx(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group tap-feedback',
                      'hover:bg-accent/15 hover:text-accent',
                      'focus:outline-none focus:ring-2 focus:ring-accent',
                      active
                        ? 'bg-accent/20 text-accent shadow-[0_0_16px_rgba(0,240,255,0.12)]'
                        : 'text-muted-foreground'
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <IconComponent
                        className={clsx(
                          'h-5 w-5 transition-transform group-hover:scale-110 shrink-0',
                          active && 'text-accent drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={clsx(
                          'px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider',
                          active
                            ? 'bg-accent text-black font-extrabold shadow-sm'
                            : 'bg-accent/15 text-accent'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Sidebar Footer: Admin profile card & Logout */}
            <div className="border-t border-border/70 p-3 shrink-0 bg-card/40 backdrop-blur-md">
              {sidebarOpen ? (
                <div className="flex items-center justify-between p-2 rounded-xl bg-card border border-border/60">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-8 w-8 rounded-full bg-accent/20 text-accent font-bold flex items-center justify-center shrink-0 border border-accent/30 text-xs">
                      {userProfile?.fullName?.charAt(0) || 'A'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate text-foreground">
                        {userProfile?.fullName || 'Jonathan Admin'}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {userProfile?.email || 'admin@zilacart.com'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={authLoading}
                    aria-label="Logout"
                    title="Logout"
                    className="p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/20 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive transition-colors shrink-0 disabled:opacity-60"
                  >
                    {authLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleLogout}
                      disabled={authLoading}
                      aria-label="Logout"
                      className="w-10 h-10 mx-auto flex items-center justify-center rounded-xl text-muted-foreground hover:bg-destructive/20 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive tap-feedback disabled:opacity-60 transition-colors"
                    >
                      {authLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <LogOut className="h-5 w-5" />
                      )}
                      <span className="sr-only">Logout</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>
                    Logout
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </aside>

          {/* MOBILE TOP BAR */}
          <div className="flex md:hidden items-center justify-between px-4 py-3 border-b border-border bg-card/90 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center">
                <Sparkles className="h-3.5 w-3.5 text-black" />
              </div>
              <span className="font-bold text-foreground text-sm tracking-tight">
                Zila<span className="text-accent">Cart</span> Admin
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="p-2 rounded-xl border border-border bg-card hover:bg-accent/15 focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Open complete admin navigation menu"
            >
              <Menu className="h-5 w-5 text-foreground" />
            </button>
          </div>

          {/* MOBILE FULL NAVIGATION DRAWER (Sheet) */}
          <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
            <SheetContent side="left" className="w-[85vw] max-w-xs p-0 flex flex-col bg-card border-r border-border">
              <SheetHeader className="p-4 border-b border-border text-left">
                <SheetTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-accent to-purple-600 flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-black" />
                  </div>
                  ZilaCart Navigation
                </SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {adminNavItems.map((item, idx) => {
                  if (item.sectionTitle) {
                    return (
                      <div
                        key={`m-sec-${idx}`}
                        className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/60"
                      >
                        {item.sectionTitle}
                      </div>
                    );
                  }
                  if (!item.href || !item.icon) return null;
                  const active = isRouteActive(item.href);
                  const IconComponent = item.icon;

                  return (
                    <Link
                      key={`m-${item.href}`}
                      href={item.href}
                      onClick={() => setMobileDrawerOpen(false)}
                      aria-current={active ? 'page' : undefined}
                      className={clsx(
                        'flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all',
                        active
                          ? 'bg-accent/20 text-accent font-medium'
                          : 'text-muted-foreground hover:bg-accent/10 hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-accent/20 text-accent">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>

              {/* Mobile Drawer Footer */}
              <div className="p-4 border-t border-border bg-card/60">
                <div className="mb-3 px-1">
                  <p className="text-sm font-semibold truncate text-foreground">
                    {userProfile?.fullName || 'Admin User'}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {userProfile?.email || ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setMobileDrawerOpen(false);
                    await handleLogout();
                  }}
                  disabled={authLoading}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium w-full text-muted-foreground hover:bg-destructive/20 hover:text-destructive"
                >
                  {authLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <LogOut className="h-5 w-5" />
                  )}
                  <span>Logout</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>

          {/* MAIN VIEWPORT */}
          <main
            id="admin-main-content"
            tabIndex={-1}
            className="flex-1 min-w-0 p-4 md:p-8 space-theme-main pb-24 md:pb-8 focus:outline-none"
          >
            <div className="w-full max-w-7xl mx-auto">{children}</div>
          </main>

          {/* MOBILE BOTTOM QUICK NAVIGATION BAR */}
          <nav
            aria-label="Quick mobile navigation"
            className="fixed bottom-0 left-0 right-0 z-40 flex md:hidden bg-card/95 backdrop-blur-lg border-t border-border shadow-2xl px-1 py-1.5 justify-around"
          >
            <Link
              href="/admin/overview"
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-2 rounded-md transition-all tap-feedback',
                isRouteActive('/admin/overview') ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <BarChartBig className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Overview</span>
            </Link>
            <Link
              href="/admin/orders"
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-2 rounded-md transition-all tap-feedback',
                isRouteActive('/admin/orders') ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <ListOrdered className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Orders</span>
            </Link>
            <Link
              href="/admin/products"
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-2 rounded-md transition-all tap-feedback',
                isRouteActive('/admin/products') ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <ShoppingBag className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Products</span>
            </Link>
            <Link
              href="/admin/users"
              className={clsx(
                'flex flex-col items-center justify-center py-1 px-2 rounded-md transition-all tap-feedback',
                isRouteActive('/admin/users') ? 'text-accent' : 'text-muted-foreground'
              )}
            >
              <Users className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">Users</span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileDrawerOpen(true)}
              className="flex flex-col items-center justify-center py-1 px-2 rounded-md text-muted-foreground hover:text-foreground transition-all tap-feedback"
            >
              <Menu className="h-5 w-5" />
              <span className="text-[10px] mt-0.5">More</span>
            </button>
          </nav>
        </div>

        <style jsx global>{`
          .space-theme-sidebar {
            background: linear-gradient(180deg, #0a192f 0%, #0d1e38 100%);
          }
          .space-theme-main {
            background: radial-gradient(circle at top right, rgba(0, 240, 255, 0.04), transparent 40%),
                        linear-gradient(135deg, #071224 0%, #0a192f 100%);
          }
        `}</style>
      </TooltipProvider>
    </RouteGuard>
  );
}
