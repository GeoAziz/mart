'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import RouteGuard from '@/components/auth/RouteGuard';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  LayoutGrid,
  Package,
  ShoppingBag,
  DollarSign,
  MessageSquare,
  Settings,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Users,
  BarChart3,
  Truck,
  Tag,
  StarHalf,
} from 'lucide-react';
import { useState } from 'react';
import { NotificationCenter } from '@/components/vendor/NotificationCenter';
import { VendorUserNav } from '@/components/vendor/VendorUserNav';
import VendorDesktopNav, { NavShortcut } from '@/components/vendor/VendorDesktopNav';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

// 1. The Left Dock: EXACTLY 5 Focused Core Shortcuts matching the inspiration
const dockShortcuts: NavShortcut[] = [
  {
    href: '/vendor',
    label: 'Dashboard Overview',
    icon: LayoutGrid,
    matchPrefixes: ['/vendor$'],
  },
  {
    href: '/vendor/products/manage',
    label: 'Products & Catalog',
    icon: Package,
    matchPrefixes: ['/vendor/products', '/vendor/inventory'],
  },
  {
    href: '/vendor/orders/all',
    label: 'Orders & Shipments',
    icon: ShoppingBag,
    matchPrefixes: ['/vendor/orders', '/vendor/shipping'],
  },
  {
    href: '/vendor/earnings',
    label: 'Finance & Payouts',
    icon: DollarSign,
    matchPrefixes: ['/vendor/earnings', '/vendor/transactions', '/vendor/payment-settings', '/vendor/reports'],
  },
  {
    href: '/vendor/messaging',
    label: 'Customer Messages',
    icon: MessageSquare,
    matchPrefixes: ['/vendor/messaging', '/vendor/customers', '/vendor/reviews'],
  },
];

// Contextual Sub-Nav Bar: Dynamically shown based on current section
const getSectionSubNav = (pathname: string) => {
  if (pathname.startsWith('/vendor/products') || pathname === '/vendor/inventory') {
    return [
      { href: '/vendor/products/manage', label: 'All Products' },
      { href: '/vendor/products/add', label: '+ Add Product' },
      { href: '/vendor/inventory', label: 'Inventory' },
      { href: '/vendor/promotions', label: 'Promotions' },
    ];
  }
  if (pathname.startsWith('/vendor/orders') || pathname.startsWith('/vendor/shipping')) {
    return [
      { href: '/vendor/orders/all', label: 'All Orders' },
      { href: '/vendor/orders/incoming', label: 'Incoming Orders' },
      { href: '/vendor/shipping', label: 'Shipping Rules' },
      { href: '/vendor/shipping-settings', label: 'Settings' },
    ];
  }
  if (
    pathname.startsWith('/vendor/earnings') ||
    pathname.startsWith('/vendor/transactions') ||
    pathname.startsWith('/vendor/payment-settings') ||
    pathname.startsWith('/vendor/reports')
  ) {
    return [
      { href: '/vendor/earnings', label: 'Earnings Overview' },
      { href: '/vendor/transactions', label: 'Ledger & Payouts' },
      { href: '/vendor/reports', label: 'Financial Reports' },
      { href: '/vendor/payment-settings', label: 'M-Pesa / Bank' },
    ];
  }
  if (
    pathname.startsWith('/vendor/customers') ||
    pathname.startsWith('/vendor/messaging') ||
    pathname.startsWith('/vendor/reviews')
  ) {
    return [
      { href: '/vendor/customers', label: 'All Buyers' },
      { href: '/vendor/messaging', label: 'Direct Messages' },
      { href: '/vendor/reviews', label: 'Customer Reviews' },
    ];
  }
  return null;
};

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const { userProfile, logOut } = useAuth();

  const subNavItems = getSectionSubNav(pathname);

  return (
    <RouteGuard allowedRoles={['vendor', 'admin']}>
      <div className="min-h-screen bg-background text-foreground selection:bg-emerald-500 selection:text-white relative">
        {/* DESKTOP LAYOUT - Pure Floating Dock & Header Pill Bar */}
        <div className="hidden lg:flex min-h-screen">
          {/* 1. Floating Left Dock: Sleek, Uncluttered, Fixed 76px */}
          <aside className="fixed top-3 bottom-3 left-3 z-40 w-[76px] flex flex-col justify-between p-3 bg-card/75 backdrop-blur-2xl border border-border/80 shadow-2xl rounded-3xl">
            {/* Top Logo */}
            <div className="flex justify-center pb-2 border-b border-border/40">
              <Link
                href="/vendor"
                className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold shadow-lg shadow-emerald-500/25 hover:scale-105 transition-transform"
                title="ZilaCart Vendor"
              >
                Z
              </Link>
            </div>

            {/* Center: The 5 Essential Icons */}
            <nav className="my-auto py-2">
              <VendorDesktopNav items={dockShortcuts} />
            </nav>

            {/* Bottom Utilities: Settings & Logout */}
            <div className="pt-2 border-t border-border/40 flex flex-col items-center gap-2">
              <Link
                href="/vendor/settings"
                className={cn(
                  "h-11 w-11 rounded-2xl flex items-center justify-center transition-all",
                  pathname.startsWith('/vendor/settings')
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
                    : "text-muted-foreground hover:text-foreground hover:bg-card/90"
                )}
                title="Store Settings"
              >
                <Settings className="h-5 w-5" />
              </Link>

              <button
                onClick={() => logOut()}
                className="h-11 w-11 rounded-2xl flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                title="Log Out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </aside>

          {/* 2. Main Content Area */}
          <main className="flex-1 flex flex-col ml-[92px] transition-all min-h-screen">
            {/* Top Clean Utility Header (NO duplicate page links) */}
            <header className="sticky top-3 z-30 mx-4 mt-3 mb-2 px-5 py-3 rounded-3xl bg-card/75 backdrop-blur-2xl border border-border/75 shadow-lg flex items-center justify-between gap-4">
              {/* Left: Current Section Title & Marketplace shortcut */}
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  className="text-xs text-muted-foreground hover:text-emerald-400 transition-colors inline-flex items-center gap-1 font-medium bg-background/50 px-3 py-1.5 rounded-xl border border-border/50"
                >
                  ← Marketplace
                </Link>
                <div className="h-4 w-px bg-border/60 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-foreground/90">Store Active</span>
                </div>
              </div>

              {/* Right Profile & Utilities */}
              <div className="flex items-center gap-3">
                <NotificationCenter />
                <div className="h-5 w-px bg-border/60" />
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8 ring-2 ring-emerald-500/40">
                    <AvatarImage
                      src={(userProfile as any)?.photoURL || (userProfile as any)?.logoUrl || ''}
                      alt={userProfile?.fullName || 'Vendor'}
                    />
                    <AvatarFallback className="bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                      {(userProfile?.fullName || 'V').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <VendorUserNav />
                </div>
              </div>
            </header>

            {/* Contextual Sub-Nav Bar (Shown when inside a section with sub-pages) */}
            {subNavItems && (
              <div className="mx-6 mb-2 flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-card/40 border border-border/40 backdrop-blur-md self-start text-xs">
                {subNavItems.map((sub) => {
                  const isSubActive = pathname === sub.href;
                  return (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        "px-3 py-1 rounded-xl transition-all",
                        isSubActive
                          ? "bg-emerald-500 text-white font-medium shadow-sm shadow-emerald-500/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-card/60"
                      )}
                    >
                      {sub.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Page Body Container */}
            <div className="p-4 md:p-6 flex-1 max-w-[1600px] w-full mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* MOBILE LAYOUT */}
        <div className="lg:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            {!mobileOpen && (
              <div className="fixed top-4 left-4 z-40">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileOpen(true)}
                  className="bg-card/80 backdrop-blur-xl border border-border/80 text-foreground shadow-md h-10 w-10 rounded-2xl"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </div>
            )}
            <SheetContent side="left" className="w-72 p-0 flex flex-col h-full bg-card/95 backdrop-blur-2xl border-r border-border">
              <div className="p-5 border-b border-border/50 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-white font-bold">
                  Z
                </div>
                <div>
                  <h1 className="text-sm font-bold leading-none">ZilaCart</h1>
                  <span className="text-[10px] text-emerald-400">Vendor Portal</span>
                </div>
              </div>

              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {dockShortcuts.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    (item.matchPrefixes && item.matchPrefixes.some((p) => pathname.startsWith(p)));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                        isActive
                          ? "bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-500/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="p-4 border-t border-border/50 flex items-center justify-between">
                <NotificationCenter />
                <VendorUserNav />
              </div>
            </SheetContent>
          </Sheet>

          {/* Mobile Main Content */}
          <main>
            <div className="p-4 pt-16 pb-24">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Dock */}
          <nav className="fixed bottom-3 left-3 right-3 z-50 md:hidden bg-card/90 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl p-1.5">
            <div className="grid grid-cols-5 gap-1">
              {dockShortcuts.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.matchPrefixes && item.matchPrefixes.some((p) => pathname.startsWith(p)));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all relative",
                      isActive
                        ? "bg-emerald-500 text-white font-medium shadow-md shadow-emerald-500/20"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 mb-0.5" />
                    <span className="text-[9px] truncate">{item.label.split(' ')[0]}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
      </div>
    </RouteGuard>
  );
}
