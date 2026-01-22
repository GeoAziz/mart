'use client';

import React from 'react'; 
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation'; // Added useRouter
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
  useSidebar
} from '@/components/ui/sidebar';
import Logo from '@/components/layout/Logo';
import { UserCircle, LogOut as LogOutIcon, Loader2 } from 'lucide-react'; // Renamed LogOut to LogOutIcon
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import './DashboardNavSciFi.css'; // Add sci-fi styles

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

const DashboardNavInner: React.FC<DashboardNavProps> = ({ navItems, children, dashboardTitle }) => {
  const pathname = usePathname();
  const { open } = useSidebar(); 
  const { currentUser, logOut, loading: authLoading, userProfile } = useAuth(); // Use auth context
  const router = useRouter();

  const handleLogout = async () => {
    await logOut();
    // router.push('/auth/login'); // Handled by AuthContext now
  };

  // Filter navItems based on user role
  const filteredNavItems = React.useMemo(() => {
    if (!userProfile) return navItems.filter(item => !item.adminOnly && !item.vendorOnly); // Show only general items if no profile

    return navItems.map(item => {
      // Filter top-level item if it's role-restricted
      if (item.adminOnly && userProfile.role !== 'admin') return null;
      if (item.vendorOnly && userProfile.role !== 'vendor' && userProfile.role !== 'admin') return null;

      // If item has subItems, filter them
      if (item.subItems) {
        const visibleSubItems = item.subItems.filter(subItem => {
           if (subItem.adminOnly && userProfile.role !== 'admin') return false;
           if (subItem.vendorOnly && userProfile.role !== 'vendor' && userProfile.role !== 'admin') return false;
           return true;
        });
        // If it's a section title and all its subItems are filtered out, return null for the section unless it's a direct link
        if (item.sectionTitle && visibleSubItems.length === 0 && item.href === "#") {
            return null;
        }
        return { ...item, subItems: visibleSubItems };
      }
      return item;
    }).filter(item => item !== null) as NavItem[]; // Type assertion after filtering nulls
  }, [navItems, userProfile]);

  // Responsive bottom nav for mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-border shadow-lg transition-all duration-300">
        <SidebarHeader className="p-4 items-center justify-between">
           <div className={cn("transition-opacity duration-200", !open && "opacity-0 pointer-events-none delay-0", open && "opacity-100 delay-200")}> <Logo /> </div>
          <SidebarTrigger aria-label="Toggle sidebar" className={cn(open && "hidden")}>
            <span className="sr-only">Toggle sidebar</span>
          </SidebarTrigger>
        </SidebarHeader>
        <SidebarContent className="p-2">
          <SidebarMenu>
            {filteredNavItems.map((item, index) => {
              if (item.sectionTitle) {
                // Check if there are any actual navigable items (not section titles) following this section title
                // or if this section itself is a link or has visible sub-items
                const hasVisibleContentFollowingOrWithin = 
                    (item.href !== "#" || (item.subItems && item.subItems.length > 0)) || 
                    filteredNavItems.slice(index + 1).some(nextItem => !nextItem.sectionTitle && (nextItem.href !== "#" || (nextItem.subItems && nextItem.subItems.length > 0)));

                if (!hasVisibleContentFollowingOrWithin) return null;


                return (
                  <React.Fragment key={`section-${item.sectionTitle}-${index}`}>
                    {/* Add separator only if it's not the first item and the previous item was not a section title or had content */}
                    {index > 0 && (filteredNavItems[index-1] && (!filteredNavItems[index-1].sectionTitle || filteredNavItems[index-1].href !== "#" || (filteredNavItems[index-1].subItems && filteredNavItems[index-1].subItems!.length > 0) )) && <SidebarSeparator className="my-2" />}
                    <SidebarGroupLabel className={cn("px-2 pt-2 pb-1 text-xs uppercase text-muted-foreground tracking-widest sci-fi-glow", !open && "hidden")}>
                        {item.sectionTitle}
                    </SidebarGroupLabel>
                  </React.Fragment>
                );
              }
              // Skip rendering if it's a placeholder link with no subitems left after filtering
              if(item.href === "#" && (!item.subItems || item.subItems.length === 0)) return null;
              
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={pathname === item.href || (item.subItems && item.subItems.some(sub => pathname.startsWith(sub.href)))}
                    tooltip={{children: item.label, hidden: open }}
                    className="transition-all duration-200 hover:scale-105 hover:bg-accent/20 hover:text-accent sci-fi-nav-item"
                  >
                    <Link href={item.href === "#" && item.subItems && item.subItems.length > 0 ? item.subItems[0].href : item.href}>
                      <span className="sci-fi-icon group-hover:animate-pulse"><item.icon /></span>
                      <span className={cn(!open && "hidden")}>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                  {item.subItems && item.subItems.length > 0 && (
                    <SidebarMenuSub>
                      {item.subItems.map(subItem => (
                        <SidebarMenuSubItem key={subItem.href}>
                          <SidebarMenuSubButton asChild isActive={pathname.startsWith(subItem.href)}>
                            <Link href={subItem.href}>
                              <span className="sci-fi-icon group-hover:animate-pulse"><subItem.icon /></span>
                              {subItem.label}
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  )}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter className="p-4 border-t border-border">
           {authLoading ? (
             <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary"/></div>
           ) : currentUser ? (
             <>
               <SidebarMenuButton asChild tooltip={{ children: "User Profile", hidden: open }}>
                 <Link href="/account/profile">
                    <UserCircle />
                    <span className={cn(!open && "hidden")}>{userProfile?.fullName || 'Profile'}</span>
                 </Link>
               </SidebarMenuButton>
               <SidebarMenuButton onClick={handleLogout} tooltip={{ children: "Logout", hidden: open }}>
                  <LogOutIcon />
                  <span className={cn(!open && "hidden")}>Logout</span>
               </SidebarMenuButton>
             </>
           ) : (
             <SidebarMenuButton asChild tooltip={{ children: "Login", hidden: open }}>
               <Link href="/auth/login">
                  <LogOutIcon /> {/* Using LogOutIcon as a generic "exit/enter" icon */}
                  <span className={cn(!open && "hidden")}>Login</span>
               </Link>
              </SidebarMenuButton>
           )}
        </SidebarFooter>
      </Sidebar>
      {/* Responsive bottom nav for mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 border-t border-border flex justify-around py-2 sci-fi-bottom-nav">
        {filteredNavItems.filter(item => !item.sectionTitle && item.href !== "#").slice(0,5).map(item => (
          <Link key={item.href} href={item.href} className={cn("flex flex-col items-center text-xs px-2 py-1 transition-all duration-200 hover:text-accent", pathname === item.href && "text-accent font-bold")}> <span className="sci-fi-icon mb-1"><item.icon className="h-5 w-5" /></span> {item.label} </Link>
        ))}
      </div>
      <SidebarInset className="bg-background">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur px-6 shadow-sm">
            <SidebarTrigger aria-label="Toggle sidebar" className={cn("md:hidden", !open && "md:inline-flex")}>
              <span className="sr-only">Toggle sidebar</span>
            </SidebarTrigger>
            <h1 className="text-xl font-semibold font-headline text-glow-primary">{dashboardTitle}</h1>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {authLoading ? (
             <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary"/>
             </div>
          ): children }
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
