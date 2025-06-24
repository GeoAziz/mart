'use client';

import DashboardNav, { type NavItem } from '@/components/dashboard/DashboardNav';
import { Users, BarChartBig, Settings, ShoppingBag, Shield, Tag, Edit, Speaker, Palette, Briefcase, User, DollarSign, HeartPulse, ListOrdered, Star, Ticket } from 'lucide-react';
import RouteGuard from '@/components/auth/RouteGuard';

const adminNavItems: NavItem[] = [
  { sectionTitle: "Overview & Site", href: "#", icon: User },
  { href: "/admin/overview", label: "Dashboard", icon: BarChartBig },
  { href: "/admin/users", label: "User Management", icon: Users },
  { href: "/admin/site-health", label: "Site Health", icon: HeartPulse }, 
  { sectionTitle: "E-Commerce", href: "#", icon: User },
  { href: "/admin/products", label: "Product Moderation", icon: ShoppingBag },
  { href: "/admin/categories", label: "Category Management", icon: Tag },
  { href: "/admin/orders", label: "Order Overview", icon: ListOrdered }, 
  { href: "/admin/reviews", label: "Review Management", icon: Star },
  { href: "/admin/payouts", label: "Vendor Payouts", icon: DollarSign },
  { href: "/admin/refunds", label: "Refund Management", icon: Shield },
  { sectionTitle: "Content & Marketing", href: "#", icon: User },
  { href: "/admin/cms/home", label: "CMS - Home", icon: Palette },
  { href: "/admin/promotions", label: "Promotions", icon: Ticket },
  { href: "/admin/cms/content", label: "CMS - Content", icon: Edit }, // This page does not exist yet
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={['admin']}>
      <DashboardNav navItems={adminNavItems} dashboardTitle="Admin Panel">
        {children}
      </DashboardNav>
    </RouteGuard>
  );
}
