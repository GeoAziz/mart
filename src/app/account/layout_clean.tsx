import RouteGuard from '@/components/auth/RouteGuard';
import DashboardNav from '@/components/dashboard/DashboardNav';
import { accountNavItems } from '@/data/accountNavItems';

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