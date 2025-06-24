'use client';

import DashboardNav, { type NavItem } from '@/components/dashboard/DashboardNav';
import { BarChart3, ShoppingBag, PackagePlus, Inbox, DollarSign, Star, Settings, User, ListOrdered, PlusCircle, Send } from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';

const vendorNavItems: NavItem[] = [
  { sectionTitle: "Store Management", href: "#", icon: User },
  { href: "/vendor", label: "Dashboard", icon: BarChart3 },
  { 
    href: "/vendor/products/manage", 
    label: "Products", 
    icon: PackagePlus, 
    subItems: [
      { href: "/vendor/products/manage", label: "Manage Products", icon: ListOrdered},
      { href: "/vendor/products/add", label: "Add New Product", icon: PlusCircle},
  ]},
  { 
    href: "/vendor/orders/all", // Main link goes to "All Orders"
    label: "Orders", 
    icon: ListOrdered, // Changed main icon for distinction
    subItems: [
      { href: "/vendor/orders/incoming", label: "Incoming Orders", icon: Inbox},
      { href: "/vendor/orders/all", label: "All Orders", icon: ShoppingBag},
  ]},
  { sectionTitle: "Finance & Feedback", href: "#", icon: User },
  { href: "/vendor/earnings", label: "Earnings", icon: DollarSign },
  { href: "/vendor/reviews", label: "Customer Reviews", icon: Star },
  { href: "/messaging", label: "Inbox", icon: Inbox },
  { sectionTitle: "Settings", href: "#", icon: User },
  { href: "/vendor/settings", label: "Store Settings", icon: Settings },
];

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
     <RouteGuard allowedRoles={['vendor', 'admin']}>
        <DashboardNav navItems={vendorNavItems} dashboardTitle="Vendor Dashboard">
          {children}
        </DashboardNav>
    </RouteGuard>
  );
}
