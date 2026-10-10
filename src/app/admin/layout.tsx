'use client';

import RouteGuard from '@/components/auth/RouteGuard';
import { useAuth } from '@/context/AuthContext';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { User, BarChartBig, Users, HeartPulse, ShoppingBag, Tag, ListOrdered, Star, DollarSign, Shield, Palette, Ticket, Edit, LogOut, Loader2 } from 'lucide-react';

interface NavItem {
  sectionTitle?: string;
  href: string;
  label: string;
  icon: any;
}

const adminNavItems: NavItem[] = [
  { sectionTitle: "Overview & Site", href: "#", label: "Overview & Site", icon: User },
  { href: "/admin/overview", label: "Dashboard", icon: BarChartBig },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/site-health", label: "Site Health", icon: HeartPulse }, 
  { sectionTitle: "E-Commerce", href: "#", label: "E-Commerce", icon: User },
  { href: "/admin/products", label: "Product Moderation", icon: ShoppingBag },
  { href: "/admin/categories", label: "Category Management", icon: Tag },
  { href: "/admin/orders", label: "Order Overview", icon: ListOrdered }, 
  { href: "/admin/reviews", label: "Review Management", icon: Star },
  { href: "/admin/payouts", label: "Vendor Payouts", icon: DollarSign },
  { href: "/admin/refunds", label: "Refund Management", icon: Shield },
  { sectionTitle: "Content & Marketing", href: "#", label: "Content & Marketing", icon: User },
  { href: "/admin/cms/home", label: "CMS - Home", icon: Palette },
  { href: "/admin/promotions", label: "Promotions", icon: Ticket },
  { href: "/admin/cms/content", label: "CMS - Content", icon: Edit },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    try {
      if (typeof window !== 'undefined') {
        const v = localStorage.getItem('admin_sidebar_open');
        return v === 'true';
      }
    } catch (e) {}
    return false;
  });
  const pathname = usePathname();
  const { logOut, loading: authLoading, userProfile } = useAuth();

  const handleLogout = async () => {
    await logOut();
  };

  useEffect(() => {
    try {
      localStorage.setItem('admin_sidebar_open', String(sidebarOpen));
    } catch (e) {}
  }, [sidebarOpen]);

  return (
    <RouteGuard allowedRoles={['admin']}>
      <div className="admin-dashboard-grid min-h-screen bg-background text-foreground">
        <aside
          className={clsx(
            'admin-sidebar fixed md:static z-40 top-0 left-0 h-full transition-all duration-300',
            sidebarOpen ? 'w-64 shadow-2xl' : 'w-0 md:w-20 hidden md:flex',
            'bg-card border-r border-border flex flex-col',
            'overflow-x-hidden',
            'backdrop-blur-md',
            'space-theme-sidebar',
          )}
          style={{
            boxShadow: sidebarOpen ? '0 0 32px 0 #00f0ff44' : undefined,
          }}
        >
          <button
            className="toggle-button p-2 m-2 rounded-full hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent micro-interaction tap-feedback hidden md:block"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            aria-expanded={sidebarOpen}
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span className={clsx('transition-transform', sidebarOpen ? 'rotate-180' : '')}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right text-accent animate-pulse-glow"><path d="M9 18l6-6-6-6"/></svg>
            </span>
          </button>
          <nav className="flex-1 flex flex-col gap-2 mt-4">
            {adminNavItems.map((item, idx) => {
              if (item.sectionTitle) {
                return (
                  <div key={item.sectionTitle + '-' + idx} className={clsx('px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground/60', sidebarOpen ? 'block' : 'hidden md:block')}>
                    {item.sectionTitle}
                  </div>
                );
              }

              const isActive = item.href !== '#' && pathname && (pathname === item.href || pathname.startsWith(item.href + '/'));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-all group sci-fi-nav-item tap-feedback',
                    'hover:bg-accent/20 hover:text-accent',
                    'focus:outline-none focus:ring-2 focus:ring-accent',
                    sidebarOpen ? 'justify-start' : 'justify-center',
                    isActive && 'bg-accent/20 text-accent border-l-4 border-accent pl-2'
                  )}
                  tabIndex={0}
                >
                  {!sidebarOpen ? (
                    <>
                      <span className="relative group">
                        <item.icon className={clsx('h-6 w-6 transition-transform group-hover:scale-110 group-hover:drop-shadow-glow sci-fi-icon animate-pulse-glow', 'space-theme-icon')} />
                        <span className="sr-only">{item.label}</span>
                        <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded bg-background text-xs text-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">{item.label}</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <item.icon className={clsx('h-6 w-6 transition-transform group-hover:scale-110 group-hover:drop-shadow-glow sci-fi-icon animate-pulse-glow', 'space-theme-icon')} />
                      <span className="font-medium transition-all ml-1">{item.label}</span>
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer: admin identity + logout */}
          <div className={clsx('mt-auto border-t border-border p-2 md:p-3')}>
            {sidebarOpen ? (
              <div className="flex flex-col gap-2">
                <div className="px-1 min-w-0">
                  <p className="text-sm font-medium truncate">{userProfile?.fullName || 'Admin'}</p>
                  <p className="text-xs text-muted-foreground truncate">{userProfile?.email || ''}</p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={authLoading}
                  aria-label="Logout"
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-all w-full',
                    'hover:bg-destructive/20 hover:text-destructive',
                    'focus:outline-none focus:ring-2 focus:ring-accent',
                    'sci-fi-nav-item tap-feedback disabled:opacity-60'
                  )}
                >
                  {authLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <LogOut className="h-6 w-6 sci-fi-icon space-theme-icon" />
                  )}
                  <span className="font-medium ml-1">Logout</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleLogout}
                disabled={authLoading}
                aria-label="Logout"
                title="Logout"
                className={clsx(
                  'w-full flex items-center justify-center px-3 py-2 rounded-md transition-all',
                  'hover:bg-destructive/20 hover:text-destructive',
                  'focus:outline-none focus:ring-2 focus:ring-accent',
                  'sci-fi-nav-item tap-feedback disabled:opacity-60'
                )}
              >
                <span className="relative group">
                  {authLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <LogOut className="h-6 w-6 sci-fi-icon space-theme-icon" />
                  )}
                  <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 rounded bg-background text-xs text-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">Logout</span>
                </span>
              </button>
            )}
          </div>
        </aside>
        
        <main
          className={clsx(
            'admin-main transition-all duration-300',
            'p-4 md:p-8',
            'w-full',
            'min-h-screen',
            'bg-background',
            'space-theme-main',
            'pb-20 md:pb-8'
          )}
        >
          <div className="w-full max-w-7xl mx-auto">
            {children}
          </div>
        </main>
        
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-card border-t border-border shadow-2xl space-x-1 px-1 py-1 justify-between">
          {adminNavItems.filter(i => i.label && !i.sectionTitle).slice(0,5).map((item, idx) => (
            <Link key={item.href} href={item.href} className="flex-1 flex flex-col items-center justify-center py-1 hover:bg-accent/20 rounded transition-all tap-feedback">
              <item.icon className="h-6 w-6 text-accent animate-pulse-glow" />
              <span className="text-[10px] mt-0.5 truncate w-full text-center">{item.label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            disabled={authLoading}
            aria-label="Logout"
            className="flex-1 flex flex-col items-center justify-center py-1 hover:bg-destructive/20 hover:text-destructive rounded transition-all tap-feedback disabled:opacity-60"
          >
            {authLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <LogOut className="h-6 w-6" />
            )}
            <span className="text-[10px] mt-0.5 truncate w-full text-center">Logout</span>
          </button>
        </nav>
      </div>
      <style jsx global>{`
        .admin-dashboard-grid {
          display: grid;
          grid-template-columns: auto 1fr;
          grid-template-areas: 'sidebar main';
        }
        .admin-sidebar {
          grid-area: sidebar;
        }
        .admin-main {
          grid-area: main;
          min-width: 0;
        }
        @media (max-width: 768px) {
          .admin-dashboard-grid {
            grid-template-columns: 1fr;
            grid-template-areas: 'main';
          }
          .admin-sidebar {
            display: none;
          }
          .admin-main {
            padding-bottom: 80px;
          }
        }
        .space-theme-sidebar {
          background: linear-gradient(135deg, #0a192f 80%, #00f0ff22 100%);
        }
        .space-theme-main {
          background: linear-gradient(120deg, #0a192f 90%, #00f0ff11 100%);
        }
        .space-theme-icon {
          filter: drop-shadow(0 0 6px #00f0ff88);
          transition: filter 0.2s, transform 0.2s;
        }
        .group:hover .space-theme-icon {
          filter: drop-shadow(0 0 12px #00f0ffcc) brightness(1.2);
        }
        .drop-shadow-glow {
          filter: drop-shadow(0 0 8px #00f0ffcc);
        }
      `}</style>
    </RouteGuard>
  );
}
