'use client';

import DashboardNav, { type NavItem } from '@/components/dashboard/DashboardNav';
import { LayoutDashboard, ShoppingBag, Heart, MapPin, Lock, User, Settings, Inbox, Bell } from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';

const accountNavItems: NavItem[] = [
  { sectionTitle: "My Account", href: "#", icon: User },
  { href: "/account", label: "Dashboard", icon: LayoutDashboard },
  { href: "/account/orders", label: "Order History", icon: ShoppingBag },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/addresses", label: "Address Book", icon: MapPin },
  { href: "/messaging", label: "Inbox", icon: Inbox },
  { sectionTitle: "Settings", href: "#", icon: Settings },
  { href: "/account/profile", label: "Personal Info", icon: User },
  { href: "/account/change-password", label: "Change Password", icon: Lock },
  { href: "/account/notifications", label: "Notifications", icon: Bell },
];

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={['customer', 'vendor', 'admin']}>
      <DashboardNav navItems={accountNavItems} dashboardTitle="My Account">
        {children}
      </DashboardNav>
    </RouteGuard>
  );
}
