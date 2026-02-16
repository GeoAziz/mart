'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarInset,
  SidebarGroupLabel,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import Logo from '@/components/layout/Logo';
import { UserCircle, LogOut as LogOutIcon, Loader2, MoreHorizontal } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import './DashboardNavSciFi.css';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  subItems?: NavItem[];
  sectionTitle?: string;
  adminOnly?: boolean;
  vendorOnly?: boolean;
}

interface DashboardNavProps {
  navItems: NavItem[];
  children: React.ReactNode;
  dashboardTitle: string;
}

const TABLET_SIDEBAR_BREAKPOINT = 1024;

const DashboardNavInner: React.FC<DashboardNavProps> = ({ navItems, children, dashboardTitle }) => {
  const pathname = usePathname();
  const { open, setOpen, setOpenMobile } = useSidebar();
  const { currentUser, logOut, loading: authLoading, userProfile } = useAuth();

  const handleLogout = async () => {
    await logOut();
  };

  const filteredNavItems = React.useMemo(() => {
    if (!userProfile) return navItems.filter((item) => !item.adminOnly && !item.vendorOnly);

    return navItems
      .map((item) => {
        if (item.adminOnly && userProfile.role !== 'admin') return null;
        if (item.vendorOnly && userProfile.role !== 'vendor' && userProfile.role !== 'admin') return null;

        if (item.subItems) {
          const visibleSubItems = item.subItems.filter((subItem) => {
            if (subItem.adminOnly && userProfile.role !== 'admin') return false;
            if (subItem.vendorOnly && userProfile.role !== 'vendor' && userProfile.role !== 'admin') return false;
            return true;
          });

          if (item.sectionTitle && visibleSubItems.length === 0 && item.href === '#') {
            return null;
          }

          return { ...item, subItems: visibleSubItems };
        }

        return item;
      })
      .filter((item): item is NavItem => item !== null);
  }, [navItems, userProfile]);

  const mobileNavItems = React.useMemo(
    () => filteredNavItems.filter((item) => !item.sectionTitle && item.href !== '#').slice(0, 4),
    [filteredNavItems]
  );

  React.useEffect(() => {
    const syncSidebarState = () => {
      setOpen(window.innerWidth >= TABLET_SIDEBAR_BREAKPOINT);
    };

    syncSidebarState();
    window.addEventListener('resize', syncSidebarState);

    return () => {
      window.removeEventListener('resize', syncSidebarState);
    };
  }, [setOpen]);

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[999] focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-accent-foreground"
      >
        Skip to main content
      </a>

      <Sidebar
        collapsible="icon"
        className="space-theme-sidebar border-r border-border shadow-glow-sm transition-[width,left,right] duration-300"
      >
        <SidebarHeader className="items-center justify-between p-4">
          <div className={cn('transition-opacity duration-200', !open && 'pointer-events-none opacity-0', open && 'opacity-100 delay-200')}>
            <Logo />
          </div>
          <SidebarTrigger aria-label="Toggle sidebar" className={cn(open && 'hidden')}>
            <span className="sr-only">Toggle sidebar</span>
          </SidebarTrigger>
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarMenu aria-label="Dashboard navigation">
            {filteredNavItems.map((item, index) => {
              if (item.sectionTitle) {
                const hasVisibleContentFollowingOrWithin =
                  (item.href !== '#' || (item.subItems && item.subItems.length > 0)) ||
                  filteredNavItems
                    .slice(index + 1)
                    .some((nextItem) => !nextItem.sectionTitle && (nextItem.href !== '#' || (nextItem.subItems && nextItem.subItems.length > 0)));

                if (!hasVisibleContentFollowingOrWithin) return null;

                return (
                  <React.Fragment key={`section-${item.sectionTitle}-${index}`}>
                    {index > 0 && <SidebarSeparator className="my-2" />}
                    <SidebarGroupLabel className={cn('sci-fi-glow px-2 pb-1 pt-2 text-xs uppercase tracking-widest text-muted-foreground', !open && 'hidden')}>
                      {item.sectionTitle}
                    </SidebarGroupLabel>
                  </React.Fragment>
                );
              }

              if (item.href === '#' && (!item.subItems || item.subItems.length === 0)) return null;

              const itemHref = item.href === '#' && item.subItems?.length ? item.subItems[0].href : item.href;
              const isActive = pathname === item.href || pathname === itemHref || !!item.subItems?.some((sub) => pathname.startsWith(sub.href));

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={{
                      children: item.label,
                      hidden: open,
                      className:
                        'pointer-events-none whitespace-nowrap bg-accent text-xs text-accent-foreground shadow-lg transition-opacity duration-200 before:absolute before:-left-1 before:top-1/2 before:h-2 before:w-2 before:-translate-y-1/2 before:rotate-45 before:bg-accent',
                    }}
                    className={cn(
                      'sci-fi-nav-item min-h-11 transition-[background-color,color,box-shadow] duration-200 hover:bg-accent/30 hover:text-accent',
                      isActive && 'border-l-4 border-primary bg-primary/20 font-semibold text-primary'
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Link href={itemHref}>
                      <span className="sci-fi-icon" aria-hidden="true">
                        <item.icon />
                      </span>
                      <span className={cn(!open && 'hidden')}>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>

                  {item.subItems && item.subItems.length > 0 && (
                    <SidebarMenuSub>
                      {item.subItems.map((subItem) => {
                        const isSubItemActive = pathname.startsWith(subItem.href);

                        return (
                          <SidebarMenuSubItem key={subItem.href}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isSubItemActive}
                              className={cn(isSubItemActive && 'border-l-2 border-primary text-primary')}
                              aria-current={isSubItemActive ? 'page' : undefined}
                            >
                              <Link href={subItem.href} aria-label={subItem.label}>
                                <span className="sci-fi-icon" aria-hidden="true">
                                  <subItem.icon />
                                </span>
                                {subItem.label}
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        );
                      })}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-border p-4">
          {authLoading ? (
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : currentUser ? (
            <>
              <SidebarMenuButton asChild tooltip={{ children: 'User Profile', hidden: open }}>
                <Link href="/account/profile" aria-label="User profile">
                  <UserCircle aria-hidden="true" />
                  <span className={cn(!open && 'hidden')}>{userProfile?.fullName || 'Profile'}</span>
                </Link>
              </SidebarMenuButton>
              <SidebarMenuButton onClick={handleLogout} tooltip={{ children: 'Logout', hidden: open }} aria-label="Logout">
                <LogOutIcon aria-hidden="true" />
                <span className={cn(!open && 'hidden')}>Logout</span>
              </SidebarMenuButton>
            </>
          ) : (
            <SidebarMenuButton asChild tooltip={{ children: 'Login', hidden: open }}>
              <Link href="/auth/login" aria-label="Login">
                <LogOutIcon aria-hidden="true" />
                <span className={cn(!open && 'hidden')}>Login</span>
              </Link>
            </SidebarMenuButton>
          )}
        </SidebarFooter>
      </Sidebar>

      <nav
        className="sci-fi-bottom-nav fixed bottom-0 left-0 right-0 z-mobile-nav border-t border-border bg-background/95 py-3 pb-[calc(theme(spacing.3)+env(safe-area-inset-bottom))] backdrop-blur md:hidden"
        aria-label="Mobile dashboard navigation"
      >
        <div className="grid grid-cols-5 gap-1 px-2">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg px-2 py-3 text-xs transition-colors',
                  isActive
                    ? 'border-t-2 border-primary bg-primary/20 font-semibold text-primary'
                    : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                )}
              >
                <item.icon className="mb-1 h-5 w-5" aria-hidden="true" />
                <span className="w-full truncate text-center">{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setOpenMobile(true)}
            className="flex min-h-12 min-w-12 flex-col items-center justify-center rounded-lg px-2 py-3 text-muted-foreground transition-colors hover:bg-accent/30 hover:text-foreground"
            aria-label="Open menu"
          >
            <MoreHorizontal className="mb-1 h-5 w-5" aria-hidden="true" />
            <span className="text-xs">More</span>
          </button>
        </div>
      </nav>

      <SidebarInset className="space-theme-main relative z-10">
        <header className="sticky top-0 z-sidebar flex h-16 items-center gap-4 border-b bg-background/80 px-4 shadow-sm backdrop-blur md:px-6">
          <SidebarTrigger aria-label="Toggle sidebar" className={cn('md:hidden', !open && 'md:inline-flex')}>
            <span className="sr-only">Toggle sidebar</span>
          </SidebarTrigger>
          <h1 className="font-headline text-xl font-semibold text-glow-primary">{dashboardTitle}</h1>
        </header>
        <main id="main-content" className="relative z-10 flex-1 overflow-auto p-4 pb-24 md:p-8 md:pb-8">
          {authLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            children
          )}
        </main>
      </SidebarInset>
    </>
  );
};

const DashboardNav: React.FC<DashboardNavProps> = ({ navItems, children, dashboardTitle }) => {
  return (
    <SidebarProvider defaultOpen>
      <DashboardNavInner navItems={navItems} dashboardTitle={dashboardTitle}>
        {children}
      </DashboardNavInner>
    </SidebarProvider>
  );
};

export default DashboardNav;
