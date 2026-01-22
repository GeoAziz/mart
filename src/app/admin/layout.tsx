'use client';

import DashboardNav, { type NavItem } from '@/components/dashboard/DashboardNav';
import { Users, BarChartBig, Settings, ShoppingBag, Shield, Tag, Edit, Speaker, Palette, Briefcase, User, DollarSign, HeartPulse, ListOrdered, Star, Ticket } from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';
import { useState } from 'react';
import clsx from 'clsx';

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
  { href: "/admin/cms/content", label: "CMS - Content", icon: Edit }, // This page does not exist yet
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sidebar state for collapse/expand
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <RouteGuard allowedRoles={['admin']}>
      <div className="admin-dashboard-grid min-h-screen bg-background text-foreground">
        <aside
          className={clsx(
            'admin-sidebar fixed md:static z-40 top-0 left-0 h-full transition-all duration-300',
            sidebarOpen ? 'w-64 shadow-2xl' : 'w-16 md:w-20',
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
            className="p-2 m-2 rounded-full hover:bg-accent transition-colors focus:outline-none focus:ring-2 focus:ring-accent micro-interaction tap-feedback"
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span className={clsx('transition-transform', sidebarOpen ? 'rotate-180' : '')}>
              {/* Hamburger/arrow icon */}
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-right text-accent animate-pulse-glow"><path d="M9 18l6-6-6-6"/></svg>
            </span>
            <span className="sr-only">{sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}</span>
          </button>
          <nav className="flex-1 flex flex-col gap-2 mt-4">
            {adminNavItems.map((item, idx) =>
              item.sectionTitle ? (
                <div key={item.sectionTitle + '-' + idx} className={clsx('px-4 py-2 text-xs uppercase tracking-widest text-muted-foreground/60', sidebarOpen ? 'block' : 'hidden md:block')}>{item.sectionTitle}</div>
              ) : (
                <a
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-md transition-all group sci-fi-nav-item tap-feedback',
                    'hover:bg-accent/20 hover:text-accent',
                    'focus:outline-none focus:ring-2 focus:ring-accent',
                    sidebarOpen ? 'justify-start' : 'justify-center',
                  )}
                  tabIndex={0}
                >
                  {/* Tooltip for icon when collapsed */}
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
                </a>
              )
            )}
          </nav>
        </aside>
        {/* Main Content */}
        <main
          className={clsx(
            'admin-main transition-all duration-300',
            sidebarOpen ? 'ml-16 md:ml-64' : 'ml-16 md:ml-20',
            'p-0 md:p-8',
            'w-full',
            'min-h-screen',
            'overflow-x-auto',
            'bg-background',
            'space-theme-main',
            'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', // NASA grid
          )}
        >
          <div className="transition-all duration-300 col-span-full">
            {children}
          </div>
        </main>
        {/* Mobile bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden bg-card border-t border-border shadow-2xl space-x-1 px-1 py-1 justify-between">
          {adminNavItems.filter(i => i.label).slice(0,5).map((item, idx) => (
            <a key={item.href} href={item.href} className="flex-1 flex flex-col items-center justify-center py-1 hover:bg-accent/20 rounded transition-all tap-feedback">
              <item.icon className="h-6 w-6 text-accent animate-pulse-glow" />
              <span className="text-xs mt-0.5">{item.label}</span>
            </a>
          ))}
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
        }
        @media (max-width: 768px) {
          .admin-dashboard-grid {
            grid-template-columns: 1fr;
            grid-template-areas: 'main';
          }
          .admin-sidebar {
            position: fixed;
            left: 0;
            top: 0;
            height: 100vh;
            z-index: 50;
            background: var(--card);
            border-right: 1px solid var(--border);
            transition: width 0.3s cubic-bezier(.4,2,.6,1), left 0.3s;
          }
          .admin-main {
            margin-left: 0 !important;
            padding-bottom: 60px;
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
