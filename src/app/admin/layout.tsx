'use client';

import DashboardNav from '@/components/dashboard/DashboardNav';
import RouteGuard from '@/components/auth/RouteGuard';
import { adminNavItems } from '@/data/adminNavItems';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={['admin']}>
      <DashboardNav navItems={adminNavItems} dashboardTitle="Admin Dashboard">
        {children}
      </DashboardNav>
    </RouteGuard>
  );
}
